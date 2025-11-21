import Link from 'next/link';
import styles from './styles/Home.module.css';
import { Target, Grid3x3 } from 'lucide-react';
import ActiveGames from './components/ActiveGames';
import Navbar from './components/Navbar';

export default function Home() {
  return (
    <>
      <Navbar />
      <main className={styles.main}>
        <div className={styles.container}>
          <header className={styles.header}>
            <h1 className={styles.title}>Choose Your Game</h1>
            <p className={styles.subtitle}>Premium multiplayer gaming experience</p>
          </header>

          <ActiveGames />

          <div className={styles.gameGrid}>
            <Link href="/ultimate-tictactoe" className={styles.gameCard} data-testid="ultimate-tictactoe-card">
              <div className={styles.gameIcon}>
                <Grid3x3 size={48} />
              </div>
              <h2 className={styles.gameTitle}>Ultimate Tic-Tac-Toe</h2>
              <p className={styles.gameDescription}>A strategic twist on the classic game with 9 boards</p>
              <div className={styles.playButton}>Play Now</div>
            </Link>

            <Link href="/dots-and-boxes" className={styles.gameCard} data-testid="dots-and-boxes-card">
              <div className={styles.gameIcon}>
                <Target size={48} />
              </div>
              <h2 className={styles.gameTitle}>Dots and Boxes</h2>
              <p className={styles.gameDescription}>Connect dots and capture boxes in this multiplayer classic</p>
              <div className={styles.playButton}>Play Now</div>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
