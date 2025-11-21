'use client';

import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, User, X } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Player } from '../types';
import styles from '../styles/LeaderboardModal.module.css';

interface RankedPlayer extends Player {
  rank: number;
  winRate: number;
}

export default function LeaderboardModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [topPlayers, setTopPlayers] = useState<RankedPlayer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleOpenLeaderboard = () => setIsOpen(true);
    window.addEventListener('openLeaderboard', handleOpenLeaderboard);
    return () => window.removeEventListener('openLeaderboard', handleOpenLeaderboard);
  }, []);

  useEffect(() => {
    if (isOpen && topPlayers.length === 0) {
      fetchTopPlayers();
    }
  }, [isOpen, topPlayers.length]);

  const fetchTopPlayers = async () => {
    setLoading(true);
    try {
      const playersRef = collection(db, 'players');
      const q = query(playersRef, orderBy('gamesWon', 'desc'), limit(10));
      const querySnapshot = await getDocs(q);
      
      const players: RankedPlayer[] = querySnapshot.docs.map((doc, index) => {
        const data = doc.data() as Omit<Player, 'id'>;
        const winRate = data.gamesPlayed > 0 
          ? (data.gamesWon / data.gamesPlayed) * 100 
          : 0;
        return {
          ...data,
          id: doc.id,
          rank: index + 1,
          winRate: parseFloat(winRate.toFixed(1))
        };
      });
      
      setTopPlayers(players);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.backdrop} onClick={() => setIsOpen(false)} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            <Trophy size={24} style={{ marginRight: '0.75rem' }} />
            Top Players
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className={styles.closeButton}
            title="Close leaderboard"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>Loading rankings...</div>
          ) : topPlayers.length === 0 ? (
            <div className={styles.empty}>
              <Trophy size={48} className={styles.emptyIcon} />
              <p>No players yet!</p>
              <p className={styles.emptySubtext}>Be the first to play</p>
            </div>
          ) : (
            <div className={styles.playerList}>
              {topPlayers.map((player) => (
                <div 
                  key={player.id} 
                  className={`${styles.playerCard} ${player.rank <= 3 ? styles.topThree : ''}`}
                >
                  <div className={styles.rankBadge}>
                    {player.rank === 1 && '🥇'}
                    {player.rank === 2 && '🥈'}
                    {player.rank === 3 && '🥉'}
                    {player.rank > 3 && `#${player.rank}`}
                  </div>
                  
                  <div className={styles.playerInfo}>
                    <div className={styles.playerName}>
                      <User size={14} />
                      <span>{player.name}</span>
                    </div>
                    
                    <div className={styles.stats}>
                      <div className={styles.stat}>
                        <Trophy size={12} />
                        <span>{player.gamesWon} wins</span>
                      </div>
                      <div className={styles.stat}>
                        <TrendingUp size={12} />
                        <span>{player.winRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
