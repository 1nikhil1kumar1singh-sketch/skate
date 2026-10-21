import { RouletteGame } from "@/components/games/RouletteGame";
import { BetHistory } from "@/components/BetHistory";
import { GameBanner } from "@/components/GameBanner";

export default function Page() {
  return (
    <main className="play-page">
      <GameBanner slug="roulette" />
      <RouletteGame />
      <BetHistory />
    </main>
  );
}
