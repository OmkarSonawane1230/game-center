import Link from 'next/link';
import styles from './styles/Home.module.css';
import { Gamepad2, User } from 'lucide-react';
import ActiveGames from './components/ActiveGames';

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <header className={styles.header}>
          <Gamepad2 size={48} className={styles.logo} />
          <h1 className={styles.title}>Retro Game Hub</h1>
          <p className={styles.subtitle}>Choose Your Game</p>
        </header>
        
        <Link href="/profile" className={styles.profileLink}>
          <User size={14} />
          <span>View Profile</span>
        </Link>

        <ActiveGames />

        <div className={styles.gameList}>
          <Link href="/ultimate-tictactoe" className={styles.gameCard} data-testid="ultimate-tictactoe-card">
            <h2 className={styles.gameTitle}>Ultimate Tic-Tac-Toe</h2>
            <p className={styles.gameDescription}>A strategic twist on the classic game</p>
          </Link>

          <Link href="/dots-and-boxes" className={styles.gameCard} data-testid="dots-and-boxes-card">
            <h2 className={styles.gameTitle}>Dots and Boxes</h2>
            <p className={styles.gameDescription}>Connect dots and capture boxes</p>
          </Link>
        </div>
      </div>
    </main>
  );
}