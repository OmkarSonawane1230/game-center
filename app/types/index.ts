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

// Player information
export interface Player {
  id: string;
  name: string;
  password: string; // In production, this should be hashed
  gamesPlayed: number;
  gamesWon: number;
  createdAt: Timestamp;
}

// Player in game context
export interface GamePlayer {
  id: string;
  name: string;
  symbol?: string; // For tic-tac-toe: 'X' or 'O', for dots&boxes: color/symbol
}

// Defines the entire game state stored in Firestore for Tic-Tac-Toe
export interface GameState {
  boardState: SmallBoardState[];
  xIsNext: boolean;
  activeBoard: number | null;
  gameWinner: BoardResult; // The overall game can be won or drawn
  players: GamePlayer[]; // Players with names
  spectators: string[]; // Spectator IDs
  status: 'waiting' | 'active' | 'finished';
  createdAt: Timestamp;
  gameType: 'ultimate-tictactoe';
}

// Dots and Boxes game state
// Using flattened arrays because Firebase doesn't support nested arrays
export interface DotsAndBoxesState {
  gridRows: number;
  gridCols: number;
  horizontalLines: boolean[]; // Flattened: index = row * gridCols + col
  verticalLines: boolean[]; // Flattened: index = row * (gridCols+1) + col
  boxes: (string | null)[]; // Flattened: index = row * gridCols + col
  currentPlayerIndex: number;
  players: GamePlayer[];
  spectators: string[];
  scores: { [playerId: string]: number };
  status: 'waiting' | 'active' | 'finished';
  winner: string | null; // Player ID of winner
  createdAt: Timestamp;
  gameType: 'dots-and-boxes';
  maxPlayers: number;
}

export type AnyGameState = GameState | DotsAndBoxesState;
