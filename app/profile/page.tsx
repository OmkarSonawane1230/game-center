'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentPlayer, logoutPlayer, getPlayerStats } from '../utils/PlayerAuth';
import { Player, FriendRequest, GameInvitation } from '../types';
import styles from '../styles/Profile.module.css';
import { 
  User, Trophy, Target, LogOut, Home, Users, Bell, 
  UserPlus, Check, X, TrendingUp, Gamepad2 
} from 'lucide-react';
import Link from 'next/link';
import { 
  collection, query, orderBy, limit, getDocs, doc, getDoc,
  updateDoc, arrayUnion, arrayRemove, serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';

interface RankedPlayer extends Player {
  rank: number;
  winRate: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [currentPlayer, setCurrentPlayer] = useState<{ id: string; name: string } | null>(null);
  const [stats, setStats] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [topPlayers, setTopPlayers] = useState<RankedPlayer[]>([]);
  const [friends, setFriends] = useState<Player[]>([]);
  const [friendSearchName, setFriendSearchName] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  useEffect(() => {
    const player = getCurrentPlayer();
    if (!player) {
      router.push('/');
      return;
    }

    setCurrentPlayer(player);
    loadData(player.id);
  }, [router]);

  const loadData = async (playerId: string) => {
    try {
      const [playerStats, leaderboard] = await Promise.all([
        getPlayerStats(playerId),
        fetchTopPlayers()
      ]);
      
      setStats(playerStats);
      setTopPlayers(leaderboard);
      
      if (playerStats?.friends && playerStats.friends.length > 0) {
        await loadFriends(playerStats.friends);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const fetchTopPlayers = async (): Promise<RankedPlayer[]> => {
    try {
      const playersRef = collection(db, 'players');
      const q = query(playersRef, orderBy('gamesWon', 'desc'), limit(10));
      const querySnapshot = await getDocs(q);
      
      const players: RankedPlayer[] = querySnapshot.docs.map((doc, index) => {
        const data = doc.data() as Omit<Player, 'id'>;
        const winRate = data.gamesPlayed > 0 
          ? (data.gamesWon / data.gamesPlayed) * 100 
          : 0;
        return {
          ...data,
          id: doc.id,
          rank: index + 1,
          winRate: parseFloat(winRate.toFixed(1))
        };
      });
      
      return players;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  };

  const loadFriends = async (friendIds: string[]) => {
    try {
      const friendsData = await Promise.all(
        friendIds.map(async (id) => {
          const playerDoc = await getDoc(doc(db, 'players', id));
          if (playerDoc.exists()) {
            return { id: playerDoc.id, ...playerDoc.data() } as Player;
          }
          return null;
        })
      );
      setFriends(friendsData.filter((f): f is Player => f !== null));
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!currentPlayer || !friendSearchName.trim()) return;
    
    setSearchLoading(true);
    try {
      const playersRef = collection(db, 'players');
      const q = query(playersRef);
      const querySnapshot = await getDocs(q);
      
      const targetPlayer = querySnapshot.docs.find(
        doc => doc.data().name.toLowerCase() === friendSearchName.trim().toLowerCase()
      );
      
      if (!targetPlayer) {
        alert('Player not found');
        setSearchLoading(false);
        return;
      }
      
      if (targetPlayer.id === currentPlayer.id) {
        alert('You cannot send a friend request to yourself');
        setSearchLoading(false);
        return;
      }
      
      const targetData = targetPlayer.data() as Player;
      const targetFriends = targetData.friends || [];
      const targetFriendRequests = targetData.friendRequests || [];
      
      if (targetFriends.includes(currentPlayer.id)) {
        alert('You are already friends with this player');
        setSearchLoading(false);
        return;
      }
      
      const existingRequest = targetFriendRequests.find(
        req => req.from === currentPlayer.id
      );
      
      if (existingRequest) {
        alert('Friend request already sent');
        setSearchLoading(false);
        return;
      }
      
      await updateDoc(doc(db, 'players', targetPlayer.id), {
        friendRequests: arrayUnion({
          from: currentPlayer.id,
          fromName: currentPlayer.name,
          timestamp: serverTimestamp()
        })
      });
      
      alert('Friend request sent!');
      setFriendSearchName('');
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('Failed to send friend request');
    }
    setSearchLoading(false);
  };

  const handleAcceptFriendRequest = async (request: FriendRequest) => {
    if (!currentPlayer || !stats) return;
    
    try {
      const currentPlayerRef = doc(db, 'players', currentPlayer.id);
      const friendRef = doc(db, 'players', request.from);
      
      await Promise.all([
        updateDoc(currentPlayerRef, {
          friends: arrayUnion(request.from),
          friendRequests: arrayRemove(request)
        }),
        updateDoc(friendRef, {
          friends: arrayUnion(currentPlayer.id)
        })
      ]);
      
      const updatedStats = await getPlayerStats(currentPlayer.id);
      setStats(updatedStats);
      if (updatedStats?.friends) {
        await loadFriends(updatedStats.friends);
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      alert('Failed to accept friend request');
    }
  };

  const handleRejectFriendRequest = async (request: FriendRequest) => {
    if (!currentPlayer) return;
    
    try {
      await updateDoc(doc(db, 'players', currentPlayer.id), {
        friendRequests: arrayRemove(request)
      });
      
      const updatedStats = await getPlayerStats(currentPlayer.id);
      setStats(updatedStats);
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      alert('Failed to reject friend request');
    }
  };

  const handleJoinGame = async (invitation: GameInvitation) => {
    if (!currentPlayer) return;
    
    try {
      await updateDoc(doc(db, 'players', currentPlayer.id), {
        gameInvitations: arrayRemove(invitation)
      });
      
      router.push(`/${invitation.gameType}/${invitation.gameId}`);
    } catch (error) {
      console.error('Error joining game:', error);
      alert('Failed to join game');
    }
  };

  const handleDismissInvitation = async (invitation: GameInvitation) => {
    if (!currentPlayer) return;
    
    try {
      await updateDoc(doc(db, 'players', currentPlayer.id), {
        gameInvitations: arrayRemove(invitation)
      });
      
      const updatedStats = await getPlayerStats(currentPlayer.id);
      setStats(updatedStats);
    } catch (error) {
      console.error('Error dismissing invitation:', error);
      alert('Failed to dismiss invitation');
    }
  };

  const handleLogout = () => {
    logoutPlayer();
    router.push('/');
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Loading profile...</p>
      </div>
    );
  }

  const winRate = stats && stats.gamesPlayed > 0 
    ? ((stats.gamesWon / stats.gamesPlayed) * 100).toFixed(1)
    : '0.0';

  const friendRequests = stats?.friendRequests || [];
  const gameInvitations = stats?.gameInvitations || [];
  const notifications = [...friendRequests, ...gameInvitations];

  return (
    <div className={styles.profileContainer}>
      <Link href="/" className={styles.homeButton}>
        <Home size={18} />
        <span>Home</span>
      </Link>

      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.profileIcon}>
            <User size={48} color="#2b1810" />
          </div>
          <h1 className={styles.title}>{currentPlayer?.name}</h1>
          <p className={styles.subtitle}>Player Profile</p>
        </div>

        <div className={styles.grid}>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Trophy className={styles.sectionIcon} size={24} />
              <h2 className={styles.sectionTitle}>Your Stats</h2>
              <button 
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                className={styles.leaderboardToggleButton}
                title="Toggle leaderboard"
              >
                <TrendingUp size={20} />
              </button>
            </div>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Target size={28} style={{ color: 'var(--accent-primary)' }} />
                </div>
                <div className={styles.statLabel}>Games Played</div>
                <div className={styles.statValue}>{stats?.gamesPlayed || 0}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Trophy size={28} style={{ color: 'var(--accent-success)' }} />
                </div>
                <div className={styles.statLabel}>Games Won</div>
                <div className={styles.statValue}>{stats?.gamesWon || 0}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <TrendingUp size={28} style={{ color: 'var(--accent-warning)' }} />
                </div>
                <div className={styles.statLabel}>Win Rate</div>
                <div className={styles.statValue}>{winRate}%</div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.grid}>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Users className={styles.sectionIcon} size={24} />
              <h2 className={styles.sectionTitle}>Friends</h2>
            </div>
            
            <div className={styles.addFriendForm}>
              <input
                type="text"
                placeholder="Enter player name..."
                value={friendSearchName}
                onChange={(e) => setFriendSearchName(e.target.value)}
                className={styles.input}
                onKeyPress={(e) => e.key === 'Enter' && handleSendFriendRequest()}
              />
              <button
                onClick={handleSendFriendRequest}
                disabled={searchLoading || !friendSearchName.trim()}
                className={styles.button}
              >
                <UserPlus size={18} />
                Add Friend
              </button>
            </div>

            {friends.length === 0 ? (
              <div className={styles.emptyState}>
                <Users size={48} className={styles.emptyIcon} />
                <p>No friends yet</p>
                <p style={{ fontSize: '0.9rem' }}>Add friends to play together</p>
              </div>
            ) : (
              <div className={styles.friendsList}>
                {friends.map((friend) => (
                  <div key={friend.id} className={styles.friendItem}>
                    <div className={styles.friendInfo}>
                      <User size={20} />
                      <span>{friend.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Bell className={styles.sectionIcon} size={24} />
              <h2 className={styles.sectionTitle}>Notifications</h2>
            </div>
            
            {notifications.length === 0 ? (
              <div className={styles.emptyState}>
                <Bell size={48} className={styles.emptyIcon} />
                <p>No notifications</p>
                <p style={{ fontSize: '0.9rem' }}>You'll see friend requests and game invites here</p>
              </div>
            ) : (
              <div className={styles.notificationsList}>
                {friendRequests.map((request, index) => (
                  <div key={`friend-${index}`} className={styles.notificationItem}>
                    <div className={styles.notificationHeader}>
                      <UserPlus size={18} />
                      <span>Friend Request</span>
                    </div>
                    <div className={styles.notificationMessage}>
                      <strong>{request.fromName}</strong> wants to be your friend
                    </div>
                    <div className={styles.notificationActions}>
                      <button
                        onClick={() => handleAcceptFriendRequest(request)}
                        className={`${styles.button} ${styles.buttonSmall} ${styles.buttonSuccess}`}
                      >
                        <Check size={16} />
                        Accept
                      </button>
                      <button
                        onClick={() => handleRejectFriendRequest(request)}
                        className={`${styles.button} ${styles.buttonSmall} ${styles.buttonDanger}`}
                      >
                        <X size={16} />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
                
                {gameInvitations.map((invitation, index) => (
                  <div key={`game-${index}`} className={styles.notificationItem}>
                    <div className={styles.notificationHeader}>
                      <Gamepad2 size={18} />
                      <span>Game Invitation</span>
                    </div>
                    <div className={styles.notificationMessage}>
                      <strong>{invitation.fromName}</strong> invited you to play {invitation.gameType === 'ultimate-tictactoe' ? 'Ultimate Tic-Tac-Toe' : 'Dots and Boxes'}
                    </div>
                    <div className={styles.notificationActions}>
                      <button
                        onClick={() => handleJoinGame(invitation)}
                        className={`${styles.button} ${styles.buttonSmall} ${styles.buttonSuccess}`}
                      >
                        <Check size={16} />
                        Join Game
                      </button>
                      <button
                        onClick={() => handleDismissInvitation(invitation)}
                        className={`${styles.button} ${styles.buttonSmall} ${styles.buttonDanger}`}
                      >
                        <X size={16} />
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.logoutSection}>
          <button onClick={handleLogout} className={`${styles.button} ${styles.buttonDanger}`}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>

      {/* Fixed Leaderboard Sidebar */}
      <div className={`${styles.leaderboardSidebar} ${showLeaderboard ? styles.leaderboardOpen : ''}`}>
        <div className={styles.leaderboardHeader}>
          <h2 className={styles.leaderboardTitle}>
            <Trophy size={22} style={{ marginRight: '0.5rem' }} />
            Top Players
          </h2>
          <button
            onClick={() => setShowLeaderboard(false)}
            className={styles.leaderboardClose}
            title="Close leaderboard"
          >
            ×
          </button>
        </div>
        
        {topPlayers.length === 0 ? (
          <div className={styles.emptyState}>
            <Trophy size={48} className={styles.emptyIcon} />
            <p>No players yet!</p>
            <p style={{ fontSize: '0.9rem' }}>Be the first to play</p>
          </div>
        ) : (
          <div className={styles.leaderboardList}>
            {topPlayers.map((player) => (
              <div 
                key={player.id} 
                className={`${styles.leaderboardItem} ${player.rank <= 3 ? styles.topThree : ''}`}
              >
                <div className={styles.rankBadge}>
                  {player.rank === 1 && '🥇'}
                  {player.rank === 2 && '🥈'}
                  {player.rank === 3 && '🥉'}
                  {player.rank > 3 && `#${player.rank}`}
                </div>
                
                <div className={styles.playerInfo}>
                  <div className={styles.playerName}>
                    <User size={14} />
                    <span>{player.name}</span>
                  </div>
                  
                  <div className={styles.playerStats}>
                    <div className={styles.playerStat}>
                      <Trophy size={12} />
                      <span>{player.gamesWon} wins</span>
                    </div>
                    <div className={styles.playerStat}>
                      <TrendingUp size={12} />
                      <span>{player.winRate}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
