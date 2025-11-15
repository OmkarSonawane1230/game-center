import DotsAndBoxesGame from '../../components/DotsAndBoxesGame';

interface GameRoomPageProps {
  params: Promise<{
    gameId: string;
  }>;
}

export default async function DotsAndBoxesGamePage({ params }: GameRoomPageProps) {
  const { gameId } = await params;
  return <DotsAndBoxesGame gameId={gameId} />;
}
