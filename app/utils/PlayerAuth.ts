import { db } from '../firebase/config';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Player } from '../types';

// Simple hash function for password (in production, use proper hashing like bcrypt)
function simpleHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

export async function registerPlayer(name: string, password: string): Promise<{ success: boolean; playerId?: string; error?: string }> {
  try {
    // Check if player name already exists
    const playersRef = collection(db, 'players');
    const q = query(playersRef, where('name', '==', name));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return { success: false, error: 'Player name already exists' };
    }

    // Create new player
    const hashedPassword = simpleHash(password);
    const newPlayer = await addDoc(playersRef, {
      name,
      password: hashedPassword,
      gamesPlayed: 0,
      gamesWon: 0,
      createdAt: serverTimestamp(),
      friends: [],
      friendRequests: [],
      gameInvitations: []
    });

    // Store in localStorage
    const playerData = {
      id: newPlayer.id,
      name,
      password: hashedPassword
    };
    localStorage.setItem('currentPlayer', JSON.stringify(playerData));

    return { success: true, playerId: newPlayer.id };
  } catch (error) {
    console.error('Error registering player:', error);
    return { success: false, error: 'Failed to register player' };
  }
}

export async function loginPlayer(name: string, password: string): Promise<{ success: boolean; playerId?: string; error?: string }> {
  try {
    const playersRef = collection(db, 'players');
    const q = query(playersRef, where('name', '==', name));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { success: false, error: 'Player not found' };
    }

    const playerDoc = querySnapshot.docs[0];
    const playerData = playerDoc.data() as Player;
    const hashedPassword = simpleHash(password);

    if (playerData.password !== hashedPassword) {
      return { success: false, error: 'Incorrect password' };
    }

    // Store in localStorage
    const storedData = {
      id: playerDoc.id,
      name: playerData.name,
      password: hashedPassword
    };
    localStorage.setItem('currentPlayer', JSON.stringify(storedData));

    return { success: true, playerId: playerDoc.id };
  } catch (error) {
    console.error('Error logging in:', error);
    return { success: false, error: 'Failed to login' };
  }
}

export function getCurrentPlayer(): { id: string; name: string; password: string } | null {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem('currentPlayer');
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function logoutPlayer(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('currentPlayer');
  }
}

export async function getPlayerStats(playerId: string): Promise<Player | null> {
  try {
    const playersRef = collection(db, 'players');
    const q = query(playersRef, where('__name__', '==', playerId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) return null;
    
    const data = querySnapshot.docs[0].data();
    const player: Player = {
      id: querySnapshot.docs[0].id,
      ...data,
      friends: data.friends || [],
      friendRequests: data.friendRequests || [],
      gameInvitations: data.gameInvitations || []
    } as Player;
    
    // Update document if missing new fields
    if (!data.friends || !data.friendRequests || !data.gameInvitations) {
      try {
        await updateDoc(doc(db, 'players', player.id), {
          friends: player.friends,
          friendRequests: player.friendRequests,
          gameInvitations: player.gameInvitations
        });
      } catch (err) {
        console.error('Error updating player fields:', err);
      }
    }
    
    return player;
  } catch (error) {
    console.error('Error getting player stats:', error);
    return null;
  }
}

export async function updatePlayerStats(playerId: string, won: boolean): Promise<void> {
  try {
    const playerRef = doc(db, 'players', playerId);
    const updates: any = {
      gamesPlayed: (await getPlayerStats(playerId))?.gamesPlayed || 0 + 1
    };
    
    if (won) {
      updates.gamesWon = (await getPlayerStats(playerId))?.gamesWon || 0 + 1;
    }
    
    await updateDoc(playerRef, updates);
  } catch (error) {
    console.error('Error updating player stats:', error);
  }
}
