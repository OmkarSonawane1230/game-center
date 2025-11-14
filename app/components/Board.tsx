import { SmallBoardState } from '../types';
import SmallBoard from './SmallBoard';
import styles from '../styles/UltimateTicTacToe.module.css';

interface BoardProps {
  smallBoards: SmallBoardState[];
  onPlay: (boardIdx: number, squareIdx: number) => void;
  activeBoard: number | null;
}

export default function Board({ smallBoards, onPlay, activeBoard }: BoardProps) {
  return (
    <div className={styles.mainBoard}>
      {smallBoards.map((board, i) => (
        <SmallBoard
          key={i}
          boardIdx={i}
          squares={board.squares}
          winner={board.winner}
          onPlay={onPlay}
          isActive={activeBoard === null || activeBoard === i}
          isClickable={!board.winner}
        />
      ))}
    </div>
  );
}