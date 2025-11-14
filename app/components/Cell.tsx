import { X, Circle } from 'lucide-react';
import { SquareValue } from '../types';
import styles from '../styles/UltimateTicTacToe.module.css';

interface CellProps {
    value: SquareValue;
    onCellClick: () => void;
}

export default function Cell({ value, onCellClick }: CellProps) {
    const icon = value === 'X' 
        ? <X color="var(--accent-x)" className={styles.icon}/>
        : value === 'O' 
        ? <Circle color="var(--accent-o)" className={styles.icon}/>
        : null;

    return (
        <button className={styles.cell} onClick={onCellClick}>
            {icon}
        </button>
    );
}