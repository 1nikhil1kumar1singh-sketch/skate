import { KenoGame } from "@/components/games/KenoGame";
import { BetHistory } from "@/components/BetHistory";
import { GameBanner } from "@/components/GameBanner";

export default function Page() {
  return (
    <main className="play-page">
      <GameBanner slug="keno" />
      <KenoGame />
      <BetHistory />
    </main>
  );
}
