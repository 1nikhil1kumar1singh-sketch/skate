import { DiceGame } from "@/components/games/DiceGame";
import { BetHistory } from "@/components/BetHistory";
import { GameBanner } from "@/components/GameBanner";

export default function Page() {
  return (
    <main className="play-page">
      <GameBanner slug="dice" />
      <DiceGame />
      <BetHistory />
    </main>
  );
}
