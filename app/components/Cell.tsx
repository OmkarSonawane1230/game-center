import { X, Circle } from 'lucide-react';
import { SquareValue } from '../types';
import styles from '../styles/UltimateTicTacToe.module.css';

interface CellProps {
    value: SquareValue;
    onCellClick: () => void;
}

export default function Cell({ value, onCellClick }: CellProps) {
    const icon = value === 'X' 
        ? <X color="var(--player-x)" className={styles.icon} strokeWidth={3}/>
        : value === 'O' 
        ? <Circle color="var(--player-o)" className={styles.icon} strokeWidth={3}/>
        : null;

    return (
        <button className={styles.cell} onClick={onCellClick}>
            {icon}
        </button>
    );
}