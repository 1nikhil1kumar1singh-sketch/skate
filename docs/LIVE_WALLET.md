# Live Solana USDC / USDT wallet

## One-time setup (devnet)

```bash
npm run setup:treasury
# Fund treasury with SOL for fees:
solana airdrop 1 <TREASURY_ADDRESS> --url devnet
# Restart
npm run dev
```

Check: open `/api/wallet/status` → `"live": true`.

## Accepted tokens

| Token | Network | Notes |
|-------|---------|--------|
| **USDC** | Solana | Devnet + mainnet mints in `.env` |
| **USDT** | Solana | Same deposit address; credits 1:1 to site balance |

Both use 6 decimals. Site balance is USD-denominated. **Withdrawals pay USDC** from treasury (keep treasury funded with USDC).

Disable USDT: set `NEXT_PUBLIC_USDT_MINT=""` and restart.

## Deposit (live)

1. User opens `/wallet` → copies **personal deposit address** or `/pay/skate_…`
2. Sends **USDC or USDT** (matching cluster mint) to that address
3. Clicks **Sync deposits + sweep**
4. Balance credits; tokens move to platform treasury

## Withdraw (live)

1. User enters Solana address + amount
2. Platform sends **USDC** from treasury (minus `WITHDRAW_FEE_BPS`)

## Mainnet

1. Set `NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta`
2. Set mainnet RPC
3. USDC mint `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
4. USDT mint `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`
5. Generate a **new** treasury (never reuse devnet keys)
6. Fund treasury with SOL + **USDC** (for payouts)
7. Keep `DEMO_MODE=false`

## Security

- Never commit `.env` or `.skate/treasury.json`
- Encrypt `depositSecret` in DB before production scale
- Prefer a custodial HSM / MPC for treasury later
