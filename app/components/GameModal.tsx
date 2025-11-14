import styles from '../styles/UltimateTicTacToe.module.css';
import { Award, RefreshCw } from 'lucide-react';

interface GameModalProps {
    message: string;
    buttonText: string;
    onButtonClick: () => void;
    isPlayerOne?: boolean; // Optional prop
}

export default function GameModal({ message, buttonText, onButtonClick, isPlayerOne = true }: GameModalProps) {
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <Award size={64} className={styles.modalIcon} />
        <h2 className={styles.modalMessage}>{message}</h2>
        {isPlayerOne && (
          <button className={styles.modalButton} onClick={onButtonClick}>
              <RefreshCw size={20}/>
              <span>{buttonText}</span>
          </button>
        )}
      </div>
    </div>
  );
}