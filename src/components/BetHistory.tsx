"use client";

import { useCallback, useEffect, useState } from "react";
import { useSkate } from "@/hooks/useSkate";
import { Pagination } from "@/components/Pagination";
import { GAME_CATALOG } from "@/lib/catalog";

type BetRow = {
  id: string;
  game: string;
  amount: string;
  payout: string;
  profit: string;
  won: boolean;
  result: Record<string, unknown>;
  createdAt: string;
};

const PAGE_SIZE = 10;

function gameTitle(slug: string) {
  return GAME_CATALOG.find((g) => g.slug === slug)?.title ?? slug;
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function BetHistory() {
  const { user } = useSkate();
  const [bets, setBets] = useState<BetRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (nextPage: number) => {
      if (!user) {
        setBets([]);
        setTotal(0);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `/api/bets?page=${nextPage}&limit=${PAGE_SIZE}`,
          { cache: "no-store" },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed");
        setBets(data.bets ?? []);
        setTotal(Number(data.total ?? 0));
        setPage(Number(data.page ?? nextPage));
      } catch {
        setBets([]);
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    setPage(1);
    void load(1);
  }, [user?.id, user?.nonce, user?.balance.available, load]);

  if (!user) return null;

  return (
    <section className="history">
      <div className="section-head section-head--row">
        <div>
          <h2>Recent bets</h2>
          <p>Settled rounds on your account</p>
        </div>
        {total > 0 ? (
          <span className="history-count">{total} total</span>
        ) : null}
      </div>
      {loading && bets.length === 0 ? (
        <p className="muted">Loading bets…</p>
      ) : bets.length === 0 ? (
        <div className="history-empty">
          <p>No bets yet</p>
          <span className="muted">No bets yet.</span>
        </div>
      ) : (
        <>
          <div className="history-table" role="table">
            <div className="history-table__head" role="row">
              <span>Game</span>
              <span>Bet</span>
              <span>Profit</span>
              <span>When</span>
            </div>
            {bets.map((bet) => (
              <div
                key={bet.id}
                className={`history-table__row ${bet.won ? "is-win" : "is-loss"}`}
                role="row"
              >
                <span className="history-game">{gameTitle(bet.game)}</span>
                <span className="muted">{bet.amount}</span>
                <span className="history-profit">
                  {bet.won ? "+" : ""}
                  {bet.profit}
                </span>
                <span className="muted history-when">
                  {formatWhen(bet.createdAt)}
                </span>
              </div>
            ))}
          </div>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            label="bets"
            onChange={(p) => void load(p)}
          />
        </>
      )}
    </section>
  );
}
