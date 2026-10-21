"use client";

import { useSkate } from "@/hooks/useSkate";

/** Checkbox only when the player has bonus — no mention of the 10% cap. */
export function UseBonusToggle() {
  const { user, useBonus, setUseBonus } = useSkate();
  const bonus = user?.balance?.hasBonus;
  if (!bonus) return null;

  return (
    <label className="use-bonus">
      <input
        type="checkbox"
        checked={useBonus}
        onChange={(e) => setUseBonus(e.target.checked)}
      />
      <span>
        Use bonus
        <em>{user.balance.bonusDisplay}</em>
      </span>
    </label>
  );
}
