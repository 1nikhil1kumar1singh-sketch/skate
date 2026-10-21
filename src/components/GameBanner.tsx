import Image from "next/image";
import { getGameBySlug } from "@/lib/catalog";
import { HowToPlay } from "@/components/HowToPlay";
import { GameNav } from "@/components/GameNav";

export function GameBanner({ slug }: { slug: string }) {
  const game = getGameBySlug(slug);
  if (!game) return null;

  return (
    <div className="game-banner-stack">
      <GameNav />
      <div className="game-banner">
        <Image
          src={game.image}
          alt={game.title}
          fill
          className="game-banner__img"
          sizes="(max-width: 980px) 100vw, 980px"
          priority
        />
        <div className="game-banner__veil" />
        <div className="game-banner__copy">
          <p className="game-kicker">Klasshi originals</p>
          <h1>{game.title}</h1>
          <p>{game.blurb}</p>
        </div>
      </div>
      <HowToPlay slug={slug} />
    </div>
  );
}
