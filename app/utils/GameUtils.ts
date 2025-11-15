import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { AnyGameState } from '../types';

export interface ActiveGame {
  id: string;
  gameType: 'ultimate-tictactoe' | 'dots-and-boxes';
  status: 'waiting' | 'active' | 'finished';
  players: Array<{ id: string; name: string; symbol?: string }>;
  createdAt: any;
}

export async function getActiveGames(playerId: string): Promise<ActiveGame[]> {
  try {
    const gamesRef = collection(db, 'games');
    
    // Query for games where the player is a participant
    const q = query(
      gamesRef,
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    
    const querySnapshot = await getDocs(q);
    const activeGames: ActiveGame[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as AnyGameState;
      
      // Check if player is in the game and game is not finished
      const isPlayer = data.players?.some(p => p.id === playerId);
      const isNotFinished = data.status !== 'finished';
      
      if (isPlayer && isNotFinished) {
        activeGames.push({
          id: doc.id,
          gameType: data.gameType,
          status: data.status,
          players: data.players || [],
          createdAt: data.createdAt
        });
      }
    });
    
    return activeGames;
  } catch (error) {
    console.error('Error fetching active games:', error);
    return [];
  }
}
