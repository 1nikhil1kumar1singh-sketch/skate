import { notFound, redirect } from "next/navigation";
import { GAME_CATALOG } from "@/lib/catalog";

export default async function ShortGamePath({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = GAME_CATALOG.find((g) => g.slug === slug);
  if (!game) notFound();
  redirect(`/play/${game.slug}`);
}
