import { MysteryGame } from "@/components/games/MysteryGame";
import { BetHistory } from "@/components/BetHistory";
import { GameBanner } from "@/components/GameBanner";

export default function Page() {
  return (
    <main className="play-page">
      <GameBanner slug="mystery" />
      <MysteryGame />
      <BetHistory />
    </main>
  );
}
