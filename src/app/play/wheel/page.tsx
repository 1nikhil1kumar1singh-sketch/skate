import { WheelGame } from "@/components/games/WheelGame";
import { BetHistory } from "@/components/BetHistory";
import { GameBanner } from "@/components/GameBanner";

export default function Page() {
  return (
    <main className="play-page">
      <GameBanner slug="wheel" />
      <WheelGame />
      <BetHistory />
    </main>
  );
}
