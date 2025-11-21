'use client';

import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, User, X } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Player } from '../types';
import styles from '../styles/Sidebar.module.css';

interface RankedPlayer extends Player {
  rank: number;
  winRate: number;
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const [topPlayers, setTopPlayers] = useState<RankedPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopPlayers();
  }, []);

  const fetchTopPlayers = async () => {
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
      setLoading(false);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        className={styles.toggleButton}
        onClick={() => onToggle(!isOpen)}
        aria-label="Toggle sidebar"
      >
        {isOpen ? <X size={20} /> : <Trophy size={20} />}
      </button>
      
      <aside className={`${styles.sidebar} ${!isOpen ? styles.closed : ''}`}>
        <div className={styles.header}>
          <Trophy size={24} className={styles.icon} />
          <h2 className={styles.title}>Leaderboard</h2>
        </div>
        
        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>Loading rankings...</div>
          ) : topPlayers.length === 0 ? (
            <div className={styles.empty}>
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
      </aside>
    </>
  );
}
