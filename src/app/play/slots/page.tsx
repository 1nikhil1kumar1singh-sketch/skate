import { SlotsGame } from "@/components/games/SlotsGame";
import { BetHistory } from "@/components/BetHistory";
import { GameBanner } from "@/components/GameBanner";

export default function Page() {
  return (
    <main className="play-page">
      <GameBanner slug="slots" />
      <SlotsGame />
      <BetHistory />
    </main>
  );
}
