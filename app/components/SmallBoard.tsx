import React from 'react';
import { SquareValue } from '../types';
import Cell from './Cell';
import styles from '../styles/UltimateTicTacToe.module.css';
import { X, Circle } from 'lucide-react';

interface SmallBoardProps {
  boardIdx: number;
  squares: SquareValue[];
  winner: 'X' | 'O' | 'Draw' | null;
  onPlay: (boardIdx: number, squareIdx: number) => void;
  isActive: boolean;
  isClickable: boolean;
}

const SmallBoard = ({ boardIdx, squares, winner, onPlay, isActive, isClickable }: SmallBoardProps) => {
    const boardClasses = [
      styles.smallBoard,
      isActive && isClickable ? styles.active : '',
      winner ? styles.won : ''
    ].join(' ');
  
    if (winner && winner !== 'Draw') {
      const WinnerIcon = winner === 'X' ? X : Circle;
      const winnerColor = winner === 'X' ? 'var(--accent-x)' : 'var(--accent-o)';
      return (
        <div className={boardClasses}>
          <WinnerIcon size="80%" color={winnerColor} strokeWidth={2}/>
        </div>
      );
    }

    if (winner && winner === 'Draw') {
        return <div className={`${boardClasses} ${styles.draw}`}></div>;
    }
  
    return (
      <div className={boardClasses}>
        {squares.map((square, i) => (
          <Cell
            key={i}
            value={square}
            onCellClick={() => isActive && isClickable && onPlay(boardIdx, i)}
          />
        ))}
      </div>
    );
};

export default SmallBoard;