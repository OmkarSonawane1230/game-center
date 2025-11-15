'use client';
import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { doc, getDoc, onSnapshot, updateDoc, arrayUnion, deleteDoc, increment } from 'firebase/firestore';
import styles from '../styles/DotsAndBoxes.module.css';
import { ClipboardCopy, Loader2, Users, Eye, Trophy } from 'lucide-react';
import { DotsAndBoxesState } from '../types';
import { getCurrentPlayer } from '../utils/PlayerAuth';
import PlayerAuth from './PlayerAuth';

interface DotsAndBoxesGameProps {
  gameId: string;
}

const PLAYER_COLORS = [
  '#ff3366', // Red
  '#00d4ff', // Cyan
  '#00ff88', // Green
  '#ffaa00', // Orange
  '#ff00ff', // Magenta
  '#00ffff', // Aqua
  '#ff6b9d', // Pink
  '#4169e1', // Blue
  '#ffd700', // Gold
  '#9370db'  // Purple
];

export default function DotsAndBoxesGame({ gameId }: DotsAndBoxesGameProps) {
  const [gameState, setGameState] = useState<DotsAndBoxesState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<{ id: string; name: string } | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [playerRole, setPlayerRole] = useState<'player' | 'spectator' | null>(null);
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);

  useEffect(() => {
    const player = getCurrentPlayer();
    if (!player) {
      setShowAuth(true);
      setLoading(false);
    } else {
      setCurrentPlayer({ id: player.id, name: player.name });
    }
  }, []);

  const handleAuthenticated = (playerId: string, playerName: string) => {
    setCurrentPlayer({ id: playerId, name: playerName });
    setShowAuth(false);
  };

  useEffect(() => {
    if (!gameId || !currentPlayer) return;

    const gameRef = doc(db, 'games', gameId);

    const unsubscribe = onSnapshot(
      gameRef,
      async (doc) => {
        if (doc.exists()) {
          const data = doc.data() as DotsAndBoxesState;
          setGameState(data);

          // Determine player role
          const isPlayer = data.players.some(p => p.id === currentPlayer.id);
          const isSpectator = data.spectators.includes(currentPlayer.id);

          if (isPlayer) {
            setPlayerRole('player');
          } else if (isSpectator) {
            setPlayerRole('spectator');
          } else {
            // New user joining
            if (data.players.length < data.maxPlayers && data.status === 'waiting') {
              // Join as player
              const playerSymbol = (data.players.length + 1).toString();
              try {
                await updateDoc(gameRef, {
                  players: arrayUnion({ 
                    id: currentPlayer.id, 
                    name: currentPlayer.name,
                    symbol: playerSymbol
                  }),
                  [`scores.${currentPlayer.id}`]: 0,
                  status: data.players.length + 1 === data.maxPlayers ? 'active' : 'waiting'
                });
                setPlayerRole('player');
              } catch (err) {
                console.error('Error joining as player:', err);
              }
            } else {
              // Join as spectator
              try {
                await updateDoc(gameRef, {
                  spectators: arrayUnion(currentPlayer.id)
                });
                setPlayerRole('spectator');
              } catch (err) {
                console.error('Error joining as spectator:', err);
              }
            }
          }

          setError(null);
        } else {
          setError('Game not found');
          setGameState(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Firebase error:', err);
        setError('Failed to connect to game');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [gameId, currentPlayer]);

  // Helper functions for array indexing
  const getHLineIndex = (row: number, col: number) => row * gameState!.gridCols + col;
  const getVLineIndex = (row: number, col: number) => row * (gameState!.gridCols + 1) + col;
  const getBoxIndex = (row: number, col: number) => row * gameState!.gridCols + col;

  const handleLineClick = async (type: 'horizontal' | 'vertical', row: number, col: number) => {
    if (!gameState || !currentPlayer || playerRole !== 'player') return;
    if (gameState.status !== 'active') return;

    const currentPlayerObj = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayerObj.id !== currentPlayer.id) return;

    // Check if line already drawn
    if (type === 'horizontal' && gameState.horizontalLines[getHLineIndex(row, col)]) return;
    if (type === 'vertical' && gameState.verticalLines[getVLineIndex(row, col)]) return;

    // Create new state
    const newHorizontalLines = [...gameState.horizontalLines];
    const newVerticalLines = [...gameState.verticalLines];
    const newBoxes = [...gameState.boxes];
    const newScores = { ...gameState.scores };

    // Draw the line
    if (type === 'horizontal') {
      newHorizontalLines[getHLineIndex(row, col)] = true;
    } else {
      newVerticalLines[getVLineIndex(row, col)] = true;
    }

    // Check if any boxes were completed
    let boxesCompleted = 0;
    const boxesToCheck: Array<{r: number, c: number}> = [];

    if (type === 'horizontal') {
      // Check box above (if exists)
      if (row > 0 && row <= gameState.gridRows) {
        boxesToCheck.push({ r: row - 1, c: col });
      }
      // Check box below (if exists)
      if (row >= 0 && row < gameState.gridRows) {
        boxesToCheck.push({ r: row, c: col });
      }
    } else {
      // Check box to the left (if exists)
      if (col > 0 && col <= gameState.gridCols) {
        boxesToCheck.push({ r: row, c: col - 1 });
      }
      // Check box to the right (if exists)
      if (col >= 0 && col < gameState.gridCols) {
        boxesToCheck.push({ r: row, c: col });
      }
    }

    // Check each potentially affected box
    for (const { r, c } of boxesToCheck) {
      if (r < 0 || r >= gameState.gridRows || c < 0 || c >= gameState.gridCols) continue;
      if (newBoxes[getBoxIndex(r, c)]) continue; // Already claimed

      // Check if all 4 sides are complete
      const top = newHorizontalLines[getHLineIndex(r, c)];
      const bottom = newHorizontalLines[getHLineIndex(r + 1, c)];
      const left = newVerticalLines[getVLineIndex(r, c)];
      const right = newVerticalLines[getVLineIndex(r, c + 1)];

      if (top && bottom && left && right) {
        newBoxes[getBoxIndex(r, c)] = currentPlayer.id;
        boxesCompleted++;
        newScores[currentPlayer.id] = (newScores[currentPlayer.id] || 0) + 1;
      }
    }

    // Check if game is finished
    const totalBoxes = gameState.gridRows * gameState.gridCols;
    const filledBoxes = newBoxes.filter(b => b !== null).length;
    const isGameFinished = filledBoxes === totalBoxes;

    let winner = null;
    if (isGameFinished) {
      // Find winner (highest score)
      let maxScore = 0;
      let winnerId = null;
      for (const [playerId, score] of Object.entries(newScores)) {
        if (score > maxScore) {
          maxScore = score;
          winnerId = playerId;
        }
      }
      winner = winnerId;

      // Update player stats and delete game
      if (winner) {
        const playerRef = doc(db, 'players', winner);
        await updateDoc(playerRef, {
          gamesPlayed: increment(1),
          gamesWon: increment(1)
        });
      }
      
      // Update stats for other players
      for (const player of gameState.players) {
        if (player.id !== winner) {
          const playerRef = doc(db, 'players', player.id);
          await updateDoc(playerRef, {
            gamesPlayed: increment(1)
          });
        }
      }
    }

    // Determine next player
    let nextPlayerIndex = gameState.currentPlayerIndex;
    if (boxesCompleted === 0) {
      // No boxes completed, next player's turn
      nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    }
    // If boxes were completed, same player goes again

    // Update game state
    const gameRef = doc(db, 'games', gameId);
    await updateDoc(gameRef, {
      horizontalLines: newHorizontalLines,
      verticalLines: newVerticalLines,
      boxes: newBoxes,
      scores: newScores,
      currentPlayerIndex: nextPlayerIndex,
      status: isGameFinished ? 'finished' : 'active',
      winner: winner
    });

    // Delete game after 5 seconds if finished
    if (isGameFinished) {
      setTimeout(async () => {
        try {
          await deleteDoc(gameRef);
        } catch (error) {
          console.error('Error deleting game:', error);
        }
      }, 5000);
    }
  };

  const copyInviteLink = (): void => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    alert('Invite link copied!');
  };

  if (showAuth) {
    return <PlayerAuth onAuthenticated={handleAuthenticated} />;
  }

  if (loading) return <div className={styles.loadingContainer}><Loader2 className={styles.spinner} /> Loading Game...</div>;
  if (error) return <div className={styles.loadingContainer}>{error}</div>;
  if (!gameState) return <div className={styles.loadingContainer}>Game data could not be loaded.</div>;

  const isWaitingForPlayers = gameState.status === 'waiting' || gameState.players.length < gameState.maxPlayers;
  const currentTurnPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer && currentTurnPlayer && currentTurnPlayer.id === currentPlayer.id;

  // Get player's color
  const getPlayerColor = (playerId: string) => {
    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    return playerIndex >= 0 ? PLAYER_COLORS[playerIndex % PLAYER_COLORS.length] : '#888';
  };

  return (
    <div className={styles.gameContainer}>
      {gameState.winner && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <Trophy size={64} className={styles.modalIcon} />
            <h2 className={styles.modalMessage}>Game Over!</h2>
            <p style={{ fontSize: '1.5rem', color: getPlayerColor(gameState.winner) }}>
              Winner: {gameState.players.find(p => p.id === gameState.winner)?.name}
            </p>
            <div style={{ marginTop: '1rem' }}>
              <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Final Scores:</h3>
              {gameState.players
                .sort((a, b) => (gameState.scores[b.id] || 0) - (gameState.scores[a.id] || 0))
                .map((player, idx) => (
                  <div key={player.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem', 
                    padding: '0.5rem',
                    color: getPlayerColor(player.id)
                  }}>
                    <span style={{ fontWeight: 700 }}>{idx + 1}.</span>
                    <span>{player.name}</span>
                    <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{gameState.scores[player.id] || 0}</span>
                  </div>
                ))}
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
              Game will be deleted in 5 seconds...
            </p>
          </div>
        </div>
      )}

      {isWaitingForPlayers && !gameState.winner && playerRole !== 'spectator' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalMessage}>Waiting for Players</h2>
            <p>Share this link with friends to play!</p>
            <p style={{ color: 'var(--text-secondary)' }}>
              {gameState.players.length} / {gameState.maxPlayers} players joined
            </p>
            <div className={styles.inviteBox}>
              <input type="text" readOnly value={typeof window !== "undefined" ? window.location.href : ""} />
              <button onClick={copyInviteLink}><ClipboardCopy /></button>
            </div>
          </div>
        </div>
      )}

      <h1 className={styles.gameTitle}>Dots and Boxes</h1>

      <div className={styles.gameInfo}>
        <div className={styles.status} style={{ color: isMyTurn ? getPlayerColor(currentPlayer?.id || '') : 'var(--text-secondary)' }}>
          <p>{playerRole === 'spectator' ? 'Spectating' : isMyTurn ? 'Your Turn!' : `${currentTurnPlayer?.name}'s Turn`}</p>
          {playerRole === 'spectator' && <Eye size={32} />}
        </div>

        <div className={styles.playerCount}>
          <Users size={20} />
          <span>{gameState.players.length}/{gameState.maxPlayers} Players</span>
          {gameState.spectators.length > 0 && (
            <>
              <Eye size={16} style={{ marginLeft: '8px' }} />
              <span>{gameState.spectators.length} Spectator{gameState.spectators.length !== 1 ? 's' : ''}</span>
            </>
          )}
        </div>
      </div>

      {/* Scoreboard */}
      <div className={styles.scoreboard}>
        {gameState.players.map((player, idx) => (
          <div 
            key={player.id} 
            className={styles.scoreCard}
            style={{ 
              borderColor: getPlayerColor(player.id),
              background: currentTurnPlayer?.id === player.id ? `${getPlayerColor(player.id)}15` : 'var(--bg-tertiary)'
            }}
          >
            <div style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              backgroundColor: getPlayerColor(player.id) 
            }} />
            <span className={styles.playerName}>{player.name}</span>
            <span className={styles.score}>{gameState.scores[player.id] || 0}</span>
          </div>
        ))}
      </div>

      {/* Game Board */}
      <div className={styles.board} style={{
        gridTemplateColumns: `repeat(${gameState.gridCols + 1}, 1fr)`,
        gridTemplateRows: `repeat(${gameState.gridRows + 1}, 1fr)`,
      }}>
        {/* Render dots and lines */}
        {Array.from({ length: gameState.gridRows + 1 }).map((_, row) => (
          Array.from({ length: gameState.gridCols + 1 }).map((_, col) => {
            const hLineIdx = getHLineIndex(row, col);
            const vLineIdx = getVLineIndex(row, col);
            const boxIdx = getBoxIndex(row, col);
            
            return (
              <div key={`cell-${row}-${col}`} className={styles.gridCell}>
                {/* Dot */}
                <div className={styles.dot} />

                {/* Horizontal line to the right */}
                {col < gameState.gridCols && (
                  <div
                    className={`${styles.horizontalLine} ${gameState.horizontalLines[hLineIdx] ? styles.drawn : ''} ${hoveredLine === `h-${row}-${col}` ? styles.hovered : ''}`}
                    onClick={() => handleLineClick('horizontal', row, col)}
                    onMouseEnter={() => setHoveredLine(`h-${row}-${col}`)}
                    onMouseLeave={() => setHoveredLine(null)}
                    style={{
                      backgroundColor: gameState.horizontalLines[hLineIdx] 
                        ? getPlayerColor(currentTurnPlayer?.id || '') 
                        : undefined,
                      cursor: playerRole === 'player' && !gameState.horizontalLines[hLineIdx] && isMyTurn ? 'pointer' : 'default'
                    }}
                  />
                )}

                {/* Vertical line below */}
                {row < gameState.gridRows && (
                  <div
                    className={`${styles.verticalLine} ${gameState.verticalLines[vLineIdx] ? styles.drawn : ''} ${hoveredLine === `v-${row}-${col}` ? styles.hovered : ''}`}
                    onClick={() => handleLineClick('vertical', row, col)}
                    onMouseEnter={() => setHoveredLine(`v-${row}-${col}`)}
                    onMouseLeave={() => setHoveredLine(null)}
                    style={{
                      backgroundColor: gameState.verticalLines[vLineIdx] 
                        ? getPlayerColor(currentTurnPlayer?.id || '') 
                        : undefined,
                      cursor: playerRole === 'player' && !gameState.verticalLines[vLineIdx] && isMyTurn ? 'pointer' : 'default'
                    }}
                  />
                )}

                {/* Box */}
                {row < gameState.gridRows && col < gameState.gridCols && (
                  <div 
                    className={`${styles.box} ${gameState.boxes[boxIdx] ? styles.claimed : ''}`}
                    style={{
                      backgroundColor: gameState.boxes[boxIdx] 
                        ? `${getPlayerColor(gameState.boxes[boxIdx]!)}40`
                        : 'transparent'
                    }}
                  >
                    {gameState.boxes[boxIdx] && (
                      <span style={{ color: getPlayerColor(gameState.boxes[boxIdx]!), fontWeight: 700 }}>
                        {gameState.players.find(p => p.id === gameState.boxes[boxIdx])?.symbol}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ))}
      </div>

      {playerRole === 'player' && (
        <div className={styles.playerInfo}>
          Playing as: <strong style={{ color: getPlayerColor(currentPlayer?.id || '') }}>{currentPlayer?.name}</strong>
        </div>
      )}
    </div>
  );
}
