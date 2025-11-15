import { SmallBoardState } from '../types';
import SmallBoard from './SmallBoard';
import styles from '../styles/UltimateTicTacToe.module.css';

interface BoardProps {
  smallBoards: SmallBoardState[];
  onPlay: (boardIdx: number, squareIdx: number) => void;
  activeBoard: number | null;
  disabled?: boolean;
}

export default function Board({ smallBoards, onPlay, activeBoard, disabled = false }: BoardProps) {
  return (
    <div className={`${styles.mainBoard} ${disabled ? styles.disabled : ''}`}>
      {smallBoards.map((board, i) => (
        <SmallBoard
          key={i}
          boardIdx={i}
          squares={board.squares}
          winner={board.winner}
          onPlay={onPlay}
          isActive={!disabled && (activeBoard === null || activeBoard === i)}
          isClickable={!disabled && !board.winner}
        />
      ))}
    </div>
  );
}