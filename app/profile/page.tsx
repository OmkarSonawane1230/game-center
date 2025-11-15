'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentPlayer, logoutPlayer, getPlayerStats } from '../utils/PlayerAuth';
import { Player } from '../types';
import styles from '../styles/UltimateTicTacToe.module.css';
import { User, Trophy, Target, LogOut, Home } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const [currentPlayer, setCurrentPlayer] = useState<{ id: string; name: string } | null>(null);
  const [stats, setStats] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const player = getCurrentPlayer();
    if (!player) {
      router.push('/');
      return;
    }

    setCurrentPlayer(player);
    
    // Fetch player stats
    getPlayerStats(player.id).then(playerStats => {
      setStats(playerStats);
      setLoading(false);
    });
  }, [router]);

  const handleLogout = () => {
    logoutPlayer();
    router.push('/');
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <p>Loading profile...</p>
      </div>
    );
  }

  const winRate = stats && stats.gamesPlayed > 0 
    ? ((stats.gamesWon / stats.gamesPlayed) * 100).toFixed(1)
    : '0.0';

  return (
    <main className={styles.lobbyContainer}>
      <Link href="/" className={styles.homeButton} data-testid="home-button">
        <Home size={16} />
        <span>Home</span>
      </Link>
      <div className={styles.modalContent}>
        <User size={64} className={styles.modalIcon} />
        <h1 className={styles.gameTitle}>Player Profile</h1>
        
        <div className={styles.playerInfo} style={{ marginBottom: '2rem', padding: '1.5rem' }}>
          <User size={24} />
          <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{currentPlayer?.name}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', width: '100%', maxWidth: '500px', marginBottom: '2rem' }}>
          <div style={{ 
            background: 'var(--bg-tertiary)', 
            padding: '1.5rem', 
            borderRadius: 'var(--radius-md)', 
            border: '2px solid var(--border-color)',
            textAlign: 'center'
          }}>
            <Target size={32} style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Games Played</p>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats?.gamesPlayed || 0}</p>
          </div>

          <div style={{ 
            background: 'var(--bg-tertiary)', 
            padding: '1.5rem', 
            borderRadius: 'var(--radius-md)', 
            border: '2px solid var(--border-color)',
            textAlign: 'center'
          }}>
            <Trophy size={32} style={{ color: 'var(--accent-success)', marginBottom: '0.5rem' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Games Won</p>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats?.gamesWon || 0}</p>
          </div>

          <div style={{ 
            background: 'var(--bg-tertiary)', 
            padding: '1.5rem', 
            borderRadius: 'var(--radius-md)', 
            border: '2px solid var(--border-color)',
            textAlign: 'center'
          }}>
            <Target size={32} style={{ color: 'var(--accent-warning)', marginBottom: '0.5rem' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Win Rate</p>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{winRate}%</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className={styles.modalButton} onClick={handleLogout} data-testid="logout-button">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>
    </main>
  );
}
