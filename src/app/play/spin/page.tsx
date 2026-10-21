import { SpinGame } from "@/components/games/SpinGame";
import { BetHistory } from "@/components/BetHistory";
import { GameBanner } from "@/components/GameBanner";

export default function Page() {
  return (
    <main className="play-page">
      <GameBanner slug="spin" />
      <SpinGame />
      <BetHistory />
    </main>
  );
}
