import Link from 'next/link';
import styles from './styles/Home.module.css';
import { Gamepad2 } from 'lucide-react';

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <header className={styles.header}>
          <Gamepad2 size={64} className={styles.logo} />
          <h1 className={styles.title}>Game Hub</h1>
          <p className={styles.subtitle}>Choose a game to play</p>
        </header>
        <div className={styles.gameList}>
          <Link href="/ultimate-tictactoe" className={styles.gameCard}>
            <h2 className={styles.gameTitle}>Ultimate Tic-Tac-Toe</h2>
            <p className={styles.gameDescription}>A strategic twist on a classic game.</p>
          </Link>
        </div>
      </div>
    </main>
  );
}