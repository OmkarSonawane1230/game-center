'use client';

import { useRouter } from 'next/navigation';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import styles from '../styles/UltimateTicTacToe.module.css';
import { Gamepad } from 'lucide-react';
import { useState } from 'react';
import { GameState } from '../types'; // Import our types

export default function TicTacToeLobby() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const createNewGame = async (): Promise<void> => {
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
                status: 'waiting',
            };
            
            const newGameRef = await addDoc(collection(db, "games"), {
                ...newGameData,
                createdAt: serverTimestamp()
            });
            
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
                <button className={styles.modalButton} onClick={createNewGame} disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create New Game'}
                </button>
            </div>
        </main>
    );
}