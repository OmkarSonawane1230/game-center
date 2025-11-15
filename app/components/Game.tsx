'use client';
import { useState, useEffect } from 'react';
import Board from './Board';
import GameModal from './GameModal';
import { db } from '../firebase/config';
import { doc, getDoc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';
import styles from '../styles/UltimateTicTacToe.module.css';
import { X, Circle, ClipboardCopy, Loader2, Users, Eye, Lock } from 'lucide-react';
import { GameState, SquareValue, BoardResult } from '../types';

interface GameProps {
  gameId: string;
}

const getPlayerId = (): string => {
    if (typeof window !== 'undefined') {
        let id = sessionStorage.getItem('playerId');
        if (id) return id;
    }
    const newId = `player_${Math.random().toString(36).substr(2, 9)}`;
    if (typeof window !== 'undefined') {
        sessionStorage.setItem('playerId', newId);
    }
    return newId;
};

export default function Game({ gameId }: GameProps) {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [playerId, setPlayerId] = useState<string>('');
    const [playerRole, setPlayerRole] = useState<'X' | 'O' | 'spectator' | null>(null);
    const [showPasswordPrompt, setShowPasswordPrompt] = useState<boolean>(false);
    const [passwordInput, setPasswordInput] = useState<string>('');
    const [passwordError, setPasswordError] = useState<string>('');

    useEffect(() => {
        setPlayerId(getPlayerId());
    }, []);

    useEffect(() => {
        console.log("--- Starting useEffect for Game ---");
        console.log("Game ID:", gameId);
        console.log("Player ID:", playerId);

        if (!gameId || !playerId) {
            console.log("Exiting early: gameId or playerId is missing.");
            return;
        }
        
        console.log("Attempting to attach Firebase listener...");

        const gameRef = doc(db, 'games', gameId);
        
        const unsubscribe = onSnapshot(gameRef,
            async (doc) => {
                console.log("✅ SUCCESS: Firestore data received!");
                if (doc.exists()) {
                    console.log("Document data:", doc.data());
                    const data = doc.data() as GameState;
                    
                    // Check if game is password protected and user hasn't verified
                    if (data.isPasswordProtected && !sessionStorage.getItem(`game_${gameId}_password`)) {
                        setGameState(data);
                        setShowPasswordPrompt(true);
                        setLoading(false);
                        return;
                    }

                    setGameState(data);
                    
                    // Determine player role
                    const isPlayer1 = data.players[0] === playerId;
                    const isPlayer2 = data.players[1] === playerId;
                    const isSpectator = data.spectators.includes(playerId);

                    if (isPlayer1) {
                        setPlayerRole('X');
                    } else if (isPlayer2) {
                        setPlayerRole('O');
                    } else if (isSpectator) {
                        setPlayerRole('spectator');
                    } else {
                        // New user joining - decide if player or spectator
                        if (data.players.length < 2) {
                            // Can join as player
                            try {
                                await updateDoc(gameRef, {
                                    players: arrayUnion(playerId),
                                    status: data.players.length === 1 ? 'active' : 'waiting'
                                });
                                setPlayerRole(data.players.length === 0 ? 'X' : 'O');
                            } catch (err) {
                                console.error("Error joining as player:", err);
                            }
                        } else {
                            // Must join as spectator
                            try {
                                await updateDoc(gameRef, {
                                    spectators: arrayUnion(playerId)
                                });
                                setPlayerRole('spectator');
                            } catch (err) {
                                console.error("Error joining as spectator:", err);
                            }
                        }
                    }
                    
                    setError(null);
                } else {
                    console.warn("Document does not exist in Firestore.");
                    setError("Game not found. The game ID may be invalid or the game was deleted.");
                    setGameState(null);
                }
                setLoading(false);
            },
            (err) => {
                console.error("❌ ERROR: Firebase Snapshot Error!", err);
                setError("Failed to connect to the game. Please check your internet connection.");
                setLoading(false);
            }
        );

        return () => {
            console.log("Cleaning up Firebase listener.");
            unsubscribe();
        };
    }, [gameId, playerId]);

    const handlePasswordSubmit = async () => {
        if (!gameState || !passwordInput.trim()) {
            setPasswordError('Please enter a password');
            return;
        }

        if (passwordInput.trim() === gameState.gamePassword) {
            sessionStorage.setItem(`game_${gameId}_password`, passwordInput.trim());
            setShowPasswordPrompt(false);
            setPasswordError('');
            setPasswordInput('');
        } else {
            setPasswordError('Incorrect password. Please try again.');
        }
    };
    
    const handlePlay = async (boardIdx: number, squareIdx: number): Promise<void> => {
        if (!gameState) return;
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
    };
    
    const handleRestart = async (): Promise<void> => {
        if (!gameState || gameState.players.indexOf(playerId) !== 0) return;
        
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
        const message = gameState?.isPasswordProtected 
            ? `${link}\nPassword: ${gameState.gamePassword}` 
            : link;
        navigator.clipboard.writeText(message);
        alert(gameState?.isPasswordProtected ? 'Invite link and password copied!' : 'Invite link copied!');
    };

    if (loading) return <div className={styles.loadingContainer}><Loader2 className={styles.spinner} /> Loading Game...</div>;
    if (error) return <div className={styles.loadingContainer}>{error}</div>;
    if (!gameState) return <div className={styles.loadingContainer}>Game data could not be loaded.</div>;

    // Password prompt
    if (showPasswordPrompt) {
        return (
            <div className={styles.gameContainer}>
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <Lock size={64} className={styles.modalIcon} />
                        <h2 className={styles.modalMessage}>Password Protected Game</h2>
                        <p>This game requires a password to join.</p>
                        <div className={styles.passwordInput}>
                            <input
                                type="text"
                                placeholder="Enter game password"
                                value={passwordInput}
                                onChange={(e) => {
                                    setPasswordInput(e.target.value);
                                    setPasswordError('');
                                }}
                                onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                                autoFocus
                            />
                        </div>
                        {passwordError && <p className={styles.errorText}>{passwordError}</p>}
                        <button className={styles.modalButton} onClick={handlePasswordSubmit}>
                            Join Game
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const { gameWinner, status, players, spectators, xIsNext } = gameState;
    const isWaitingForOpponent = status === 'waiting' || players.length < 2;
    const CurrentTurnIcon = xIsNext ? X : Circle;
    const turnColor = xIsNext ? 'var(--player-x)' : 'var(--player-o)';
    
    let statusText: string;
    if (playerRole === 'spectator') {
        statusText = "Spectating";
    } else if (isWaitingForOpponent) {
        statusText = "Waiting for opponent...";
    } else if ((xIsNext && playerRole === 'X') || (!xIsNext && playerRole === 'O')) {
        statusText = "Your Turn";
    } else {
        statusText = "Opponent's Turn";
    }

    return (
        <div className={styles.gameContainer}>
            {gameWinner && (
                <GameModal
                    message={gameWinner === 'Draw' ? 'It\'s a Draw!' : `Winner: ${gameWinner}`}
                    buttonText="Play Again"
                    onButtonClick={handleRestart}
                    isPlayerOne={players.indexOf(playerId) === 0}
                />
            )}
             {isWaitingForOpponent && !gameWinner && playerRole !== 'spectator' && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h2 className={styles.modalMessage}>Waiting for Opponent</h2>
                        <p>Share this link with a friend to play!</p>
                        {gameState.isPasswordProtected && (
                            <p className={styles.passwordInfo}>
                                <Lock size={16} /> Password: <strong>{gameState.gamePassword}</strong>
                            </p>
                        )}
                        <div className={styles.inviteBox}>
                            <input type="text" readOnly value={typeof window !== "undefined" ? window.location.href : ""} />
                            <button onClick={copyInviteLink}><ClipboardCopy/></button>
                        </div>
                    </div>
                </div>
            )}
            
            <h1 className={styles.gameTitle}>Ultimate Tic-Tac-Toe</h1>
            
            <div className={styles.gameInfo}>
                <div className={styles.status} style={{color: playerRole === 'spectator' ? '#888' : turnColor}}>
                     <p>{statusText}</p>
                     {!isWaitingForOpponent && playerRole !== 'spectator' && <CurrentTurnIcon size={32} />} 
                     {playerRole === 'spectator' && <Eye size={32} />}
                </div>
                
                <div className={styles.playerCount}>
                    <Users size={20} />
                    <span>{players.length}/2 Players</span>
                    {spectators.length > 0 && (
                        <>
                            <Eye size={16} style={{marginLeft: '8px'}} />
                            <span>{spectators.length} Spectator{spectators.length !== 1 ? 's' : ''}</span>
                        </>
                    )}
                </div>
            </div>
            
            <Board 
                smallBoards={gameState.boardState}
                onPlay={handlePlay}
                activeBoard={gameState.activeBoard}
                disabled={playerRole === 'spectator'}
            />

            <div className={styles.playerInfo}>
                {playerRole === 'spectator' ? (
                    <span className={styles.spectatorBadge}>
                        <Eye size={20} /> Spectator Mode - You are watching this game
                    </span>
                ) : (
                    <>
                        You are playing as: {playerRole === 'X' ? <X color='var(--player-x)'/> : playerRole === 'O' ? <Circle color='var(--player-o)'/> : 'Loading...'}
                    </>
                )}
            </div>
        </div>
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
