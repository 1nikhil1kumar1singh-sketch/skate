# Klasshi

Solana USDC casino — originals, TypeScript, Privy-optional.

## What you get

- **Demo mode** works immediately (no Privy key required)
- Custodial USDC ledger for instant bets
- Provably fair seeds (SHA-256 server seed hash)
- On-chain USDC deposit verification + treasury withdrawals (when configured)
- Privy login hook when you add your App ID + secret

## Quick start

```bash
cp .env.example .env
npm install
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Enter with demo USDC** → play Dice / Coin Flip.

## Privy (optional)

1. Create an app at [privy.io](https://www.privy.io)
2. Enable Solana + embedded wallets
3. Set in `.env`:

```env
DEMO_MODE=false
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_PRIVY_APP_ID=your_app_id
PRIVY_APP_SECRET=your_app_secret
```

Restart `npm run dev`. The UI mounts Privy automatically when the App ID is present.

## Real Solana USDC (devnet)

```env
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
NEXT_PUBLIC_TREASURY_ADDRESS=YourTreasuryPubkey
TREASURY_SECRET_KEY=base58_or_json_secret
```

- **Deposit:** user sends USDC to treasury → `POST /api/deposit` with `{ signature }`
- **Withdraw:** `POST /api/withdraw` with `{ amount, toAddress }`
- **Demo top-up:** header **+50** or deposit with `{ demo: true }` while demo mode is on

## Games

| Game | Notes |
|------|--------|
| Dice / Coin Flip | Classic originals |
| Mines / Spin / Mystery | Ported from YeNo Rewards Hub |
| Limbo / Crash | Target / auto-cashout multipliers |
| Keno | Pick 1–10 of 40, draw 10 |
| Roulette | Red/black, odd/even, or single number |
| Hi-Lo / Wheel / RPS / Slots | Instant settle originals |

All (except Mines multi-step) go through `POST /api/bet`. **Plinko not included.**

### Platform profit knobs (`.env`)

| Var | Default | Effect |
|-----|---------|--------|
| `HOUSE_EDGE` | `0.08` | **8%** take on fair odds (RTP ≈ 92%) |
| `MINES_HOUSE_EDGE_BP` | `800` | 8% on Mines ladder |
| `MAX_BET_USDC` | `25` | Cap stake size |
| `MAX_WIN_USDC` | `150` | Cap single payout |
| `MAX_PAYOUT_MULT` | `50` | Cap multiplier |
| `WITHDRAW_FEE_BPS` | `300` | **3%** fee on withdrawals |

Raise `HOUSE_EDGE` (e.g. `0.12`) for more profit. Restart the server after changing.

## Scripts

```bash
npm run dev       # local server
npm run build     # production build
npx prisma studio # inspect DB
```

## Notes

- This is an MVP, not a licensed casino product. You own legal/compliance.
- Never commit real treasury keys or Privy secrets.
- Default DB is SQLite (`prisma/dev.db`). Swap `DATABASE_URL` to Postgres for production.
