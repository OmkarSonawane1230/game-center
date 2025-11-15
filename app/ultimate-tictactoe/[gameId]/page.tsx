import Game from '../../components/Game';

// We get `params` as a prop in a dynamic page
interface GameRoomPageProps {
  params: Promise<{
    gameId: string;
  }>;
}

export default async function GameRoomPage({ params }: GameRoomPageProps) {
  const { gameId } = await params;
  return <Game gameId={gameId} />;
}