'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import styles from '../styles/GameNavBar.module.css';
import { ReactNode } from 'react';

interface GameNavBarProps {
  gameTitle: string;
  gameInfo: ReactNode;
}

export default function GameNavBar({ gameTitle, gameInfo }: GameNavBarProps) {
  return (
    <nav className={styles.gameNav}>
      <div className={styles.container}>
        <Link href="/" className={styles.backButton}>
          <ArrowLeft size={20} />
          <span className={styles.backText}>Home</span>
        </Link>
        
        <div className={styles.gameTitle}>{gameTitle}</div>
        
        <div className={styles.gameInfo}>
          {gameInfo}
        </div>
      </div>
    </nav>
  );
}
