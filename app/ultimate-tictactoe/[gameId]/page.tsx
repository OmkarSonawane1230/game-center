import Game from '../../components/Game';

// We get `params` as a prop in a dynamic page
interface GameRoomPageProps {
  params: {
    gameId: string;
  };
}

export default function GameRoomPage({ params }: GameRoomPageProps) {
  const { gameId } = params;
  return <Game gameId={gameId} />;
}