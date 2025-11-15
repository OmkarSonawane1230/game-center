'use client';

import { useRouter } from 'next/navigation';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import styles from '../styles/UltimateTicTacToe.module.css';
import { Gamepad, Lock, Unlock } from 'lucide-react';
import { useState } from 'react';
import { GameState } from '../types'; // Import our types

export default function TicTacToeLobby() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [usePassword, setUsePassword] = useState<boolean>(false);
    const [password, setPassword] = useState<string>('');

    const createNewGame = async (): Promise<void> => {
        if (usePassword && !password.trim()) {
            alert('Please enter a password or disable password protection');
            return;
        }

        setIsLoading(true);
        const initialBoardState = Array(9).fill({ winner: null, squares: Array(9).fill(null) });

        try {
            // We can strongly type the data we are adding to Firestore
            const newGameData: Omit<GameState, 'createdAt'> = {
                boardState: initialBoardState,
                xIsNext: true,
                activeBoard: null,
                gameWinner: null,
                players: [],
                spectators: [],
                status: 'waiting',
                isPasswordProtected: usePassword,
                ...(usePassword && { gamePassword: password.trim() })
            };
            
            const newGameRef = await addDoc(collection(db, "games"), {
                ...newGameData,
                createdAt: serverTimestamp()
            });
            
            // Store password in session if protected
            if (usePassword) {
                sessionStorage.setItem(`game_${newGameRef.id}_password`, password.trim());
            }
            
            router.push(`/ultimate-tictactoe/${newGameRef.id}`);

        } catch (error) {
            console.error("Error creating new game:", error);
            setIsLoading(false);
        }
    };

    return (
        <main className={styles.lobbyContainer}>
            <div className={styles.modalContent}>
                <Gamepad size={64} className={styles.modalIcon} />
                <h1 className={styles.gameTitle}>Ultimate Tic-Tac-Toe</h1>
                <p className={styles.lobbyText}>Create a new game and share the link with a friend to play!</p>
                
                <div className={styles.passwordToggle}>
                    <button 
                        className={`${styles.toggleButton} ${usePassword ? styles.active : ''}`}
                        onClick={() => setUsePassword(!usePassword)}
                        type="button"
                    >
                        {usePassword ? <Lock size={20} /> : <Unlock size={20} />}
                        <span>{usePassword ? 'Password Protected' : 'No Password'}</span>
                    </button>
                </div>

                {usePassword && (
                    <div className={styles.passwordInput}>
                        <input
                            type="text"
                            placeholder="Enter game password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            maxLength={20}
                        />
                    </div>
                )}

                <button className={styles.modalButton} onClick={createNewGame} disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create New Game'}
                </button>
            </div>
        </main>
    );
}