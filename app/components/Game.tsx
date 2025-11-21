'use client';
import { useState, useEffect } from 'react';
import Board from './Board';
import GameModal from './GameModal';
import GameNavBar from './GameNavBar';
import { db } from '../firebase/config';
import { doc, onSnapshot, updateDoc, arrayUnion, deleteDoc, increment } from 'firebase/firestore';
import styles from '../styles/UltimateTicTacToe.module.css';
import gameUI from '../styles/GameUI.module.css';
import { X, Circle, ClipboardCopy, Loader2, Users, Eye } from 'lucide-react';
import { GameState, SquareValue, BoardResult, GamePlayer } from '../types';
import { getCurrentPlayer } from '../utils/PlayerAuth';
import PlayerAuth from './PlayerAuth';

interface GameProps {
  gameId: string;
}

export default function Game({ gameId }: GameProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<{ id: string; name: string } | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [playerRole, setPlayerRole] = useState<'X' | 'O' | 'spectator' | null>(null);

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
          const data = doc.data() as GameState;
          setGameState(data);

          // Determine player role
          const playerIndex = data.players.findIndex(p => p.id === currentPlayer.id);
          const isSpectator = data.spectators.includes(currentPlayer.id);

          if (playerIndex === 0) {
            setPlayerRole('X');
          } else if (playerIndex === 1) {
            setPlayerRole('O');
          } else if (isSpectator) {
            setPlayerRole('spectator');
          } else {
            // New user joining
            if (data.players.length < 2) {
              // Join as player
              const symbol = data.players.length === 0 ? 'X' : 'O';
              try {
                await updateDoc(gameRef, {
                  players: arrayUnion({ 
                    id: currentPlayer.id, 
                    name: currentPlayer.name, 
                    symbol 
                  }),
                  status: data.players.length === 1 ? 'active' : 'waiting'
                });
                setPlayerRole(symbol as 'X' | 'O');
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

  const handlePlay = async (boardIdx: number, squareIdx: number): Promise<void> => {
    if (!gameState || !currentPlayer) return;
    const { boardState, gameWinner, activeBoard, players, xIsNext } = gameState;

    // Spectators cannot play
    if (playerRole === 'spectator') return;

    if (gameWinner || boardState[boardIdx].squares[squareIdx] || boardState[boardIdx].winner) return;
    if (players.length < 2) return;
    if ((xIsNext && playerRole !== 'X') || (!xIsNext && playerRole !== 'O')) return;

    const newBoardState = boardState.map(board => ({ ...board, squares: [...board.squares] }));
    newBoardState[boardIdx].squares[squareIdx] = xIsNext ? 'X' : 'O';

    const smallBoardWinner = checkWinner(newBoardState[boardIdx].squares);
    if (smallBoardWinner) {
      newBoardState[boardIdx].winner = smallBoardWinner;
    }

    let newActiveBoard = newBoardState[squareIdx].winner ? null : squareIdx;
    const mainBoardSquares = newBoardState.map(b => b.winner);

    const newGameWinner = checkWinner(mainBoardSquares);

    const gameRef = doc(db, 'games', gameId);
    await updateDoc(gameRef, {
      boardState: newBoardState,
      xIsNext: !xIsNext,
      activeBoard: newActiveBoard,
      gameWinner: newGameWinner,
      status: newGameWinner ? 'finished' : 'active',
    });

    // Update player stats and delete game if finished
    if (newGameWinner && newGameWinner !== 'Draw') {
      const winnerPlayer = players.find(p => p.symbol === newGameWinner);
      if (winnerPlayer) {
        const winnerRef = doc(db, 'players', winnerPlayer.id);
        await updateDoc(winnerRef, {
          gamesPlayed: increment(1),
          gamesWon: increment(1)
        });
      }

      // Update loser stats
      const loserPlayer = players.find(p => p.symbol !== newGameWinner);
      if (loserPlayer) {
        const loserRef = doc(db, 'players', loserPlayer.id);
        await updateDoc(loserRef, {
          gamesPlayed: increment(1)
        });
      }

      // Delete game after 5 seconds
      setTimeout(async () => {
        try {
          await deleteDoc(gameRef);
        } catch (error) {
          console.error('Error deleting game:', error);
        }
      }, 5000);
    } else if (newGameWinner === 'Draw') {
      // Update both players' stats for draw
      for (const player of players) {
        const playerRef = doc(db, 'players', player.id);
        await updateDoc(playerRef, {
          gamesPlayed: increment(1)
        });
      }

      // Delete game after 5 seconds
      setTimeout(async () => {
        try {
          await deleteDoc(gameRef);
        } catch (error) {
          console.error('Error deleting game:', error);
        }
      }, 5000);
    }
  };

  const handleRestart = async (): Promise<void> => {
    if (!gameState || !currentPlayer) return;
    if (gameState.players[0].id !== currentPlayer.id) return;

    const initialBoardState = Array(9).fill({ winner: null, squares: Array(9).fill(null) });
    await updateDoc(doc(db, 'games', gameId), {
      boardState: initialBoardState,
      xIsNext: true,
      activeBoard: null,
      gameWinner: null,
      status: 'active'
    });
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

  const { gameWinner, status, players, spectators, xIsNext } = gameState;
  const isWaitingForOpponent = status === 'waiting' || players.length < 2;
  const CurrentTurnIcon = xIsNext ? X : Circle;
  const turnColor = xIsNext ? 'var(--player-x)' : 'var(--player-o)';

  let statusText: string;
  if (playerRole === 'spectator') {
    statusText = 'Spectating';
  } else if (isWaitingForOpponent) {
    statusText = 'Waiting for opponent...';
  } else if ((xIsNext && playerRole === 'X') || (!xIsNext && playerRole === 'O')) {
    statusText = 'Your Turn';
  } else {
    statusText = `${players.find(p => p.symbol === (xIsNext ? 'X' : 'O'))?.name}'s Turn`;
  }

  const getWinnerMessage = () => {
    if (gameWinner === 'Draw') return "It's a Draw!";
    const winnerPlayer = players.find(p => p.symbol === gameWinner);
    return winnerPlayer ? `${winnerPlayer.name} Wins!` : `Winner: ${gameWinner}`;
  };

  const GameInfo = () => (
    <>
      <div className={styles.navInfo}>
        {playerRole === 'spectator' ? (
          <>
            <Eye size={16} />
            <span>Spectating</span>
          </>
        ) : (
          <>
            <CurrentTurnIcon size={16} style={{ color: turnColor }} />
            <span style={{ color: turnColor }}>{statusText}</span>
          </>
        )}
      </div>
      
      {playerRole !== 'spectator' && (
        <div className={styles.navInfo}>
          <span>You:   </span>
          {playerRole === 'X' ? <X size={16} color='var(--player-x)' /> : playerRole === 'O' ? <Circle size={16} color='var(--player-o)' /> : null}
        </div>
      )}
      
      <div className={styles.navInfo}>
        <Users size={16} />
        <span>{players.length}/2</span>
      </div>
    </>
  );

  return (
    <>
      <GameNavBar 
        gameTitle="Ultimate Tic-Tac-Toe" 
        gameInfo={<GameInfo />}
      />
      
      <div className={styles.fullscreenGame}>
        {gameWinner && (
          <GameModal
            message={getWinnerMessage()}
            buttonText="Play Again"
            onButtonClick={handleRestart}
            isPlayerOne={players[0]?.id === currentPlayer?.id}
          />
        )}
        {isWaitingForOpponent && !gameWinner && playerRole !== 'spectator' && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <h2 className={styles.modalMessage}>Waiting for Opponent</h2>
              <p>Share this link with a friend to play!</p>
              <div className={styles.inviteBox}>
                <input type="text" readOnly value={typeof window !== 'undefined' ? window.location.href : ''} />
                <button onClick={copyInviteLink}><ClipboardCopy /></button>
              </div>
            </div>
          </div>
        )}

        <Board
          smallBoards={gameState.boardState}
          onPlay={handlePlay}
          activeBoard={gameState.activeBoard}
          disabled={playerRole === 'spectator'}
        />
      </div>
    </>
  );
}

const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

function checkWinner(squares: (SquareValue | BoardResult)[]): BoardResult {
  for (const combination of WINNING_COMBINATIONS) {
    const [a, b, c] = combination;
    if (squares[a] && squares[a] !== 'Draw' && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a] as 'X' | 'O';
    }
  }
  if (squares.every(square => square !== null)) {
    return 'Draw';
  }
  return null;
}
