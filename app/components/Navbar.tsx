'use client';

import Link from 'next/link';
import { User, Trophy, Gamepad2 } from 'lucide-react';
import styles from '../styles/Navbar.module.css';

export default function Navbar() {
  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link href="/" className={styles.brand}>
          <Gamepad2 size={24} />
          <span className={styles.brandText}>Retro Game Hub</span>
        </Link>
        
        <div className={styles.navLinks}>
          <Link href="/profile" className={styles.navLink}>
            <User size={18} />
            <span>Profile</span>
          </Link>
          <button 
            onClick={() => window.dispatchEvent(new Event('openLeaderboard'))}
            className={styles.navLink}
            style={{ cursor: 'pointer' }}
          >
            <Trophy size={18} />
            <span>Leaderboard</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
