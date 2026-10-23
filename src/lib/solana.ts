import {
  Connection,
  Keypair,
  PublicKey,
  SendTransactionError,
  Transaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import bs58 from "bs58";
import {
  config,
  getAcceptedStables,
  STABLE_DECIMALS,
  type StableSymbol,
} from "./config";

export function getConnection() {
  return new Connection(config.solana.rpcUrl, "confirmed");
}

export function getUsdcMint() {
  return new PublicKey(config.solana.usdcMint);
}

export function getUsdtMint(): PublicKey | null {
  if (!config.solana.usdtMint) return null;
  return new PublicKey(config.solana.usdtMint);
}

export function parseKeypair(secret: string): Keypair {
  if (secret.trim().startsWith("[")) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret)));
  }
  return Keypair.fromSecretKey(bs58.decode(secret));
}

export function getTreasuryKeypair(): Keypair | null {
  const secret = config.solana.treasurySecretKey;
  if (!secret) return null;
  try {
    return parseKeypair(secret);
  } catch {
    return null;
  }
}

/** Live wallet ready when demo is off and treasury keys exist. */
export function isLiveWalletReady() {
  return (
    !config.demoMode &&
    Boolean(config.solana.treasuryAddress) &&
    Boolean(getTreasuryKeypair())
  );
}

/** ~0.02 SOL covers ATA rents + a few sweeps/withdrawals. */
const MIN_TREASURY_FEE_LAMPORTS = 20_000_000n;
const MIN_TREASURY_FEE_SOL = Number(MIN_TREASURY_FEE_LAMPORTS) / 1e9;

async function assertTreasuryCanPayFees(connection: Connection, payer: Keypair) {
  const balance = await connection.getBalance(payer.publicKey);
  if (BigInt(balance) < MIN_TREASURY_FEE_LAMPORTS) {
    throw new Error(
      `Treasury needs SOL for fees. Send at least ${MIN_TREASURY_FEE_SOL} SOL to ${payer.publicKey.toBase58()} (current: ${(balance / 1e9).toFixed(4)} SOL).`,
    );
  }
}

async function sendAndConfirm(
  connection: Connection,
  tx: Transaction,
  signers: Keypair[],
) {
  try {
    const signature = await connection.sendTransaction(tx, signers, {
      skipPreflight: false,
    });
    await connection.confirmTransaction(signature, "confirmed");
    return signature;
  } catch (err) {
    if (err instanceof SendTransactionError) {
      let logs = "";
      try {
        logs = (await err.getLogs(connection)).join("\n");
      } catch {
        /* ignore */
      }
      const hint =
        /no record of a prior credit/i.test(err.message) ||
        /no record of a prior credit/i.test(logs)
          ? " Treasury has no SOL (or the account was never funded). Fund the treasury with SOL first."
          : "";
      throw new Error(`${err.message}${hint}${logs ? `\nLogs:\n${logs}` : ""}`);
    }
    throw err;
  }
}

export async function getTokenBalance(
  ownerAddress: string,
  mintAddress: string,
): Promise<bigint> {
  const connection = getConnection();
  const mint = new PublicKey(mintAddress);
  const owner = new PublicKey(ownerAddress);
  const ata = getAssociatedTokenAddressSync(mint, owner);
  try {
    const account = await getAccount(connection, ata);
    return account.amount;
  } catch {
    return BigInt(0);
  }
}

export async function getUsdcBalance(ownerAddress: string): Promise<bigint> {
  return getTokenBalance(ownerAddress, config.solana.usdcMint);
}

export async function getUsdtBalance(ownerAddress: string): Promise<bigint> {
  if (!config.solana.usdtMint) return BigInt(0);
  return getTokenBalance(ownerAddress, config.solana.usdtMint);
}

function creditFromTokenBalances(
  tx: NonNullable<
    Awaited<ReturnType<Connection["getParsedTransaction"]>>
  >,
  owner: string,
  mint: string,
): bigint {
  const pre = tx.meta?.preTokenBalances ?? [];
  const post = tx.meta?.postTokenBalances ?? [];
  const preAmt =
    pre.find((b) => b.mint === mint && b.owner === owner)?.uiTokenAmount
      .amount ?? "0";
  const postAmt =
    post.find((b) => b.mint === mint && b.owner === owner)?.uiTokenAmount
      .amount ?? "0";
  const delta = BigInt(postAmt) - BigInt(preAmt);
  return delta > BigInt(0) ? delta : BigInt(0);
}

/**
 * Verify a USDC or USDT deposit into a specific owner (personal deposit or treasury).
 * Credits 1:1 into the site ledger (both are 6-decimal stables on Solana).
 */
export async function verifyStableDepositToOwner(
  signature: string,
  ownerAddress: string,
  expectedMin: bigint,
): Promise<{ credited: bigint; symbol: StableSymbol; mint: string }> {
  const connection = getConnection();
  const tx = await connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });

  if (!tx || tx.meta?.err) {
    throw new Error("Transaction not found or failed");
  }

  const stables = getAcceptedStables();
  for (const stable of stables) {
    let credited = creditFromTokenBalances(tx, ownerAddress, stable.mint);

    if (credited === BigInt(0)) {
      for (const ix of tx.transaction.message.instructions) {
        if (!("parsed" in ix) || !ix.parsed) continue;
        const parsed = ix.parsed as {
          type?: string;
          info?: {
            mint?: string;
            destination?: string;
            amount?: string;
            tokenAmount?: { amount?: string };
          };
        };
        if (parsed.type !== "transfer" && parsed.type !== "transferChecked") {
          continue;
        }
        const info = parsed.info ?? {};
        if (info.mint && info.mint !== stable.mint) continue;
        const amount =
          info.tokenAmount?.amount != null
            ? BigInt(info.tokenAmount.amount)
            : info.amount != null
              ? BigInt(info.amount)
              : BigInt(0);
        const post = tx.meta?.postTokenBalances ?? [];
        const matched = post.some(
          (b) =>
            b.mint === stable.mint &&
            b.owner === ownerAddress &&
            BigInt(b.uiTokenAmount.amount) >= amount,
        );
        if (matched || info.destination === ownerAddress) {
          credited += amount;
        }
      }
    }

    if (credited >= expectedMin) {
      return { credited, symbol: stable.symbol, mint: stable.mint };
    }
  }

  throw new Error(
    "Deposit amount too low or not USDC/USDT sent to your deposit address",
  );
}

/** @deprecated prefer verifyStableDepositToOwner */
export async function verifyUsdcDepositToOwner(
  signature: string,
  ownerAddress: string,
  expectedMin: bigint,
) {
  const { credited } = await verifyStableDepositToOwner(
    signature,
    ownerAddress,
    expectedMin,
  );
  return credited;
}

/** @deprecated prefer verifyStableDepositToOwner with personal address */
export async function verifyUsdcDeposit(signature: string, expectedMin: bigint) {
  const treasury = config.solana.treasuryAddress;
  if (!treasury) {
    throw new Error("Treasury address is not configured");
  }
  return verifyUsdcDepositToOwner(signature, treasury, expectedMin);
}

/**
 * Move a stable (USDC or USDT) from a user deposit wallet → treasury.
 * Treasury pays SOL fees so deposit wallets don't need SOL.
 */
export async function sweepTokenToTreasury(
  depositSecretBs58: string,
  amount: bigint,
  mintAddress: string,
): Promise<string> {
  if (amount <= BigInt(0)) {
    throw new Error("Nothing to sweep");
  }

  const treasury = getTreasuryKeypair();
  if (!treasury) {
    throw new Error("Treasury secret key is not configured");
  }

  const deposit = parseKeypair(depositSecretBs58);
  const connection = getConnection();
  await assertTreasuryCanPayFees(connection, treasury);

  const mint = new PublicKey(mintAddress);
  const fromAta = getAssociatedTokenAddressSync(mint, deposit.publicKey);
  const toAta = getAssociatedTokenAddressSync(mint, treasury.publicKey);

  const fromAccount = await getAccount(connection, fromAta);
  if (fromAccount.amount < amount) {
    throw new Error("Deposit wallet has insufficient tokens to sweep");
  }

  const tx = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(
      treasury.publicKey,
      toAta,
      treasury.publicKey,
      mint,
    ),
    createTransferCheckedInstruction(
      fromAta,
      mint,
      toAta,
      deposit.publicKey,
      amount,
      STABLE_DECIMALS,
      [],
      TOKEN_PROGRAM_ID,
    ),
  );

  return sendAndConfirm(connection, tx, [treasury, deposit]);
}

export async function sweepUsdcToTreasury(
  depositSecretBs58: string,
  amount: bigint,
): Promise<string> {
  return sweepTokenToTreasury(
    depositSecretBs58,
    amount,
    config.solana.usdcMint,
  );
}

export async function sweepUsdtToTreasury(
  depositSecretBs58: string,
  amount: bigint,
): Promise<string> {
  if (!config.solana.usdtMint) {
    throw new Error("USDT mint is not configured");
  }
  return sweepTokenToTreasury(
    depositSecretBs58,
    amount,
    config.solana.usdtMint,
  );
}

/** Sweep every accepted stable sitting on the deposit wallet. */
export async function sweepAllStablesToTreasury(
  depositSecretBs58: string,
  ownerAddress: string,
): Promise<{ swept: bigint; signatures: string[] }> {
  let swept = BigInt(0);
  const signatures: string[] = [];
  for (const stable of getAcceptedStables()) {
    const leftover = await getTokenBalance(ownerAddress, stable.mint);
    if (leftover <= BigInt(0)) continue;
    const sig = await sweepTokenToTreasury(
      depositSecretBs58,
      leftover,
      stable.mint,
    );
    signatures.push(sig);
    swept += leftover;
  }
  return { swept, signatures };
}

function mintForSymbol(symbol: StableSymbol): PublicKey {
  if (symbol === "USDT") {
    const mint = getUsdtMint();
    if (!mint) throw new Error("USDT withdrawals are not configured");
    return mint;
  }
  return getUsdcMint();
}

/** Withdrawals pay USDC or USDT from treasury (ledger is USD-denominated). */
export async function sendStableWithdrawal(
  toAddress: string,
  amount: bigint,
  symbol: StableSymbol = "USDC",
) {
  const payer = getTreasuryKeypair();
  if (!payer) {
    throw new Error("Treasury secret key is not configured");
  }

  const accepted = getAcceptedStables().some((s) => s.symbol === symbol);
  if (!accepted) {
    throw new Error(`${symbol} withdrawals are not enabled`);
  }

  const connection = getConnection();
  await assertTreasuryCanPayFees(connection, payer);

  const mint = mintForSymbol(symbol);
  const destination = new PublicKey(toAddress);
  const fromAta = getAssociatedTokenAddressSync(mint, payer.publicKey);
  const toAta = getAssociatedTokenAddressSync(mint, destination);

  let fromAccount;
  try {
    fromAccount = await getAccount(connection, fromAta);
  } catch {
    throw new Error(
      `Treasury has no ${symbol} token account yet. Deposit/sweep USDC into ${payer.publicKey.toBase58()} first (or send ${symbol} directly to that wallet).`,
    );
  }
  if (fromAccount.amount < amount) {
    throw new Error(`Treasury has insufficient ${symbol}`);
  }

  const tx = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(
      payer.publicKey,
      toAta,
      destination,
      mint,
    ),
    createTransferCheckedInstruction(
      fromAta,
      mint,
      toAta,
      payer.publicKey,
      amount,
      STABLE_DECIMALS,
    ),
  );

  return sendAndConfirm(connection, tx, [payer]);
}

/** @deprecated use sendStableWithdrawal */
export async function sendUsdcWithdrawal(toAddress: string, amount: bigint) {
  return sendStableWithdrawal(toAddress, amount, "USDC");
}
