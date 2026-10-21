"use client";

import { UseBonusToggle } from "@/components/UseBonusToggle";
import { FunPlayToggle } from "@/components/games/FunPlayToggle";
import { useSkate } from "@/hooks/useSkate";

const QUICK = [0.5, 1, 2, 5, 10] as const;

export function AmountField({
  amount,
  onChange,
}: {
  amount: number;
  onChange: (n: number) => void;
}) {
  const { funPlay } = useSkate();

  function setSafe(n: number) {
    const v = Math.round(Math.max(0.01, n) * 100) / 100;
    onChange(v);
  }

  return (
    <div className="amount-field">
      <FunPlayToggle />
      <label className="field">
        <span>Bet amount</span>
        <div className="bet-input">
          <input
            type="number"
            min={0.01}
            step={0.01}
            value={amount}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          <div className="bet-input__ops">
            <button type="button" onClick={() => setSafe(amount / 2)}>
              ½
            </button>
            <button type="button" onClick={() => setSafe(amount * 2)}>
              2×
            </button>
          </div>
        </div>
      </label>
      <div className="bet-chips" role="group" aria-label="Quick amounts">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            className={amount === q ? "is-active" : undefined}
            onClick={() => setSafe(q)}
          >
            {q}
          </button>
        ))}
      </div>
      {!funPlay ? <UseBonusToggle /> : null}
    </div>
  );
}
