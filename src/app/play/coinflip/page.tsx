import { CoinFlipGame } from "@/components/games/CoinFlipGame";
import { BetHistory } from "@/components/BetHistory";
import { GameBanner } from "@/components/GameBanner";

export default function Page() {
  return (
    <main className="play-page">
      <GameBanner slug="coinflip" />
      <CoinFlipGame />
      <BetHistory />
    </main>
  );
}
