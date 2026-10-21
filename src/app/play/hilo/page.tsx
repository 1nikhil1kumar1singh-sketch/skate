import { HiLoGame } from "@/components/games/HiLoGame";
import { BetHistory } from "@/components/BetHistory";
import { GameBanner } from "@/components/GameBanner";

export default function Page() {
  return (
    <main className="play-page">
      <GameBanner slug="hilo" />
      <HiLoGame />
      <BetHistory />
    </main>
  );
}
