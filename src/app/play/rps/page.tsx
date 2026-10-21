import { RpsGame } from "@/components/games/RpsGame";
import { BetHistory } from "@/components/BetHistory";
import { GameBanner } from "@/components/GameBanner";

export default function Page() {
  return (
    <main className="play-page">
      <GameBanner slug="rps" />
      <RpsGame />
      <BetHistory />
    </main>
  );
}
