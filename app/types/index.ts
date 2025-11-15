import { Timestamp } from "firebase/firestore";

// Defines the possible values in a single cell (a player's move)
export type SquareValue = 'X' | 'O' | null;

// Defines all possible results for a board (small or main)
export type BoardResult = 'X' | 'O' | 'Draw' | null;

// Defines the state of one of the 9 small boards
export interface SmallBoardState {
  winner: BoardResult; // A small board can be won or drawn
  squares: SquareValue[]; // Its squares contain only player moves
}

// Defines the entire game state stored in Firestore
export interface GameState {
  boardState: SmallBoardState[];
  xIsNext: boolean;
  activeBoard: number | null;
  gameWinner: BoardResult; // The overall game can be won or drawn
  players: string[]; // Max 2 players
  spectators: string[]; // Unlimited spectators
  status: 'waiting' | 'active' | 'finished';
  createdAt: Timestamp;
  gamePassword?: string; // Optional password for protected games
  isPasswordProtected: boolean;
}