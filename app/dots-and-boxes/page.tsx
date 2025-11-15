'use client';

import { useRouter } from 'next/navigation';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import styles from '../styles/UltimateTicTacToe.module.css';
import { Box, Users, Home } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getCurrentPlayer } from '../utils/PlayerAuth';
import PlayerAuth from '../components/PlayerAuth';
import { DotsAndBoxesState } from '../types';

export default function DotsAndBoxesLobby() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPlayer, setCurrentPlayer] = useState<{ id: string; name: string } | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState<number>(2);
  const [gridRows, setGridRows] = useState<number>(4);
  const [gridCols, setGridCols] = useState<number>(4);

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

    if (maxPlayers < 2 || maxPlayers > 10) {
      alert('Please select between 2-10 players');
      return;
    }

    if (gridRows < 2 || gridRows > 15 || gridCols < 2 || gridCols > 15) {
      alert('Grid size must be between 2x2 and 15x15');
      return;
    }

    setIsLoading(true);

    try {
      // Initialize empty grid (flattened arrays for Firebase compatibility)
      const horizontalLines = Array((gridRows + 1) * gridCols).fill(false);
      const verticalLines = Array((gridRows + 1) * (gridCols + 1)).fill(false);
      const boxes = Array(gridRows * gridCols).fill(null);

      const newGameData: Omit<DotsAndBoxesState, 'createdAt'> = {
        gridRows,
        gridCols,
        horizontalLines,
        verticalLines,
        boxes,
        currentPlayerIndex: 0,
        players: [{ id: currentPlayer.id, name: currentPlayer.name, symbol: '1' }],
        spectators: [],
        scores: { [currentPlayer.id]: 0 },
        status: 'waiting',
        winner: null,
        gameType: 'dots-and-boxes',
        maxPlayers
      };

      const newGameRef = await addDoc(collection(db, 'games'), {
        ...newGameData,
        createdAt: serverTimestamp()
      });

      router.push(`/dots-and-boxes/${newGameRef.id}`);
    } catch (error) {
      console.error('Error creating new game:', error);
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
        <Box size={64} className={styles.modalIcon} />
        <h1 className={styles.gameTitle}>Dots and Boxes</h1>
        <p className={styles.lobbyText}>Configure your game and invite friends!</p>

        <div className={styles.playerInfo} style={{ marginBottom: '1rem' }}>
          <Users size={20} />
          <span>Playing as: <strong>{currentPlayer?.name}</strong></span>
        </div>

        <div className={styles.passwordInput}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
            Number of Players (2-10)
          </label>
          <input
            type="number"
            min="2"
            max="10"
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(parseInt(e.target.value) || 2)}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '400px' }}>
          <div className={styles.passwordInput} style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              Rows (2-15)
            </label>
            <input
              type="number"
              min="2"
              max="15"
              value={gridRows}
              onChange={(e) => setGridRows(parseInt(e.target.value) || 4)}
            />
          </div>

          <div className={styles.passwordInput} style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              Columns (2-15)
            </label>
            <input
              type="number"
              min="2"
              max="15"
              value={gridCols}
              onChange={(e) => setGridCols(parseInt(e.target.value) || 4)}
            />
          </div>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          Grid Preview: {gridRows} × {gridCols} ({gridRows * gridCols} boxes)
        </p>

        <button className={styles.modalButton} onClick={createNewGame} disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create New Game'}
        </button>
      </div>
    </main>
  );
}
