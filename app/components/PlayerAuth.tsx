'use client';
import { useState } from 'react';
import { registerPlayer, loginPlayer } from '../utils/PlayerAuth';
import styles from '../styles/UltimateTicTacToe.module.css';
import { User, LogIn, UserPlus } from 'lucide-react';

interface PlayerAuthProps {
  onAuthenticated: (playerId: string, playerName: string) => void;
}

export default function PlayerAuth({ onAuthenticated }: PlayerAuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !password.trim()) {
      setError('Please enter both name and password');
      return;
    }

    if (name.length < 3) {
      setError('Name must be at least 3 characters');
      return;
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    setLoading(true);
    setError('');

    const result = isLogin 
      ? await loginPlayer(name.trim(), password)
      : await registerPlayer(name.trim(), password);

    setLoading(false);

    if (result.success && result.playerId) {
      onAuthenticated(result.playerId, name.trim());
    } else {
      setError(result.error || 'Authentication failed');
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <User size={64} className={styles.modalIcon} />
        <h2 className={styles.modalMessage}>{isLogin ? 'Welcome Back!' : 'Create Account'}</h2>
        <p className={styles.lobbyText}>
          {isLogin ? 'Login to continue playing' : 'Register to start playing'}
        </p>

        <div className={styles.passwordInput}>
          <input
            type="text"
            placeholder="Player Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            maxLength={20}
            autoFocus
          />
        </div>

        <div className={styles.passwordInput}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            maxLength={30}
          />
        </div>

        {error && <p className={styles.errorText}>{error}</p>}

        <button 
          className={styles.modalButton} 
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            'Please wait...'
          ) : isLogin ? (
            <><LogIn size={20} /> Login</>
          ) : (
            <><UserPlus size={20} /> Register</>
          )}
        </button>

        <button
          className={styles.toggleButton}
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
          }}
          style={{ marginTop: '1rem' }}
        >
          {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
        </button>
      </div>
    </div>
  );
}
