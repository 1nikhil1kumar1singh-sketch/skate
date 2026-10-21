import { MinesGame } from "@/components/games/MinesGame";
import { BetHistory } from "@/components/BetHistory";
import { GameBanner } from "@/components/GameBanner";

export default function Page() {
  return (
    <main className="play-page">
      <GameBanner slug="mines" />
      <MinesGame />
      <BetHistory />
    </main>
  );
}
