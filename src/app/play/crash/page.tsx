import { CrashGame } from "@/components/games/CrashGame";
import { BetHistory } from "@/components/BetHistory";
import { GameBanner } from "@/components/GameBanner";

export default function Page() {
  return (
    <main className="play-page">
      <GameBanner slug="crash" />
      <CrashGame />
      <BetHistory />
    </main>
  );
}
