'use client';
import { useState, useEffect } from 'react';
import Board from './Board';
import GameModal from './GameModal';
import { db } from '../firebase/config';
import { doc, getDoc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';
import styles from '../styles/UltimateTicTacToe.module.css';
import { X, Circle, ClipboardCopy, Loader2 } from 'lucide-react';
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
    const [playerRole, setPlayerRole] = useState<'X' | 'O' | null>(null);

    useEffect(() => {
        setPlayerId(getPlayerId());
    }, []);

    useEffect(() => {
        // --- START DEBUG LOGS ---
        console.log("--- Starting useEffect for Game ---");
        console.log("Game ID:", gameId);
        console.log("Player ID:", playerId);
        console.log("Is Project ID loaded?", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? `Yes: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`: "No, environment variable is missing!");

        if (!gameId || !playerId) {
            console.log("Exiting early: gameId or playerId is missing.");
            return;
        }
        
        console.log("Attempting to attach Firebase listener...");

        const gameRef = doc(db, 'games', gameId);
        
        const unsubscribe = onSnapshot(gameRef,
            (doc) => {
                console.log("%c✅ SUCCESS: Firestore data received!", "color: green; font-weight: bold;");
                if (doc.exists()) {
                    console.log("Document data:", doc.data());
                    const data = doc.data() as GameState;
                    setGameState(data);
                    
                    if (data.players.length < 2 && !data.players.includes(playerId)) {
                        console.log("Player not in game, attempting to join...");
                        updateDoc(gameRef, {
                            players: arrayUnion(playerId),
                            status: data.players.length === 1 ? 'active' : 'waiting'
                        });
                    }
                    
                    if (data.players[0] === playerId) setPlayerRole('X');
                    if (data.players[1] === playerId) setPlayerRole('O');
                    setError(null);
                } else {
                    console.warn("Document does not exist in Firestore.");
                    setError("Game not found. It may have been deleted.");
                    setGameState(null);
                }
                setLoading(false); // Should stop loading here on success
            },
            (err) => {
                console.error("%c❌ ERROR: Firebase Snapshot Error!", "color: red; font-weight: bold;", err);
                setError("Failed to connect to the game. Check Firestore rules and console for errors.");
                setLoading(false); // Should stop loading here on error
            }
        );

        return () => {
            console.log("Cleaning up Firebase listener.");
            unsubscribe();
        };
        // --- END DEBUG LOGS ---
    }, [gameId, playerId]);
    
    // ... NO OTHER CHANGES BELOW THIS LINE ...
    const handlePlay = async (boardIdx: number, squareIdx: number): Promise<void> => {
        if (!gameState) return;
        const { boardState, gameWinner, activeBoard, players, xIsNext } = gameState;

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
        navigator.clipboard.writeText(window.location.href);
        alert('Invite link copied!');
    };

    if (loading) return <div className={styles.loadingContainer}><Loader2 className={styles.spinner} /> Loading Game...</div>;
    if (error) return <div className={styles.loadingContainer}>{error}</div>;
    if (!gameState) return <div className={styles.loadingContainer}>Game data could not be loaded.</div>;

    const { gameWinner, status, players, xIsNext } = gameState;
    const isWaitingForOpponent = status === 'waiting' || players.length < 2;
    const CurrentTurnIcon = xIsNext ? X : Circle;
    const turnColor = xIsNext ? 'var(--accent-x)' : 'var(--accent-o)';
    
    let statusText: string;
    if (isWaitingForOpponent) statusText = "Waiting for opponent...";
    else if ((xIsNext && playerRole === 'X') || (!xIsNext && playerRole === 'O')) statusText = "Your Turn";
    else statusText = "Opponent's Turn";

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
             {isWaitingForOpponent && !gameWinner && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h2 className={styles.modalMessage}>Waiting for Opponent</h2>
                        <p>Share this link with a friend to play!</p>
                        <div className={styles.inviteBox}>
                            <input type="text" readOnly value={typeof window !== "undefined" ? window.location.href : ""} />
                            <button onClick={copyInviteLink}><ClipboardCopy/></button>
                        </div>
                    </div>
                </div>
            )}
            
            <h1 className={styles.gameTitle}>Ultimate Tic-Tac-Toe</h1>
            <div className={styles.status} style={{color: turnColor}}>
                 <p>{statusText}</p>
                 {!isWaitingForOpponent && <CurrentTurnIcon size={32} />} 
            </div>
            
            <Board 
                smallBoards={gameState.boardState}
                onPlay={handlePlay}
                activeBoard={gameState.activeBoard}
            />

            <div className={styles.playerInfo}>
                You are playing as: {playerRole === 'X' ? <X color='var(--accent-x)'/> : playerRole === 'O' ? <Circle color='var(--accent-o)'/> : 'Spectator'}
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