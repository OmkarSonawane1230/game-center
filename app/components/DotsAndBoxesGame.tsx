'use client';
import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase/config';
import { doc, getDoc, onSnapshot, updateDoc, arrayUnion, deleteDoc, increment } from 'firebase/firestore';
import styles from '../styles/DotsAndBoxes.module.css';
import gameUI from '../styles/GameUI.module.css';
import { ClipboardCopy, Loader2, Users, Eye, Trophy } from 'lucide-react';
import { DotsAndBoxesState } from '../types';
import { getCurrentPlayer } from '../utils/PlayerAuth';
import PlayerAuth from './PlayerAuth';
import GameNavBar from './GameNavBar';

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
  
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastTap, setLastTap] = useState(0);
  const [initialPinchDistance, setInitialPinchDistance] = useState(0);
  const [initialZoom, setInitialZoom] = useState(1);
  const [isPinching, setIsPinching] = useState(false);
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const boardWrapperRef = useRef<HTMLDivElement>(null);
  const intrinsicBoardSize = useRef<{ width: number; height: number } | null>(null);

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

  const getTouchDistance = (touches: React.TouchList): number => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const fitToScreen = () => {
    if (!boardContainerRef.current || !intrinsicBoardSize.current) return;
    
    const containerRect = boardContainerRef.current.getBoundingClientRect();
    
    const scaleX = (containerRect.width - 40) / intrinsicBoardSize.current.width;
    const scaleY = (containerRect.height - 40) / intrinsicBoardSize.current.height;
    const newZoom = Math.min(scaleX, scaleY, 1);
    
    setZoom(newZoom);
    setPan({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (boardWrapperRef.current && !intrinsicBoardSize.current && gameState) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      
      setTimeout(() => {
        const boardElement = boardWrapperRef.current?.querySelector(`.${styles.board}`);
        if (boardElement instanceof HTMLElement) {
          intrinsicBoardSize.current = {
            width: boardElement.offsetWidth,
            height: boardElement.offsetHeight
          };
        }
      }, 100);
    }
  }, [gameState]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (zoom === 1) {
      fitToScreen();
    } else {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setZoom(prev => Math.max(0.3, Math.min(5, prev + delta)));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button === 0 && boardContainerRef.current) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      boardContainerRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging && !isPinching) {
      e.preventDefault();
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      if (boardContainerRef.current && intrinsicBoardSize.current) {
        const containerRect = boardContainerRef.current.getBoundingClientRect();
        const scaledWidth = intrinsicBoardSize.current.width * zoom;
        const scaledHeight = intrinsicBoardSize.current.height * zoom;
        
        const maxX = Math.max(0, (scaledWidth - containerRect.width) / 2);
        const maxY = Math.max(0, (scaledHeight - containerRect.height) / 2);
        
        setPan({
          x: Math.max(-maxX, Math.min(maxX, newX)),
          y: Math.max(-maxY, Math.min(maxY, newY))
        });
      } else {
        setPan({ x: newX, y: newY });
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (boardContainerRef.current) {
      boardContainerRef.current.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (e.touches.length === 2) {
      // Pinch to zoom
      setIsPinching(true);
      const distance = getTouchDistance(e.touches);
      setInitialPinchDistance(distance);
      setInitialZoom(zoom);
      setIsDragging(false);
    } else if (e.touches.length === 1 && !isPinching) {
      // Check for double tap
      if (now - lastTap < DOUBLE_TAP_DELAY) {
        e.preventDefault();
        if (zoom === 1) {
          fitToScreen();
        } else {
          setZoom(1);
          setPan({ x: 0, y: 0 });
        }
      }
      setLastTap(now);
      
      // Single finger drag (only if not pinching)
      if (!isPinching) {
        const touch = e.touches[0];
        setIsDragging(true);
        setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && isPinching) {
      // Pinch to zoom
      e.preventDefault();
      const currentDistance = getTouchDistance(e.touches);
      const scale = currentDistance / initialPinchDistance;
      const newZoom = Math.max(0.3, Math.min(5, initialZoom * scale));
      setZoom(newZoom);
    } else if (isDragging && e.touches.length === 1 && !isPinching) {
      // Single finger drag
      e.preventDefault();
      const touch = e.touches[0];
      const newX = touch.clientX - dragStart.x;
      const newY = touch.clientY - dragStart.y;
      
      if (boardContainerRef.current && intrinsicBoardSize.current) {
        const containerRect = boardContainerRef.current.getBoundingClientRect();
        const scaledWidth = intrinsicBoardSize.current.width * zoom;
        const scaledHeight = intrinsicBoardSize.current.height * zoom;
        
        const maxX = Math.max(0, (scaledWidth - containerRect.width) / 2);
        const maxY = Math.max(0, (scaledHeight - containerRect.height) / 2);
        
        setPan({
          x: Math.max(-maxX, Math.min(maxX, newX)),
          y: Math.max(-maxY, Math.min(maxY, newY))
        });
      } else {
        setPan({ x: newX, y: newY });
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2 && isPinching) {
      setIsPinching(false);
      setInitialPinchDistance(0);
      setInitialZoom(zoom);
    }
    if (e.touches.length === 0) {
      setIsDragging(false);
    }
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

  const GameInfo = () => {
    const myPlayer = gameState.players.find(p => p.id === currentPlayer?.id);
    const myColor = myPlayer ? getPlayerColor(myPlayer.id) : '#888';
    
    return (
      <>
        <div className={styles.navInfo}>
          {playerRole === 'spectator' ? (
            <>
              <Eye size={16} />
              <span>Spectating</span>
            </>
          ) : (
            <>
              <span style={{ color: isMyTurn ? myColor : 'var(--text-secondary)' }}>
                {isMyTurn ? 'Your Turn!' : `${currentTurnPlayer?.name}'s Turn`}
              </span>
            </>
          )}
        </div>
        
        {playerRole !== 'spectator' && myPlayer && (
          <div className={styles.navInfo}>
            <span>You: </span>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              backgroundColor: myColor,
              display: 'inline-block',
              marginRight: '0.25rem'
            }} />
            <span style={{ color: myColor, fontWeight: 700 }}>{myPlayer.symbol}</span>
          </div>
        )}
        
        <div className={styles.navInfo}>
          <Users size={16} />
          <span>{gameState.players.length}/{gameState.maxPlayers}</span>
        </div>
        
        {playerRole !== 'spectator' && (
          <div className={styles.navInfo}>
            <Trophy size={16} />
            <span>{gameState.scores[currentPlayer?.id || ''] || 0}</span>
          </div>
        )}
      </>
    );
  };

  return (
    <>
      <GameNavBar 
        gameTitle="Dots and Boxes" 
        gameInfo={<GameInfo />}
      />
      
      <div className={styles.fullscreenGame}>
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

      {/* Game Board with Zoom and Pan (scroll to zoom, drag to pan) */}
      <div 
        ref={boardContainerRef}
        className={`${gameUI.boardContainer} ${isDragging ? gameUI.dragging : ''}`}
        style={{ 
          width: '95vw',
          maxWidth: '100%',
          height: 'calc(100vh - 120px)',
          margin: '0 auto',
          position: 'relative'
        }}
        onDoubleClick={handleDoubleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        <div 
          ref={boardWrapperRef}
          className={gameUI.boardWrapper}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            willChange: 'transform',
            transition: isDragging ? 'none' : 'transform 0.2s ease-out',
            imageRendering: 'crisp-edges'
          }}
        >
          <div className={styles.board} style={{
            gridTemplateColumns: `repeat(${gameState.gridCols + 1}, 60px)`,
            gridTemplateRows: `repeat(${gameState.gridRows + 1}, 60px)`,
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
        </div>
      </div>

      <div className={styles.zoomHint}>
        Scroll/Pinch to zoom · Drag to pan · Double-tap/click to fit screen
      </div>
      </div>
    </>
  );
}
