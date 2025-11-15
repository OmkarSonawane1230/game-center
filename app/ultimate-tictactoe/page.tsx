'use client';

import { useRouter } from 'next/navigation';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import styles from '../styles/UltimateTicTacToe.module.css';
import { Gamepad, Users, Home } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { GameState } from '../types';
import { getCurrentPlayer } from '../utils/PlayerAuth';
import PlayerAuth from '../components/PlayerAuth';

export default function TicTacToeLobby() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [currentPlayer, setCurrentPlayer] = useState<{ id: string; name: string } | null>(null);
    const [showAuth, setShowAuth] = useState(false);

    useEffect(() => {
        const player = getCurrentPlayer();
        if (!player) {
            setShowAuth(true);
        } else {
            setCurrentPlayer({ id: player.id, name: player.name });
        }
    }, []);

    const handleAuthenticated = (playerId: string, playerName: string) => {
        setCurrentPlayer({ id: playerId, name: playerName });
        setShowAuth(false);
    };

    const createNewGame = async (): Promise<void> => {
        if (!currentPlayer) {
            setShowAuth(true);
            return;
        }

        setIsLoading(true);
        const initialBoardState = Array(9).fill({ winner: null, squares: Array(9).fill(null) });

        try {
            const newGameData: Omit<GameState, 'createdAt'> = {
                boardState: initialBoardState,
                xIsNext: true,
                activeBoard: null,
                gameWinner: null,
                players: [{ id: currentPlayer.id, name: currentPlayer.name, symbol: 'X' }],
                spectators: [],
                status: 'waiting',
                gameType: 'ultimate-tictactoe'
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

    if (showAuth) {
        return <PlayerAuth onAuthenticated={handleAuthenticated} />;
    }

    return (
        <main className={styles.lobbyContainer}>
            <Link href="/" className={styles.homeButton} data-testid="home-button">
                <Home size={16} />
                <span>Home</span>
            </Link>
            <div className={styles.modalContent}>
                <Gamepad size={64} className={styles.modalIcon} />
                <h1 className={styles.gameTitle}>Ultimate Tic-Tac-Toe</h1>
                <p className={styles.lobbyText}>Create a new game and share the link with a friend to play!</p>
                
                <div className={styles.playerInfo} style={{ marginBottom: '1rem' }}>
                    <Users size={20} />
                    <span>Playing as: <strong>{currentPlayer?.name}</strong></span>
                </div>

                <button className={styles.modalButton} onClick={createNewGame} disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create New Game'}
                </button>
            </div>
        </main>
    );
}