'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getActiveGames, ActiveGame } from '../utils/GameUtils';
import { getCurrentPlayer } from '../utils/PlayerAuth';
import styles from '../styles/Home.module.css';
import { Gamepad2, Users, Clock } from 'lucide-react';

export default function ActiveGames() {
  const [activeGames, setActiveGames] = useState<ActiveGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGames = async () => {
      const player = getCurrentPlayer();
      if (!player) {
        setLoading(false);
        return;
      }

      const games = await getActiveGames(player.id);
      setActiveGames(games);
      setLoading(false);
    };

    fetchGames();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '1rem',
        color: 'var(--text-secondary)',
        fontSize: '0.6rem'
      }}>
        Loading games...
      </div>
    );
  }

  if (activeGames.length === 0) {
    return null;
  }

  const getGameUrl = (game: ActiveGame) => {
    if (game.gameType === 'ultimate-tictactoe') {
      return `/ultimate-tictactoe/${game.id}`;
    }
    return `/dots-and-boxes/${game.id}`;
  };

  const getGameTitle = (game: ActiveGame) => {
    if (game.gameType === 'ultimate-tictactoe') {
      return 'Ultimate Tic-Tac-Toe';
    }
    return 'Dots and Boxes';
  };

  return (
    <div style={{ width: '100%', marginTop: '1.5rem', marginBottom: '1rem' }}>
      <h3 style={{
        fontSize: 'clamp(0.6rem, 2vw, 0.9rem)',
        color: 'var(--accent-primary)',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        justifyContent: 'center'
      }}>
        <Gamepad2 size={16} />
        Your Active Games
      </h3>
      
      <div className='scrollable' style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '0.75rem',
        maxHeight: '200px',
        overflowY: 'auto',
        padding: '0.5rem'
      }}>
        {activeGames.map((game) => (
          <Link 
            key={game.id} 
            href={getGameUrl(game)} 
            className={styles.gameCard}
            style={{
              padding: '1.3rem .6rem',
              display: 'flex',
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: '0px'
            }}
            data-testid={`active-game-${game.id}`}
          >
            <div style={{ display: 'inline-flex', justifyContent: 'space-between', width: '60%' }}>
              <div style={{ 
                fontSize: 'clamp(0.55rem, 1.8vw, 0.75rem)',
                color: 'var(--accent-primary)',
                fontWeight: 400
              }}>
                {getGameTitle(game)}
              </div>
              <div style={{
                fontSize: 'clamp(0.6rem, 1.5vw, 0.7rem)',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Users size={13} />
                {game.players.length} player{game.players.length !== 1 ? 's' : ''}
              </div>
            </div>
            
            <div style={{
              padding: '0.4rem',
              background: game.status === 'waiting' ? 'var(--accent-warning)' : 'var(--accent-success)',
              color: 'var(--bg-primary)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'clamp(0.5rem, 1.2vw, 0.6rem)',
              fontWeight: 400,
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}>
              <Clock size={13} />
              {game.status === 'waiting' ? 'Waiting' : 'In Progress'}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
