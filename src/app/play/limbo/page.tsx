import { LimboGame } from "@/components/games/LimboGame";
import { BetHistory } from "@/components/BetHistory";
import { GameBanner } from "@/components/GameBanner";

export default function Page() {
  return (
    <main className="play-page">
      <GameBanner slug="limbo" />
      <LimboGame />
      <BetHistory />
    </main>
  );
}
