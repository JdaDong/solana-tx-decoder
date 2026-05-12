import * as anchor from "@coral-xyz/anchor";
import * as SplToken from "@solana/spl-token";
import { Program } from "@coral-xyz/anchor";
import {
  AccountMeta,
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { AveLimitOrder } from "../../target/types/ave_limit_order";
import { RaydiumClmm } from "../../target/types/raydium_clmm";
import { CpAmm } from "../../target/types/meteora_cp_amm";
// import { RaydiumCpSwap } from "../target/types/raydium_cp_swap";

import {
  ORCA_WHIRLPOOL_PROGRAM_ID,
  ORCA_WHIRLPOOLS_CONFIG,
  PDAUtil,
  SwapUtils,
  WhirlpoolContext,
} from "@orca-so/whirlpools-sdk";

import * as wallets from "../wallets";
import { buildLookupTable } from "../wallets";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createSyncNativeInstruction,
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";
import DLMM, { deriveEventAuthority } from "@meteora-ag/dlmm";
import {
  DynamicBondingCurveClient,
  DYNAMIC_BONDING_CURVE_PROGRAM_ID,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import { expect } from "chai";
import {
  getPdaCreatorVault,
  getPdaPlatformVault,
  getPdaTickArrayAddress,
  LaunchpadPool,
  Raydium,
  TICK_ARRAY_SIZE,
  TickUtils,
} from "@raydium-io/raydium-sdk-v2";
import { OnlinePumpSdk } from "@pump-fun/pump-sdk";
import { OnlinePumpAmmSdk } from "@pump-fun/pump-swap-sdk";
import { setTokenBalance } from "../cheatcode";
const { getDefaultOptions, PinPetSdk } = require("pinpet-sdk");

const MARKET_NAME = "Ave.ai";

const SOL = {
  mint: new PublicKey("So11111111111111111111111111111111111111112"),
  decimals: 9,
};

const BondingCurveMint = {
  mint: new PublicKey("Ba6FGApPKEAfuc5pMnLHzQPZiUQDo2bKALpVDcm2iats"),
  decimals: 6,
};
const TEST = {
  mint: new PublicKey("EX84Kv1W7Qd8T3A7CAQV8aocxZuqnAzk7wtTZykupump"),
  decimals: 6,
};

const PINPET_PROGRAM_ID = new PublicKey(
  "CYdRzRacZ5kTc9Ht3U7mFhbsyxG3sZGEzC4cNf2Gjg2W",
);
const PINPET_FEE_RECIPIENT = new PublicKey(
  "CmDe8JRAPJ7QpZNCb4ArVEyzyxYoCNL7WZw5qXLePULn",
);
const PINPET_BASE_FEE_RECIPIENT = new PublicKey(
  "2xhAfEfnH8wg7ZGujSijJi4Zt4ge1ZuwMypo7etntgXA",
);

const PUMP_PROGRAM_ID = new PublicKey(
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
);
const PUMP_GLOBAL = new PublicKey(
  "4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf",
);
const PUMP_FEE_RECIPIENT = new PublicKey(
  "CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM",
);
const PUMP_EVENT_AUTHORITY = new PublicKey(
  "Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1",
);
const METEORA_DAMM_V2_EVENT_AUTHORITY = new PublicKey(
  "3rmHSu74h1ZcmAisVcWerTCiRDQbUrBKmcwptYGjHfet",
);
const PUMP_NOCOIN_BONDING_CURVE = new PublicKey(
  "BiLkiz5D233cbGEXBE6PtFiFjRtwgerCHzjn2GaG4KDb",
);
const PUMP_NOCOIN_ASSOCIATED_BONDING_CURVE = new PublicKey(
  "H6nWWTXdjLv2Sd9C88cusAiG5QCihhu3rqZ6KmF8v5Au",
);
const PUMP_CREATOR = new PublicKey(
  "3JoVyYvZWApaad3QoEmuba1p81pgtp7h2LmoeLkCsPey",
);
const [PUMP_CREATOR_VAULT] = PublicKey.findProgramAddressSync(
  [Buffer.from("creator-vault"), PUMP_CREATOR.toBuffer()],
  PUMP_PROGRAM_ID,
);
const [globalVolumeAccumulator] = PublicKey.findProgramAddressSync(
  [Buffer.from("global_volume_accumulator")],
  PUMP_PROGRAM_ID,
);

const MEMO_PROGRAM = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);

const RENT_SYSVAR = new PublicKey(
  "SysvarRent111111111111111111111111111111111",
);

const meteoraATokenVault = new PublicKey(
  "ETJC2uFGGhgRt9kGWWqhhzFRcapBGx6SDAGECk24oMX1",
);
const meteoraAVaultAuthority = new PublicKey(
  "EJtuJUyXuCoauNYQuh8ZCT1L2UKRnBHuT7YXfJj4B1uf",
);
const meteoraAVaultLp = new PublicKey(
  "GLkagWibgkoLNJ7uL8QeS6pttJKnYA8X1iNUjADpX4o1",
);
const meteoraAVaultLpMint = new PublicKey(
  "E6rLsVzbjzPdrtN8SX4LQWMGz6dtLR4QYVgy9yog7pBi",
);
const meteoraBTokenVault = new PublicKey(
  "HZeLxbZ9uHtSpwZC3LBr4Nubd14iHwz7bRSghRZf5VCG",
);
const meteoraBVaultAuthority = new PublicKey(
  "FERjPVNEa7Udq8CEv68h6tPL46Tq7ieE49HrE2wea3XT",
);
const meteoraBVaultLp = new PublicKey(
  "2rDbxvN67xdA6By4VV9QKHP71npZmVEz6Aocay5GgYTB",
);
const meteoraBVaultLpMint = new PublicKey(
  "FZN7QZ8ZUUAxMPfxYEYkH3cXUASzH8EqA6B4tyCL8f1j",
);
const meteoraProtocolTokenFeeA = new PublicKey(
  "JD8C6i3FTyGyNzehGRFQLE5jg42hLyjH9jUjGqMLRxTw",
);
const meteoraProtocolTokenFeeB = new PublicKey(
  "Ef2e7Yvh2HseQtn5Tg95HDg1H9F4iEcYHLYQD8UJJwpk",
);
const meteoraPool = new PublicKey(
  "88PJWPNq776eV9VoJThMQdDG6htkRKF5kLkDahAPDHaC",
);
const meteoraDynamicAmmProgram = new PublicKey(
  "Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB",
);
const meteoraDynamicAmmv2Program = new PublicKey(
  "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG",
);
const meteoraDLMMProgram = new PublicKey(
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo",
);
const meteoraDBCProgram = new PublicKey(
  "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN",
);
const meteoraVaultProgram = new PublicKey(
  "24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi",
);

const PumpFunAmmProgram = new PublicKey(
  "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
);
const PumpFunAmmSwimsuitToSOLPool = new PublicKey(
  "7Bejzwp1eZgcDHWUz2EoKFNphTLsrWdrrT5qsJosDq4g",
);
const PumpFunAmmGlobalConfig = new PublicKey(
  "ADyA8hdefvWN2dbGGWFotbzWxrAvLW83WG6QCVXvJKqw",
);
const PumpFunAmmPoolBaseTokenAccount = new PublicKey(
  "Bki9jz9QJTkhi95M2ZTcd72YirD66k59RKr1jiSUTm3z",
);
const PumpFunAmmPoolQuoteTokenAccount = new PublicKey(
  "YioE5sPzhn6Jp9dor1cMbzedr2GuWMjBYvHgioLTTfa",
);
const PumpFunAmmProtocolFeeRecipient = new PublicKey(
  "62qc2CNXwrYqQScmEdiZFFAnJR262PxWEuNQtxfafNgV",
);
const PumpFunAmmProtocolFeeTokenAccount = new PublicKey(
  "94qWNrtmfn42h3ZjUZwWvK1MEo9uVmmrBPd2hpNjYDjb",
);
const PumpFunAmmEventAuthority = new PublicKey(
  "GS4CU59F31iL7aR2Q8zVS8DRrcRnXX1yjQ66TqNVQnaR",
);
const coinCreator = new PublicKey(
  "5YEG3uyjvn773VEF2riXocdtkGgas1m2jWishsM3qerj",
);
const [coinVaultAuthority] = PublicKey.findProgramAddressSync(
  [Buffer.from("creator_vault"), coinCreator.toBuffer()],
  PumpFunAmmProgram,
);
const coinCreatorVaultAta = getAssociatedTokenAddressSync(
  SOL.mint,
  coinVaultAuthority,
  true,
);
const [AmmGlobalVolumeAccumulator] = PublicKey.findProgramAddressSync(
  [Buffer.from("global_volume_accumulator")],
  PumpFunAmmProgram,
);
const RaydiumLaunchLabProgram = new PublicKey(
  "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj",
);
const RaydiumLauchLabAuthority = new PublicKey(
  "WLHv2UAZm6z4KyaaELi5pjdbJh6RESMva1Rnn8pJVVh",
);
const RaydiumLauchLabGlobalConfig = new PublicKey(
  "6s1xP3hpbAfFoNtUNF8mfHsjr2Bd97JxFJRWLbL6aHuX",
);
const RaydiumLauchLabPlatformConfig = new PublicKey(
  "FfYek5vEz23cMkWsdJwG2oa6EphsvXSHrGpdALN4g6W1",
);

const aveFulfiller = new PublicKey(
  "B2JHj5w9CCxcktvoUG2J69GeLFaBv5HpZAwuQU3QsgaX",
);
const feeProgram = new PublicKey("pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ");
const pumpfun_amm_fee_config = pumpAmmFeeConfigPda();
const pumpfun_fee_config = pumpFeeConfigPda();

const aveFeeRecipientKeypair = Keypair.generate();
const aveFeeRecipient = aveFeeRecipientKeypair.publicKey;

const thirdFeeRecipientKeypair = Keypair.generate();
const thirdFeeRecipient = thirdFeeRecipientKeypair.publicKey;

describe("ave-limit-order", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.AveLimitOrder as Program<AveLimitOrder>;
  const raydiumClmmProgram = anchor.workspace
    .RaydiumClmm as Program<RaydiumClmm>;

  const MeteoraDAMMv2program = anchor.workspace.MeteoraCpAmm as Program<CpAmm>;
  //  打开program的日志
  // anchor.AnchorProvider.env().connection.onLogs(
  //     program.programId,
  //     (logs) => console.log(logs),
  //     "confirmed"
  // );

  const listener = program.addEventListener("orderEvent", (event) => {
    console.log("✉️Event: ", JSON.stringify(event));
  });

  const [marketAddress] = getMarketAddr(program, MARKET_NAME);
  const wsolVaultAddress = getVaultAddr(marketAddress, SOL.mint);
  const testVaultAddress = getVaultAddr(
    marketAddress,
    TEST.mint,
    TOKEN_2022_PROGRAM_ID,
  );
  const bondingVaultAddress = getVaultAddr(
    marketAddress,
    BondingCurveMint.mint,
    TOKEN_2022_PROGRAM_ID,
  );

  let lookupTableAccount = null;

  it("Prepare account", async () => {
    console.log("Admin: ", wallets.administrator.publicKey.toBase58());
    console.log("Maker: ", wallets.maker.publicKey.toBase58());
    console.log("Fulfiller: ", wallets.fulfiller.publicKey.toBase58());

    await airdrop(
      provider.connection,
      wallets.administrator.publicKey,
      1000 * LAMPORTS_PER_SOL * 5,
    );
    await airdrop(
      provider.connection,
      wallets.fulfiller.publicKey,
      2000 * LAMPORTS_PER_SOL * 5,
    );
    await airdrop(
      provider.connection,
      wallets.maker.publicKey,
      9000 * LAMPORTS_PER_SOL * 5,
    );
    await airdrop(
      provider.connection,
      marketAddress,
      9000 * LAMPORTS_PER_SOL * 5,
    );
    await airdrop(provider.connection, aveFulfiller, 100 * LAMPORTS_PER_SOL);
    await airdrop(
      provider.connection,
      aveFeeRecipient,
      100 * LAMPORTS_PER_SOL * 5,
    );
  });

  it("Create constant lookup table", async () => {
    const lookupTableAccountCreated = await buildLookupTable(
      provider.connection,
      wallets.fulfiller,
      wallets.AVE_CONSTANT_ADDRESSES,
    );
    lookupTableAccount = lookupTableAccountCreated;
    console.log("Lookup table created: ", lookupTableAccount.key.toBase58());
  });

  it("Create market and vault", async () => {
    console.log("Market address: ", marketAddress.toBase58());

    // 市场在 Surfnet/mainnet-sim 快照中可能已存在；如果已存在则忽略错误
    try {
      const createMarketTx = await program.methods
        .createMarket(MARKET_NAME, false)
        .accounts({
          marketAdmin: wallets.administrator.publicKey,
        })
        .signers([wallets.administrator.payer])
        .rpc();
      console.log("Create market tx: ", createMarketTx);
    } catch (e) {
      console.log(
        "Create market tx skipped or failed (maybe already exists):",
        (e as Error).toString(),
      );
    }

    const updateMarketAdminTx = await program.methods
      .updateMarketAdmin()
      .accounts({
        market: marketAddress,
        marketAdmin: wallets.administrator.publicKey,
        newMarketAdmin: wallets.fulfiller.publicKey,
      })
      .signers([wallets.administrator.payer])
      .rpc();
    console.log("Update market admin tx: ", updateMarketAdminTx);

    const updateMarketAdminTx2 = await program.methods
      .updateMarketAdmin()
      .accounts({
        market: marketAddress,
        marketAdmin: wallets.fulfiller.publicKey,
        newMarketAdmin: wallets.administrator.publicKey,
      })
      .signers([wallets.fulfiller.payer])
      .rpc();
    console.log("Update market admin tx 2: ", updateMarketAdminTx2);

    const addFulfillerTx = await program.methods
      .addMarketFulfiller(wallets.fulfiller.publicKey)
      .accounts({
        market: marketAddress,
        marketAdmin: wallets.administrator.publicKey,
      })
      .signers([wallets.administrator.payer])
      .rpc();
    console.log("Add fulfiller tx: ", addFulfillerTx);

    const addFulfillerTx2 = await program.methods
      .addMarketFulfiller(aveFulfiller)
      .accounts({
        market: marketAddress,
        marketAdmin: wallets.administrator.publicKey,
      })
      .signers([wallets.administrator.payer])
      .rpc();

    console.log("Add fulfiller tx 2: ", addFulfillerTx2);

    const marketAccount = await program.account.market.fetch(marketAddress);
    console.log("Created market name: ", marketAccount.name);

    const createWsolVaultTx = await program.methods
      .createMarketTokenVault()
      .accounts({
        market: marketAddress,
        mint: SOL.mint,
        tokenProgram: SplToken.TOKEN_PROGRAM_ID,
        firstVaultUser: wallets.administrator.publicKey,
      })
      .signers([wallets.administrator.payer])
      .rpc();
    console.log("Create WSOL vault tx: ", createWsolVaultTx);

    const createTestVaultTx = await program.methods
      .createMarketTokenVault()
      .accounts({
        market: marketAddress,
        mint: TEST.mint,
        tokenProgram: SplToken.TOKEN_2022_PROGRAM_ID,
        firstVaultUser: wallets.administrator.publicKey,
      })
      .signers([wallets.administrator.payer])
      .rpc();
    console.log("Create NOCOIN vault tx: ", createTestVaultTx);

    const createBonidngVaultTx = await program.methods
      .createMarketTokenVault()
      .accounts({
        market: marketAddress,
        mint: BondingCurveMint.mint,
        tokenProgram: SplToken.TOKEN_2022_PROGRAM_ID,
        firstVaultUser: wallets.administrator.publicKey,
      })
      .signers([wallets.administrator.payer])
      .rpc();
    console.log("Create NOCOIN vault tx: ", createBonidngVaultTx);

    let res1 = await SplToken.getOrCreateAssociatedTokenAccount(
      provider.connection,
      wallets.maker.payer,
      SOL.mint,
      wallets.maker.publicKey,
    );
    console.log("res1: ", res1);
  });

  it("RouteSwap (Pump Bonding curve, SOL -> MILD) and close", async () => {
    const sdk = new OnlinePumpSdk(provider.connection);
    let bondingCurve = await sdk.fetchBondingCurve(BondingCurveMint.mint);
    const defaultMakerInputTokenAccount =
      SplToken.getAssociatedTokenAddressSync(SOL.mint, wallets.maker.publicKey);

    const global = await sdk.fetchGlobal();

    const fulfillerSolTokenAccount = SplToken.getAssociatedTokenAddressSync(
      SOL.mint,
      wallets.maker.publicKey,
    );

    const defaultMakerOutputTokenAccount =
      SplToken.getAssociatedTokenAddressSync(
        BondingCurveMint.mint,
        wallets.maker.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
      );

    let fulfillerBondingCurveTokenAccount =
      await SplToken.getAssociatedTokenAddressSync(
        BondingCurveMint.mint,
        wallets.maker.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
      );
    const mild_pumpFunBondingCurve = new PublicKey(
      "2ot1DdkxS7hj92SqQB772z2WiZmb94UZnGpXTprXbHqu",
    );
    const mild_pumpFunBondingCurveAssociate = new PublicKey(
      "DTWRkYuF6S14TzBMpgyAGDb4EPCceR5JzD5Wmj4LUo8K",
    );

    // const creatorVault = new PublicKey("AqebzoL5FuuAizA9AnkjFoCt2jgrpzCkxJzca5uym263");
    const eventAuthority = PUMP_EVENT_AUTHORITY;
    const feeReceiptant = bondingCurve.isMayhemMode
      ? global.reservedFeeRecipient
      : global.feeRecipient;
    const newFeeReceiptant = new PublicKey(
      "5eHhjP8JaYkz83CWwvGU2uMUXefd3AazWGx4gpcuEEYD",
    );

    const [creatorVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("creator-vault"), bondingCurve.creator.toBuffer()],
      PUMP_PROGRAM_ID,
    );
    console.log("creatorVault: ", creatorVault);

    const PumpFunProgram = new PublicKey(
      "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
    );

    const pumpfunpool = PUMP_GLOBAL;
    const feeRecipientTokenAccount = await getAssociatedTokenAddress(
      SOL.mint,
      aveFeeRecipient,
    );
    const [userVolumeAccumulator] = PumpUserVolumeAccumulatorPda(
      wallets.maker.publicKey,
    );

    const remainingAccounts = [];
    remainingAccounts.push(readOnly(PumpFunProgram)); //0
    remainingAccounts.push(writable(pumpfunpool)); //1
    remainingAccounts.push(writable(feeReceiptant)); //2
    remainingAccounts.push(writable(mild_pumpFunBondingCurve)); //3
    remainingAccounts.push(writable(mild_pumpFunBondingCurveAssociate)); //4
    remainingAccounts.push(writable(creatorVault)); //5
    remainingAccounts.push(writable(eventAuthority)); // 6
    remainingAccounts.push(writable(BondingCurveMint.mint)); //7
    remainingAccounts.push(writable(SOL.mint)); //8
    remainingAccounts.push(writable(fulfillerBondingCurveTokenAccount)); //9
    remainingAccounts.push(writable(fulfillerSolTokenAccount)); //10
    remainingAccounts.push(writable(globalVolumeAccumulator)); //11
    remainingAccounts.push(writable(userVolumeAccumulator)); //12
    remainingAccounts.push(readOnly(pumpfun_fee_config)); //13
    remainingAccounts.push(readOnly(feeProgram)); //14
    const [bonding_curve_v2] = PumpPoolv2Pda(BondingCurveMint.mint);
    remainingAccounts.push(readOnly(bonding_curve_v2)); //14
    console.log("bonding_curve_v2: ", bonding_curve_v2);
    remainingAccounts.push(writable(newFeeReceiptant)); //15
    const instructions = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 800_000 }),
    ];
    const fulfillOrderIx = await program.methods
      .routeSwap(
        {
          amountIn: new anchor.BN("100000000"),
          steps: [
            {
              minAmountOut: new anchor.BN("0"), //new anchor.BN("300145000000"),
              swapType: { pumpfunBondingCurve: {} },
              remainingAccountsCount: 0,
            },
          ],
        },
        true,
        true,
        new anchor.BN("0"),
        new anchor.BN("0"),
      )
      .accounts({
        authority: wallets.maker.publicKey,
        inputTokenAccount: defaultMakerInputTokenAccount,
        outputTokenAccount: defaultMakerOutputTokenAccount,
        inputTokenMint: SOL.mint,
        outputTokenMint: BondingCurveMint.mint,
        feeRecipientAuthority: aveFeeRecipient,
        feeRecipientTokenAccount,
        thirdFeeRecipientAuthority: null,
        thirdFeeRecipientTokenAccount: null,
        memoProgram: MEMO_PROGRAM,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();
    instructions.push(fulfillOrderIx);

    let blockhash = await provider.connection
      .getLatestBlockhash()
      .then((res) => res.blockhash);

    const messageV0 = new TransactionMessage({
      payerKey: wallets.maker.publicKey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message([lookupTableAccount]);

    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([wallets.maker.payer]);

    const before_sol = await provider.connection.getAccountInfo(
      wallets.maker.publicKey,
    );
    console.log("before: ", before_sol.lamports);

    const signature = await provider.connection.sendTransaction(transaction, {
      skipPreflight: true,
    });
    console.log("route swap (Pump Bonding curve, SOL -> MILD): ", signature);
    await provider.connection.confirmTransaction(signature);

    const after_sol = await provider.connection.getAccountInfo(
      wallets.maker.publicKey,
    );
    console.log("after: ", after_sol.lamports);
    console.log("sub:", after_sol.lamports - before_sol.lamports);
  });

  it("RouteSwap (Pump Bonding curve, MILD -> SOL) and close", async () => {
    const sdk = new OnlinePumpSdk(provider.connection);
    const bondingCurve = await sdk.fetchBondingCurve(BondingCurveMint.mint);
    const global = await sdk.fetchGlobal();
    const defaultMakerOutputTokenAccount =
      SplToken.getAssociatedTokenAddressSync(SOL.mint, wallets.maker.publicKey);

    const fulfillerSolTokenAccount = SplToken.getAssociatedTokenAddressSync(
      SOL.mint,
      wallets.maker.publicKey,
    );

    const defaultMakerInputTokenAccount =
      SplToken.getAssociatedTokenAddressSync(
        BondingCurveMint.mint,
        wallets.maker.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
      );

    const ata = await SplToken.getAccount(
      provider.connection,
      defaultMakerInputTokenAccount,
      null,
      TOKEN_2022_PROGRAM_ID,
    );
    console.log("darklake amount", ata.amount);
    console.log("account", ata.address);

    let fulfillerBondingCurveTokenAccount =
      await SplToken.getAssociatedTokenAddressSync(
        BondingCurveMint.mint,
        wallets.maker.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
      );

    const mild_pumpFunBondingCurve = new PublicKey(
      "2ot1DdkxS7hj92SqQB772z2WiZmb94UZnGpXTprXbHqu",
    );
    const mild_pumpFunBondingCurveAssociate = new PublicKey(
      "DTWRkYuF6S14TzBMpgyAGDb4EPCceR5JzD5Wmj4LUo8K",
    );

    // const creatorVault = new PublicKey("AqebzoL5FuuAizA9AnkjFoCt2jgrpzCkxJzca5uym263");
    const eventAuthority = PUMP_EVENT_AUTHORITY;
    const feeReceiptant = bondingCurve.isMayhemMode
      ? global.reservedFeeRecipient
      : global.feeRecipient;
    console.log("feeReceiptant: ", feeReceiptant);

    const creator = bondingCurve.creator;
    console.log("creator:", creator);

    const [creatorVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("creator-vault"), creator.toBuffer()],
      PUMP_PROGRAM_ID,
    );
    console.log("creatorVault: ", creatorVault);
    const newFeeReceiptant = new PublicKey(
      "5eHhjP8JaYkz83CWwvGU2uMUXefd3AazWGx4gpcuEEYD",
    );

    const PumpFunProgram = new PublicKey(
      "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
    );

    console.log("global: ", global);
    console.log("bonding curve: ", bondingCurve);

    const pumpfunpool = PUMP_GLOBAL;
    const feeRecipientTokenAccount = await getAssociatedTokenAddress(
      BondingCurveMint.mint,
      aveFeeRecipient,
      false,
      TOKEN_2022_PROGRAM_ID,
    );
    const [userVolumeAccumulator] = PumpUserVolumeAccumulatorPda(
      wallets.maker.publicKey,
    );

    const remainingAccounts = [];
    remainingAccounts.push(readOnly(PumpFunProgram)); //0
    remainingAccounts.push(writable(pumpfunpool)); //1
    remainingAccounts.push(writable(feeReceiptant)); //2
    remainingAccounts.push(writable(mild_pumpFunBondingCurve)); //3
    remainingAccounts.push(writable(mild_pumpFunBondingCurveAssociate)); //4
    remainingAccounts.push(writable(creatorVault)); //5
    remainingAccounts.push(writable(eventAuthority)); // 6
    remainingAccounts.push(writable(BondingCurveMint.mint)); //7
    remainingAccounts.push(writable(SOL.mint)); //8
    remainingAccounts.push(writable(fulfillerBondingCurveTokenAccount)); //9
    remainingAccounts.push(writable(fulfillerSolTokenAccount)); //10
    remainingAccounts.push(writable(globalVolumeAccumulator)); //11
    remainingAccounts.push(writable(userVolumeAccumulator)); //12
    remainingAccounts.push(readOnly(pumpfun_fee_config));
    remainingAccounts.push(readOnly(feeProgram));
    const [bonding_curve_v2] = PumpPoolv2Pda(BondingCurveMint.mint);
    remainingAccounts.push(readOnly(bonding_curve_v2)); //14
    remainingAccounts.push(writable(newFeeReceiptant)); //15
    const instructions = [
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 1000000, // 单位是 micro-lamports (1e-6 lamports)，5000 = 0.005 lamports
      }),
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    ];
    const fulfillOrderIx = await program.methods
      .routeSwap(
        {
          amountIn: new anchor.BN(ata.amount),
          steps: [
            {
              minAmountOut: new anchor.BN("0"), //new anchor.BN("300145000000"),
              swapType: { pumpfunBondingCurve: {} },
              remainingAccountsCount: 0,
            },
          ],
        },
        true,
        true,
        new anchor.BN("0"),
        new anchor.BN("0"),
      )
      .accounts({
        authority: wallets.maker.publicKey,
        inputTokenAccount: defaultMakerInputTokenAccount,
        outputTokenAccount: defaultMakerOutputTokenAccount,
        inputTokenMint: BondingCurveMint.mint,
        outputTokenMint: SOL.mint,
        feeRecipientAuthority: aveFeeRecipient,
        feeRecipientTokenAccount,
        thirdFeeRecipientAuthority: null,
        thirdFeeRecipientTokenAccount: null,
        memoProgram: MEMO_PROGRAM,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();
    instructions.push(fulfillOrderIx);

    let blockhash = await provider.connection
      .getLatestBlockhash()
      .then((res) => res.blockhash);

    const messageV0 = new TransactionMessage({
      payerKey: wallets.maker.publicKey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message([lookupTableAccount]);

    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([wallets.maker.payer]);

    const before_sol = await provider.connection.getAccountInfo(
      wallets.maker.publicKey,
    );
    console.log("before: ", before_sol.lamports);

    const signature = await provider.connection.sendTransaction(transaction, {
      skipPreflight: true,
    });
    console.log("route swap (Pump Bonding curve, MILD -> SOL): ", signature);
    await provider.connection.confirmTransaction(signature);

    const after_sol = await provider.connection.getAccountInfo(
      wallets.maker.publicKey,
    );
    console.log("after: ", after_sol.lamports);
    console.log("sub:", after_sol.lamports - before_sol.lamports);
  });

  it("RouteSwap (Pump AMM, SOL -> TEST)", async () => {
    const makerInputTokenAccount = await SplToken.getAssociatedTokenAddressSync(
      SOL.mint,
      wallets.maker.publicKey,
    );

    // const pool = new PublicKey("mi8MvjigM67XMDehjWXz5QKPebQNPLFpoNzX6RQHVYJ");
    const pool = new PublicKey("218gaMJkJUkzPrfax8vEYKtpm3aj9dHUvYcnRnvKbLLp");
    const sdk = new OnlinePumpAmmSdk(provider.connection);
    const poolObject = await sdk.fetchPool(pool);
    const globalConfig = await sdk.fetchGlobalConfigAccount();

    const PumpFunAmmPoolBaseTokenAccount = poolObject.poolBaseTokenAccount;
    const PumpFunAmmPoolQuoteTokenAccount = poolObject.poolQuoteTokenAccount;
    const PumpFunAmmProtocolFeeRecipient = poolObject.isMayhemMode
      ? globalConfig.reservedFeeRecipient
      : globalConfig.protocolFeeRecipients[0];

    console.log("fee recipient: ", globalConfig.protocolFeeRecipients);
    console.log("fee recipient: ", globalConfig.reservedFeeRecipient);
    console.log("global config: ", globalConfig);
    console.log("pool: ", poolObject);
    console.log(
      "PumpFunAmmProtocolFeeRecipient: ",
      PumpFunAmmProtocolFeeRecipient,
    );

    const PumpFunAmmProtocolFeeTokenAccount =
      SplToken.getAssociatedTokenAddressSync(
        SOL.mint,
        PumpFunAmmProtocolFeeRecipient,
        true,
      );

    const makerOutputTokenAccount = SplToken.getAssociatedTokenAddressSync(
      TEST.mint,
      wallets.maker.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
    );

    const fulfillerInputTokenAccount = SplToken.getAssociatedTokenAddressSync(
      SOL.mint,
      wallets.maker.publicKey,
    );
    const [userVolumeAccumulator] = AmmUserVolumeAccumulatorPda(
      wallets.maker.publicKey,
    );

    const [coinVaultAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("creator_vault"), poolObject.coinCreator.toBuffer()],
      PumpFunAmmProgram,
    );
    const coinCreatorVaultAta = getAssociatedTokenAddressSync(
      SOL.mint,
      coinVaultAuthority,
      true,
    );
    console.log("coinVaultAuthority: ", coinVaultAuthority);
    console.log("coinCreatorVaultAta: ", coinCreatorVaultAta);

    const new_fee_recipient = new PublicKey(
      "EHAAiTxcdDwQ3U4bU6YcMsQGaekdzLS3B5SmYo46kJtL",
    );
    const quoteMintForFeeRecipient = getAssociatedTokenAddressSync(
      poolObject.quoteMint,
      new_fee_recipient,
      true,
    );

    const remainingAccounts = [];

    remainingAccounts.push(readOnly(PumpFunAmmProgram));

    remainingAccounts.push(writable(pool));
    remainingAccounts.push(writable(PumpFunAmmGlobalConfig));
    remainingAccounts.push(writable(TEST.mint));
    remainingAccounts.push(writable(SOL.mint));
    remainingAccounts.push(writable(PumpFunAmmPoolBaseTokenAccount));
    remainingAccounts.push(writable(PumpFunAmmPoolQuoteTokenAccount));
    remainingAccounts.push(writable(PumpFunAmmProtocolFeeRecipient));
    remainingAccounts.push(writable(PumpFunAmmProtocolFeeTokenAccount));
    remainingAccounts.push(writable(PumpFunAmmEventAuthority));
    remainingAccounts.push(writable(coinCreatorVaultAta));
    remainingAccounts.push(readOnly(coinVaultAuthority));
    remainingAccounts.push(writable(fulfillerInputTokenAccount));
    remainingAccounts.push(writable(AmmGlobalVolumeAccumulator));
    remainingAccounts.push(writable(userVolumeAccumulator));
    remainingAccounts.push(readOnly(pumpfun_amm_fee_config));
    remainingAccounts.push(readOnly(feeProgram));

    const [userVolumeAccumulatorAta] = PublicKey.findProgramAddressSync(
      [
        userVolumeAccumulator.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        SOL.mint.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    const [pool_v2] = PumpAmmPoolv2Pda(TEST.mint);
    console.log("pool_v2: ", pool_v2);
    remainingAccounts.push(readOnly(pool_v2));
    remainingAccounts.push(writable(userVolumeAccumulatorAta));

    remainingAccounts.push(writable(new_fee_recipient));
    remainingAccounts.push(writable(quoteMintForFeeRecipient));

    const feeRecipientTokenAccount = await getAssociatedTokenAddress(
      SOL.mint,
      aveFeeRecipient,
    );

    const lookupTableAccount = await buildLookupTable(
      provider.connection,
      wallets.fulfiller,
      [
        SOL.mint,
        MEMO_PROGRAM,
        SplToken.TOKEN_PROGRAM_ID,
        SplToken.TOKEN_2022_PROGRAM_ID,
        feeRecipientTokenAccount,
        marketAddress,
      ],
    );

    const instructions = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    ];
    const swapIx = await program.methods
      .routeSwap(
        {
          amountIn: new anchor.BN("100000000"),
          steps: [
            {
              minAmountOut: new anchor.BN("1"), //new anchor.BN("300145000000"),
              swapType: { pumpFunAmm: {} },
              remainingAccountsCount: 0,
            },
          ],
        },
        true,
        true,
        new anchor.BN("100"),
        new anchor.BN("100"),
      )
      .accounts({
        authority: wallets.maker.publicKey,
        inputTokenAccount: makerInputTokenAccount,
        outputTokenAccount: makerOutputTokenAccount,
        inputTokenMint: SOL.mint,
        outputTokenMint: TEST.mint,
        feeRecipientAuthority: aveFeeRecipient,
        feeRecipientTokenAccount,
        thirdFeeRecipientAuthority: null,
        thirdFeeRecipientTokenAccount: null,
        memoProgram: MEMO_PROGRAM,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();
    instructions.push(swapIx);

    let blockhash = await provider.connection
      .getLatestBlockhash()
      .then((res) => res.blockhash);

    const messageV0 = new TransactionMessage({
      payerKey: wallets.maker.publicKey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message([lookupTableAccount]);

    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([wallets.maker.payer]);

    const signature = await provider.connection.sendTransaction(transaction, {
      skipPreflight: true,
    });
    console.log("route swap (Pump AMM, SOL -> TEST): ", signature);
    await provider.connection.confirmTransaction(signature);

    const expect_amount = (BigInt(100000000) * BigInt(100)) / BigInt(10000);
    console.log("expect input fee", expect_amount);
  });

  it("RouteSwap (Pump AMM, TEST -> SOL)", async () => {
    const makerOutputTokenAccount =
      await SplToken.getAssociatedTokenAddressSync(
        SOL.mint,
        wallets.maker.publicKey,
      );

    // const pool = new PublicKey("mi8MvjigM67XMDehjWXz5QKPebQNPLFpoNzX6RQHVYJ");
    const pool = new PublicKey("218gaMJkJUkzPrfax8vEYKtpm3aj9dHUvYcnRnvKbLLp");
    const sdk = new OnlinePumpAmmSdk(provider.connection);
    const poolObject = await sdk.fetchPool(pool);
    const globalConfig = await sdk.fetchGlobalConfigAccount();

    const PumpFunAmmPoolBaseTokenAccount = poolObject.poolBaseTokenAccount;
    const PumpFunAmmPoolQuoteTokenAccount = poolObject.poolQuoteTokenAccount;
    const PumpFunAmmProtocolFeeRecipient = poolObject.isMayhemMode
      ? globalConfig.reservedFeeRecipient
      : globalConfig.protocolFeeRecipients[0];

    console.log("fee recipient: ", globalConfig.protocolFeeRecipients);
    console.log("fee recipient: ", globalConfig.reservedFeeRecipient);
    console.log("global config: ", globalConfig);
    console.log("pool: ", poolObject);
    console.log(
      "PumpFunAmmProtocolFeeRecipient: ",
      PumpFunAmmProtocolFeeRecipient,
    );

    const PumpFunAmmProtocolFeeTokenAccount =
      SplToken.getAssociatedTokenAddressSync(
        SOL.mint,
        PumpFunAmmProtocolFeeRecipient,
        true,
      );

    const makerInputTokenAccount = SplToken.getAssociatedTokenAddressSync(
      TEST.mint,
      wallets.maker.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
    );

    const fulfillerInputTokenAccount = SplToken.getAssociatedTokenAddressSync(
      TEST.mint,
      wallets.maker.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
    );
    const [userVolumeAccumulator] = AmmUserVolumeAccumulatorPda(
      wallets.maker.publicKey,
    );

    const [coinVaultAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("creator_vault"), poolObject.coinCreator.toBuffer()],
      PumpFunAmmProgram,
    );
    const coinCreatorVaultAta = getAssociatedTokenAddressSync(
      SOL.mint,
      coinVaultAuthority,
      true,
    );
    console.log("coinVaultAuthority: ", coinVaultAuthority);
    console.log("coinCreatorVaultAta: ", coinCreatorVaultAta);

    const new_fee_recipient = new PublicKey(
      "EHAAiTxcdDwQ3U4bU6YcMsQGaekdzLS3B5SmYo46kJtL",
    );
    const quoteMintForFeeRecipient = getAssociatedTokenAddressSync(
      poolObject.quoteMint,
      new_fee_recipient,
      true,
    );

    const [userVolumeAccumulatorAta] = PublicKey.findProgramAddressSync(
      [
        userVolumeAccumulator.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        SOL.mint.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    const [pool_v2] = PumpAmmPoolv2Pda(TEST.mint);
    console.log("pool_v2: ", pool_v2);

    const remainingAccounts = [];

    remainingAccounts.push(readOnly(PumpFunAmmProgram));

    remainingAccounts.push(writable(pool));
    remainingAccounts.push(writable(PumpFunAmmGlobalConfig));
    remainingAccounts.push(writable(TEST.mint));
    remainingAccounts.push(writable(SOL.mint));
    remainingAccounts.push(writable(PumpFunAmmPoolBaseTokenAccount));
    remainingAccounts.push(writable(PumpFunAmmPoolQuoteTokenAccount));
    remainingAccounts.push(writable(PumpFunAmmProtocolFeeRecipient));
    remainingAccounts.push(writable(PumpFunAmmProtocolFeeTokenAccount));
    remainingAccounts.push(writable(PumpFunAmmEventAuthority));
    remainingAccounts.push(writable(coinCreatorVaultAta));
    remainingAccounts.push(readOnly(coinVaultAuthority));
    remainingAccounts.push(writable(fulfillerInputTokenAccount));
    remainingAccounts.push(writable(AmmGlobalVolumeAccumulator));
    remainingAccounts.push(writable(userVolumeAccumulator));
    remainingAccounts.push(readOnly(pumpfun_amm_fee_config));
    remainingAccounts.push(readOnly(feeProgram));
    remainingAccounts.push(readOnly(pool_v2));
    remainingAccounts.push(writable(userVolumeAccumulatorAta));
    remainingAccounts.push(writable(new_fee_recipient));
    remainingAccounts.push(writable(quoteMintForFeeRecipient));

    const feeRecipientTokenAccount = await getAssociatedTokenAddress(
      TEST.mint,
      aveFeeRecipient,
      false,
      TOKEN_2022_PROGRAM_ID,
    );
    const lookupTableAccount = await buildLookupTable(
      provider.connection,
      wallets.fulfiller,
      [
        SOL.mint,
        MEMO_PROGRAM,
        SplToken.TOKEN_PROGRAM_ID,
        SplToken.TOKEN_2022_PROGRAM_ID,
        feeRecipientTokenAccount,
        marketAddress,
      ],
    );
    const ata = await SplToken.getAccount(
      provider.connection,
      makerInputTokenAccount,
      null,
      TOKEN_2022_PROGRAM_ID,
    );

    const instructions = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    ];
    const swapIx = await program.methods
      .routeSwap(
        {
          amountIn: new anchor.BN(ata.amount),
          steps: [
            {
              minAmountOut: new anchor.BN("0"), //new anchor.BN("300145000000"),
              swapType: { pumpFunAmm: {} },
              remainingAccountsCount: 0,
            },
          ],
        },
        true,
        true,
        new anchor.BN("100"),
        new anchor.BN("100"),
      )
      .accounts({
        authority: wallets.maker.publicKey,
        inputTokenAccount: makerInputTokenAccount,
        outputTokenAccount: makerOutputTokenAccount,
        inputTokenMint: TEST.mint,
        outputTokenMint: SOL.mint,
        feeRecipientAuthority: aveFeeRecipient,
        feeRecipientTokenAccount,
        thirdFeeRecipientAuthority: null,
        thirdFeeRecipientTokenAccount: null,
        memoProgram: MEMO_PROGRAM,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();
    instructions.push(swapIx);

    let blockhash = await provider.connection
      .getLatestBlockhash()
      .then((res) => res.blockhash);

    const messageV0 = new TransactionMessage({
      payerKey: wallets.maker.publicKey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message([lookupTableAccount]);

    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([wallets.maker.payer]);

    const signature = await provider.connection.sendTransaction(transaction, {
      skipPreflight: true,
    });
    console.log("route swap (Pump AMM, TEST -> SOL): ", signature);
    await provider.connection.confirmTransaction(signature);

    const expect_amount = (BigInt(100000000) * BigInt(100)) / BigInt(10000);
    console.log("expect input fee", expect_amount);
  });

  it("Fulfill Order Via RouteSwap (PumpFunAmm SOL -> TEST)", async () => {
    const { timestampMs, orderAddr } = generateNewOrderIdAndAddr(
      program,
      marketAddress,
      wallets.maker.publicKey,
    );

    const ordermakerOutputTokenAccount =
      await SplToken.getAssociatedTokenAddressSync(
        TEST.mint,
        wallets.maker.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
      );

    const ordermakerInputTokenAccount = SplToken.getAssociatedTokenAddressSync(
      SOL.mint,
      wallets.maker.publicKey,
    );

    const createOrderTx = await program.methods
      .createOrder(
        timestampMs,
        new anchor.BN("100000000"),
        new anchor.BN("1"),
        new anchor.BN(Date.now())
          .div(new anchor.BN(1000))
          .add(new anchor.BN(1111)),
        new anchor.BN(0),
        new anchor.BN(0),
        new anchor.BN("10000000"),
        true,
      )
      .accounts({
        market: marketAddress,
        inputMint: SOL.mint,
        outputMint: TEST.mint,
        inputTokenProgram: SplToken.TOKEN_PROGRAM_ID,
        outputTokenProgram: SplToken.TOKEN_2022_PROGRAM_ID,
        inputTokenVault: wsolVaultAddress,
        makerInputTokenAccount: ordermakerInputTokenAccount,
        makerOutputTokenAccount: ordermakerOutputTokenAccount,
        maker: wallets.maker.publicKey,
        fulfiller: wallets.fulfiller.publicKey,
      })
      .signers([wallets.maker.payer, wallets.fulfiller.payer])
      .rpc();

    //buy
    {
      // const pool = new PublicKey("mi8MvjigM67XMDehjWXz5QKPebQNPLFpoNzX6RQHVYJ");
      const pool = new PublicKey(
        "218gaMJkJUkzPrfax8vEYKtpm3aj9dHUvYcnRnvKbLLp",
      );
      const sdk = new OnlinePumpAmmSdk(provider.connection);
      const poolObject = await sdk.fetchPool(pool);
      const globalConfig = await sdk.fetchGlobalConfigAccount();

      const PumpFunAmmPoolBaseTokenAccount = poolObject.poolBaseTokenAccount;
      const PumpFunAmmPoolQuoteTokenAccount = poolObject.poolQuoteTokenAccount;
      const PumpFunAmmProtocolFeeRecipient = poolObject.isMayhemMode
        ? globalConfig.reservedFeeRecipient
        : globalConfig.protocolFeeRecipients[0];

      console.log("fee recipient: ", globalConfig.protocolFeeRecipients);
      console.log("fee recipient: ", globalConfig.reservedFeeRecipient);
      console.log("global config: ", globalConfig);
      console.log("pool: ", poolObject);
      console.log(
        "PumpFunAmmProtocolFeeRecipient: ",
        PumpFunAmmProtocolFeeRecipient,
      );

      const PumpFunAmmProtocolFeeTokenAccount =
        SplToken.getAssociatedTokenAddressSync(
          SOL.mint,
          PumpFunAmmProtocolFeeRecipient,
          true,
        );

      const makerInputTokenAccount = SplToken.getAssociatedTokenAddressSync(
        TEST.mint,
        wallets.maker.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
      );

      const fulfillerInputTokenAccount = SplToken.getAssociatedTokenAddressSync(
        SOL.mint,
        wallets.fulfiller.publicKey,
      );
      const [userVolumeAccumulator] = AmmUserVolumeAccumulatorPda(
        wallets.fulfiller.publicKey,
      );

      const [coinVaultAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("creator_vault"), poolObject.coinCreator.toBuffer()],
        PumpFunAmmProgram,
      );
      const coinCreatorVaultAta = getAssociatedTokenAddressSync(
        SOL.mint,
        coinVaultAuthority,
        true,
      );
      console.log("coinVaultAuthority: ", coinVaultAuthority);
      console.log("coinCreatorVaultAta: ", coinCreatorVaultAta);

      const new_fee_recipient = new PublicKey(
        "EHAAiTxcdDwQ3U4bU6YcMsQGaekdzLS3B5SmYo46kJtL",
      );
      const quoteMintForFeeRecipient = getAssociatedTokenAddressSync(
        poolObject.quoteMint,
        new_fee_recipient,
        true,
      );

      const [userVolumeAccumulatorAta] = PublicKey.findProgramAddressSync(
        [
          userVolumeAccumulator.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          SOL.mint.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );
      const [pool_v2] = PumpAmmPoolv2Pda(TEST.mint);
      console.log("pool_v2: ", pool_v2);

      const remainingAccounts = [];

      remainingAccounts.push(readOnly(PumpFunAmmProgram));

      remainingAccounts.push(writable(pool));
      remainingAccounts.push(writable(PumpFunAmmGlobalConfig));
      remainingAccounts.push(writable(TEST.mint));
      remainingAccounts.push(writable(SOL.mint));
      remainingAccounts.push(writable(PumpFunAmmPoolBaseTokenAccount));
      remainingAccounts.push(writable(PumpFunAmmPoolQuoteTokenAccount));
      remainingAccounts.push(writable(PumpFunAmmProtocolFeeRecipient));
      remainingAccounts.push(writable(PumpFunAmmProtocolFeeTokenAccount));
      remainingAccounts.push(writable(PumpFunAmmEventAuthority));
      remainingAccounts.push(writable(coinCreatorVaultAta));
      remainingAccounts.push(readOnly(coinVaultAuthority));
      remainingAccounts.push(writable(fulfillerInputTokenAccount));
      remainingAccounts.push(writable(AmmGlobalVolumeAccumulator));
      remainingAccounts.push(writable(userVolumeAccumulator));
      remainingAccounts.push(readOnly(pumpfun_amm_fee_config));
      remainingAccounts.push(readOnly(feeProgram));
      remainingAccounts.push(readOnly(pool_v2));
      remainingAccounts.push(writable(userVolumeAccumulatorAta));
      remainingAccounts.push(writable(new_fee_recipient));
      remainingAccounts.push(writable(quoteMintForFeeRecipient));

      const orderTempOutputVault = SplToken.getAssociatedTokenAddressSync(
        TEST.mint,
        marketAddress,
        true,
        TOKEN_2022_PROGRAM_ID,
      );

      const feeRecipientTokenAccount = await getAssociatedTokenAddress(
        TEST.mint,
        aveFeeRecipient,
        false,
        TOKEN_2022_PROGRAM_ID,
      );
      console.log("feeRecipientTokenAccount: ", feeRecipientTokenAccount);

      const instructions = [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      ];
      const swapIx = await program.methods
        .fulfillOrderViaRouteSwap(
          [
            {
              minAmountOut: new anchor.BN("1"),
              swapType: { pumpFunAmm: {} },
              remainingAccountsCount: 0,
            },
          ],
          null,
          true,
          0,
          0,
        )
        .accounts({
          fulfiller: wallets.fulfiller.publicKey,
          market: marketAddress,
          maker: wallets.maker.publicKey,
          order: orderAddr,
          orderMakerOutputTokenAccount: ordermakerOutputTokenAccount,
          orderInputTokenVault: wsolVaultAddress,
          orderUnwrapSolTempTokenAccount: null,
          orderTempOutputVault,
          feeRecipientTokenAccount,
          feeRecipientAuthority: aveFeeRecipient,
          thirdFeeRecipientAuthority: null,
          thirdFeeRecipientTokenAccount: null,
          outputTokenMint: TEST.mint,
          inputTokenMint: SOL.mint,
          memoProgram: MEMO_PROGRAM,
        })
        .remainingAccounts(remainingAccounts)
        .instruction();

      instructions.push(swapIx);

      const lookupTableAccount = await buildLookupTable(
        provider.connection,
        wallets.fulfiller,
        [
          TEST.mint,
          SOL.mint,
          MEMO_PROGRAM,
          SplToken.TOKEN_PROGRAM_ID,
          SplToken.TOKEN_2022_PROGRAM_ID,
          feeRecipientTokenAccount,
          marketAddress,
        ],
      );

      let blockhash = await provider.connection
        .getLatestBlockhash()
        .then((res) => res.blockhash);

      const messageV0 = new TransactionMessage({
        payerKey: wallets.fulfiller.publicKey,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message([lookupTableAccount]);

      const transaction = new VersionedTransaction(messageV0);
      transaction.sign([wallets.fulfiller.payer]);

      const signature = await provider.connection.sendTransaction(transaction, {
        skipPreflight: true,
      });
      console.log(
        "Fulfill Order Via RouteSwap (PumpFunAmm SOL -> TEST): ",
        signature,
      );
      await provider.connection.confirmTransaction(signature);

      const closeOrderTx = await program.methods
        .closeOrder()
        .accounts({
          fulfiller: wallets.fulfiller.publicKey,
          order: orderAddr,
          maker: wallets.maker.publicKey,
          market: marketAddress,
        })
        .signers([wallets.fulfiller.payer])
        .rpc();

      console.log("Close order (SOL -> SQUEEZE) tx: ", closeOrderTx);
    }
  });

  it("Fulfill Order Via RouteSwap (PumpFunAmm TEST -> SOL)", async () => {
    await program.methods
      .createMarketTokenVault()
      .accounts({
        market: marketAddress,
        mint: TEST.mint,
        tokenProgram: SplToken.TOKEN_2022_PROGRAM_ID,
        firstVaultUser: wallets.administrator.publicKey,
      })
      .signers([wallets.administrator.payer])
      .rpc();

    const { timestampMs, orderAddr } = generateNewOrderIdAndAddr(
      program,
      marketAddress,
      wallets.maker.publicKey,
    );

    const ordermakerInputTokenAccount =
      await SplToken.getAssociatedTokenAddressSync(
        TEST.mint,
        wallets.maker.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
      );

    const ordermakerOutputTokenAccount = SplToken.getAssociatedTokenAddressSync(
      SOL.mint,
      wallets.maker.publicKey,
    );

    const createOrderTx = await program.methods
      .createOrder(
        timestampMs,
        new anchor.BN("100000000"),
        new anchor.BN("1"),
        new anchor.BN(Date.now())
          .div(new anchor.BN(1000))
          .add(new anchor.BN(1111)),
        new anchor.BN(0),
        new anchor.BN(0),
        new anchor.BN("10000000"),
        true,
      )
      .accounts({
        market: marketAddress,
        inputMint: TEST.mint,
        outputMint: SOL.mint,
        inputTokenProgram: SplToken.TOKEN_2022_PROGRAM_ID,
        outputTokenProgram: SplToken.TOKEN_PROGRAM_ID,
        inputTokenVault: testVaultAddress,
        makerInputTokenAccount: ordermakerInputTokenAccount,
        makerOutputTokenAccount: ordermakerOutputTokenAccount,
        maker: wallets.maker.publicKey,
        fulfiller: wallets.fulfiller.publicKey,
      })
      .signers([wallets.maker.payer, wallets.fulfiller.payer])
      .rpc();

    //buy
    {
      const pool = new PublicKey(
        "218gaMJkJUkzPrfax8vEYKtpm3aj9dHUvYcnRnvKbLLp",
      );
      const sdk = new OnlinePumpAmmSdk(provider.connection);
      const poolObject = await sdk.fetchPool(pool);
      const globalConfig = await sdk.fetchGlobalConfigAccount();

      const PumpFunAmmPoolBaseTokenAccount = poolObject.poolBaseTokenAccount;
      const PumpFunAmmPoolQuoteTokenAccount = poolObject.poolQuoteTokenAccount;
      const PumpFunAmmProtocolFeeRecipient = poolObject.isMayhemMode
        ? globalConfig.reservedFeeRecipient
        : globalConfig.protocolFeeRecipients[0];

      console.log("fee recipient: ", globalConfig.protocolFeeRecipients);
      console.log("fee recipient: ", globalConfig.reservedFeeRecipient);
      console.log("global config: ", globalConfig);
      console.log("pool: ", poolObject);
      console.log(
        "PumpFunAmmProtocolFeeRecipient: ",
        PumpFunAmmProtocolFeeRecipient,
      );

      const PumpFunAmmProtocolFeeTokenAccount =
        SplToken.getAssociatedTokenAddressSync(
          SOL.mint,
          PumpFunAmmProtocolFeeRecipient,
          true,
        );

      const makerInputTokenAccount = SplToken.getAssociatedTokenAddressSync(
        TEST.mint,
        wallets.maker.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
      );

      const fulfillerInputTokenAccount = SplToken.getAssociatedTokenAddressSync(
        TEST.mint,
        wallets.fulfiller.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
      );
      const [userVolumeAccumulator] = AmmUserVolumeAccumulatorPda(
        wallets.fulfiller.publicKey,
      );

      const [coinVaultAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("creator_vault"), poolObject.coinCreator.toBuffer()],
        PumpFunAmmProgram,
      );
      const coinCreatorVaultAta = getAssociatedTokenAddressSync(
        SOL.mint,
        coinVaultAuthority,
        true,
      );
      console.log("coinVaultAuthority: ", coinVaultAuthority);
      console.log("coinCreatorVaultAta: ", coinCreatorVaultAta);

      const new_fee_recipient = new PublicKey(
        "EHAAiTxcdDwQ3U4bU6YcMsQGaekdzLS3B5SmYo46kJtL",
      );
      const quoteMintForFeeRecipient = getAssociatedTokenAddressSync(
        poolObject.quoteMint,
        new_fee_recipient,
        true,
      );

      const [userVolumeAccumulatorAta] = PublicKey.findProgramAddressSync(
        [
          userVolumeAccumulator.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          SOL.mint.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );
      const [pool_v2] = PumpAmmPoolv2Pda(TEST.mint);
      console.log("pool_v2: ", pool_v2);

      const remainingAccounts = [];

      remainingAccounts.push(readOnly(PumpFunAmmProgram));

      remainingAccounts.push(writable(pool));
      remainingAccounts.push(writable(PumpFunAmmGlobalConfig));
      remainingAccounts.push(writable(TEST.mint));
      remainingAccounts.push(writable(SOL.mint));
      remainingAccounts.push(writable(PumpFunAmmPoolBaseTokenAccount));
      remainingAccounts.push(writable(PumpFunAmmPoolQuoteTokenAccount));
      remainingAccounts.push(writable(PumpFunAmmProtocolFeeRecipient));
      remainingAccounts.push(writable(PumpFunAmmProtocolFeeTokenAccount));
      remainingAccounts.push(writable(PumpFunAmmEventAuthority));
      remainingAccounts.push(writable(coinCreatorVaultAta));
      remainingAccounts.push(readOnly(coinVaultAuthority));
      remainingAccounts.push(writable(fulfillerInputTokenAccount));
      remainingAccounts.push(writable(AmmGlobalVolumeAccumulator));
      remainingAccounts.push(writable(userVolumeAccumulator));
      remainingAccounts.push(readOnly(pumpfun_amm_fee_config));
      remainingAccounts.push(readOnly(feeProgram));
      remainingAccounts.push(readOnly(pool_v2));
      remainingAccounts.push(writable(userVolumeAccumulatorAta));
      remainingAccounts.push(writable(new_fee_recipient));
      remainingAccounts.push(writable(quoteMintForFeeRecipient));

      const orderTempOutputVault = SplToken.getAssociatedTokenAddressSync(
        SOL.mint,
        marketAddress,
        true,
      );

      const feeRecipientTokenAccount = await getAssociatedTokenAddress(
        TEST.mint,
        aveFeeRecipient,
        false,
        TOKEN_2022_PROGRAM_ID,
      );
      console.log("feeRecipientTokenAccount: ", feeRecipientTokenAccount);

      const orderUnwrapSolTempTokenAccount =
        SplToken.getAssociatedTokenAddressSync(SOL.mint, orderAddr, true);

      const instructions = [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      ];
      const swapIx = await program.methods
        .fulfillOrderViaRouteSwap(
          [
            {
              minAmountOut: new anchor.BN("1"),
              swapType: { pumpFunAmm: {} },
              remainingAccountsCount: 0,
            },
          ],
          null,
          true,
          0,
          0,
        )
        .accounts({
          fulfiller: wallets.fulfiller.publicKey,
          market: marketAddress,
          maker: wallets.maker.publicKey,
          order: orderAddr,
          orderMakerOutputTokenAccount: ordermakerOutputTokenAccount,
          orderInputTokenVault: testVaultAddress,
          orderUnwrapSolTempTokenAccount,
          orderTempOutputVault,
          feeRecipientTokenAccount,
          feeRecipientAuthority: aveFeeRecipient,
          thirdFeeRecipientAuthority: null,
          thirdFeeRecipientTokenAccount: null,
          outputTokenMint: SOL.mint,
          inputTokenMint: TEST.mint,
          memoProgram: MEMO_PROGRAM,
        })
        .remainingAccounts(remainingAccounts)
        .instruction();

      instructions.push(swapIx);

      const lookupTableAccount = await buildLookupTable(
        provider.connection,
        wallets.fulfiller,
        [
          TEST.mint,
          SOL.mint,
          MEMO_PROGRAM,
          SplToken.TOKEN_PROGRAM_ID,
          SplToken.TOKEN_2022_PROGRAM_ID,
          feeRecipientTokenAccount,
          marketAddress,
          new_fee_recipient,
          aveFeeRecipient,
          feeRecipientTokenAccount,
        ],
      );

      let blockhash = await provider.connection
        .getLatestBlockhash()
        .then((res) => res.blockhash);

      const messageV0 = new TransactionMessage({
        payerKey: wallets.fulfiller.publicKey,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message([lookupTableAccount]);

      const transaction = new VersionedTransaction(messageV0);
      transaction.sign([wallets.fulfiller.payer]);

      const signature = await provider.connection.sendTransaction(transaction, {
        skipPreflight: true,
      });
      console.log(
        "Fulfill Order Via RouteSwap (PumpFunAmm SOL -> SQUEEZE): ",
        signature,
      );
      await provider.connection.confirmTransaction(signature);

      const closeOrderTx = await program.methods
        .closeOrder()
        .accounts({
          fulfiller: wallets.fulfiller.publicKey,
          order: orderAddr,
          maker: wallets.maker.publicKey,
          market: marketAddress,
        })
        .signers([wallets.fulfiller.payer])
        .rpc();

      console.log("Close order (SOL -> SQUEEZE) tx: ", closeOrderTx);
    }
  });

  it("Fulfill Order Via RouteSwap (PumpFun SOL -> bondingcurve)", async () => {
    await program.methods
      .createMarketTokenVault()
      .accounts({
        market: marketAddress,
        mint: SOL.mint,
        tokenProgram: SplToken.TOKEN_PROGRAM_ID,
        firstVaultUser: wallets.administrator.publicKey,
      })
      .signers([wallets.administrator.payer])
      .rpc();

    const { timestampMs, orderAddr } = generateNewOrderIdAndAddr(
      program,
      marketAddress,
      wallets.maker.publicKey,
    );

    const ordermakerOutputTokenAccount =
      await SplToken.getAssociatedTokenAddressSync(
        BondingCurveMint.mint,
        wallets.maker.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
      );

    const ordermakerInputTokenAccount = SplToken.getAssociatedTokenAddressSync(
      SOL.mint,
      wallets.maker.publicKey,
    );

    const createOrderTx = await program.methods
      .createOrder(
        timestampMs,
        new anchor.BN("100000000"),
        new anchor.BN("1"),
        new anchor.BN(Date.now())
          .div(new anchor.BN(1000))
          .add(new anchor.BN(1111)),
        new anchor.BN(0),
        new anchor.BN(0),
        new anchor.BN("10000000"),
        true,
      )
      .accounts({
        market: marketAddress,
        inputMint: SOL.mint,
        outputMint: BondingCurveMint.mint,
        inputTokenProgram: SplToken.TOKEN_PROGRAM_ID,
        outputTokenProgram: SplToken.TOKEN_2022_PROGRAM_ID,
        inputTokenVault: wsolVaultAddress,
        makerInputTokenAccount: ordermakerInputTokenAccount,
        makerOutputTokenAccount: ordermakerOutputTokenAccount,
        maker: wallets.maker.publicKey,
        fulfiller: wallets.fulfiller.publicKey,
      })
      .signers([wallets.maker.payer, wallets.fulfiller.payer])
      .rpc();

    //buy
    {
      const sdk = new OnlinePumpSdk(provider.connection);
      let bondingCurve = await sdk.fetchBondingCurve(BondingCurveMint.mint);
      const global = await sdk.fetchGlobal();

      const fulfillerSolTokenAccount = SplToken.getAssociatedTokenAddressSync(
        SOL.mint,
        wallets.fulfiller.publicKey,
      );

      let fulfillerBondingCurveTokenAccount =
        await SplToken.getAssociatedTokenAddressSync(
          BondingCurveMint.mint,
          wallets.fulfiller.publicKey,
          false,
          TOKEN_2022_PROGRAM_ID,
        );
      const mild_pumpFunBondingCurve = new PublicKey(
        "2ot1DdkxS7hj92SqQB772z2WiZmb94UZnGpXTprXbHqu",
      );
      const mild_pumpFunBondingCurveAssociate = new PublicKey(
        "DTWRkYuF6S14TzBMpgyAGDb4EPCceR5JzD5Wmj4LUo8K",
      );

      // const creatorVault = new PublicKey("AqebzoL5FuuAizA9AnkjFoCt2jgrpzCkxJzca5uym263");
      const eventAuthority = PUMP_EVENT_AUTHORITY;
      const feeReceiptant = bondingCurve.isMayhemMode
        ? global.reservedFeeRecipient
        : global.feeRecipient;
      const newFeeReceiptant = new PublicKey(
        "3BpXnfJaUTiwXnJNe7Ej1rcbzqTTQUvLShZaWazebsVR",
      );

      const [creatorVault] = PublicKey.findProgramAddressSync(
        [Buffer.from("creator-vault"), bondingCurve.creator.toBuffer()],
        PUMP_PROGRAM_ID,
      );
      console.log("creatorVault: ", creatorVault);

      const PumpFunProgram = new PublicKey(
        "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
      );

      const pumpfunpool = PUMP_GLOBAL;
      const feeRecipientTokenAccount = await getAssociatedTokenAddress(
        SOL.mint,
        aveFeeRecipient,
      );
      const [userVolumeAccumulator] = PumpUserVolumeAccumulatorPda(
        wallets.fulfiller.publicKey,
      );

      const remainingAccounts = [];
      remainingAccounts.push(readOnly(PumpFunProgram)); //0
      remainingAccounts.push(writable(pumpfunpool)); //1
      remainingAccounts.push(writable(feeReceiptant)); //2
      remainingAccounts.push(writable(mild_pumpFunBondingCurve)); //3
      remainingAccounts.push(writable(mild_pumpFunBondingCurveAssociate)); //4
      remainingAccounts.push(writable(creatorVault)); //5
      remainingAccounts.push(writable(eventAuthority)); // 6
      remainingAccounts.push(writable(BondingCurveMint.mint)); //7
      remainingAccounts.push(writable(SOL.mint)); //8
      remainingAccounts.push(writable(fulfillerBondingCurveTokenAccount)); //9
      remainingAccounts.push(writable(fulfillerSolTokenAccount)); //10
      remainingAccounts.push(writable(globalVolumeAccumulator)); //11
      remainingAccounts.push(writable(userVolumeAccumulator)); //12
      remainingAccounts.push(readOnly(pumpfun_fee_config)); //13
      remainingAccounts.push(readOnly(feeProgram)); //14
      const [bonding_curve_v2] = PumpPoolv2Pda(BondingCurveMint.mint);
      remainingAccounts.push(readOnly(bonding_curve_v2)); //14
      remainingAccounts.push(writable(newFeeReceiptant)); //15

      const orderTempOutputVault = SplToken.getAssociatedTokenAddressSync(
        BondingCurveMint.mint,
        marketAddress,
        true,
        TOKEN_2022_PROGRAM_ID,
      );

      console.log("feeRecipientTokenAccount: ", feeRecipientTokenAccount);

      const instructions = [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      ];
      const swapIx = await program.methods
        .fulfillOrderViaRouteSwap(
          [
            {
              minAmountOut: new anchor.BN("1"),
              swapType: { pumpfunBondingCurve: {} },
              remainingAccountsCount: 0,
            },
          ],
          null,
          true,
          0,
          0,
        )
        .accounts({
          fulfiller: wallets.fulfiller.publicKey,
          market: marketAddress,
          maker: wallets.maker.publicKey,
          order: orderAddr,
          orderMakerOutputTokenAccount: ordermakerOutputTokenAccount,
          orderInputTokenVault: wsolVaultAddress,
          orderUnwrapSolTempTokenAccount: null,
          orderTempOutputVault,
          feeRecipientTokenAccount,
          feeRecipientAuthority: aveFeeRecipient,
          thirdFeeRecipientAuthority: null,
          thirdFeeRecipientTokenAccount: null,
          outputTokenMint: BondingCurveMint.mint,
          inputTokenMint: SOL.mint,
          memoProgram: MEMO_PROGRAM,
        })
        .remainingAccounts(remainingAccounts)
        .instruction();

      instructions.push(swapIx);

      const lookupTableAccount = await buildLookupTable(
        provider.connection,
        wallets.fulfiller,
        [
          TEST.mint,
          SOL.mint,
          MEMO_PROGRAM,
          SplToken.TOKEN_PROGRAM_ID,
          SplToken.TOKEN_2022_PROGRAM_ID,
          feeRecipientTokenAccount,
          marketAddress,
        ],
      );

      let blockhash = await provider.connection
        .getLatestBlockhash()
        .then((res) => res.blockhash);

      const messageV0 = new TransactionMessage({
        payerKey: wallets.fulfiller.publicKey,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message([lookupTableAccount]);

      const transaction = new VersionedTransaction(messageV0);
      transaction.sign([wallets.fulfiller.payer]);

      const signature = await provider.connection.sendTransaction(transaction, {
        skipPreflight: true,
      });
      console.log(
        "Fulfill Order Via RouteSwap (PumpFunAmm SOL -> SQUEEZE): ",
        signature,
      );
      await provider.connection.confirmTransaction(signature);

      const closeOrderTx = await program.methods
        .closeOrder()
        .accounts({
          fulfiller: wallets.fulfiller.publicKey,
          order: orderAddr,
          maker: wallets.maker.publicKey,
          market: marketAddress,
        })
        .signers([wallets.fulfiller.payer])
        .rpc();

      console.log("Close order (SOL -> SQUEEZE) tx: ", closeOrderTx);
    }
  });

  it("Fulfill Order Via RouteSwap (PumpFun bondingcurve -> SOL)", async () => {
    await program.methods
      .createMarketTokenVault()
      .accounts({
        market: marketAddress,
        mint: BondingCurveMint.mint,
        tokenProgram: SplToken.TOKEN_2022_PROGRAM_ID,
        firstVaultUser: wallets.administrator.publicKey,
      })
      .signers([wallets.administrator.payer])
      .rpc();
    const { timestampMs, orderAddr } = generateNewOrderIdAndAddr(
      program,
      marketAddress,
      wallets.maker.publicKey,
    );

    const ordermakerInputTokenAccount =
      await SplToken.getAssociatedTokenAddressSync(
        BondingCurveMint.mint,
        wallets.maker.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
      );

    const ordermakerOutputTokenAccount = SplToken.getAssociatedTokenAddressSync(
      SOL.mint,
      wallets.maker.publicKey,
    );

    const createOrderTx = await program.methods
      .createOrder(
        timestampMs,
        new anchor.BN("100000000"),
        new anchor.BN("1"),
        new anchor.BN(Date.now())
          .div(new anchor.BN(1000))
          .add(new anchor.BN(1111)),
        new anchor.BN(0),
        new anchor.BN(0),
        new anchor.BN("10000000"),
        true,
      )
      .accounts({
        market: marketAddress,
        inputMint: BondingCurveMint.mint,
        outputMint: SOL.mint,
        inputTokenProgram: SplToken.TOKEN_2022_PROGRAM_ID,
        outputTokenProgram: SplToken.TOKEN_PROGRAM_ID,
        inputTokenVault: bondingVaultAddress,
        makerInputTokenAccount: ordermakerInputTokenAccount,
        makerOutputTokenAccount: ordermakerOutputTokenAccount,
        maker: wallets.maker.publicKey,
        fulfiller: wallets.fulfiller.publicKey,
      })
      .signers([wallets.maker.payer, wallets.fulfiller.payer])
      .rpc();

    //buy
    {
      const sdk = new OnlinePumpSdk(provider.connection);
      let bondingCurve = await sdk.fetchBondingCurve(BondingCurveMint.mint);
      const global = await sdk.fetchGlobal();

      const fulfillerSolTokenAccount = SplToken.getAssociatedTokenAddressSync(
        SOL.mint,
        wallets.fulfiller.publicKey,
      );

      let fulfillerBondingCurveTokenAccount =
        await SplToken.getAssociatedTokenAddressSync(
          BondingCurveMint.mint,
          wallets.fulfiller.publicKey,
          false,
          TOKEN_2022_PROGRAM_ID,
        );
      const mild_pumpFunBondingCurve = new PublicKey(
        "2ot1DdkxS7hj92SqQB772z2WiZmb94UZnGpXTprXbHqu",
      );
      const mild_pumpFunBondingCurveAssociate = new PublicKey(
        "DTWRkYuF6S14TzBMpgyAGDb4EPCceR5JzD5Wmj4LUo8K",
      );

      // const creatorVault = new PublicKey("AqebzoL5FuuAizA9AnkjFoCt2jgrpzCkxJzca5uym263");
      const eventAuthority = PUMP_EVENT_AUTHORITY;
      const feeReceiptant = bondingCurve.isMayhemMode
        ? global.reservedFeeRecipient
        : global.feeRecipient;
      const newFeeReceiptant = new PublicKey(
        "3BpXnfJaUTiwXnJNe7Ej1rcbzqTTQUvLShZaWazebsVR",
      );

      const [creatorVault] = PublicKey.findProgramAddressSync(
        [Buffer.from("creator-vault"), bondingCurve.creator.toBuffer()],
        PUMP_PROGRAM_ID,
      );
      console.log("creatorVault: ", creatorVault);

      const PumpFunProgram = new PublicKey(
        "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
      );

      const pumpfunpool = PUMP_GLOBAL;
      const [userVolumeAccumulator] = PumpUserVolumeAccumulatorPda(
        wallets.fulfiller.publicKey,
      );

      const remainingAccounts = [];
      remainingAccounts.push(readOnly(PumpFunProgram)); //0
      remainingAccounts.push(writable(pumpfunpool)); //1
      remainingAccounts.push(writable(feeReceiptant)); //2
      remainingAccounts.push(writable(mild_pumpFunBondingCurve)); //3
      remainingAccounts.push(writable(mild_pumpFunBondingCurveAssociate)); //4
      remainingAccounts.push(writable(creatorVault)); //5
      remainingAccounts.push(writable(eventAuthority)); // 6
      remainingAccounts.push(writable(BondingCurveMint.mint)); //7
      remainingAccounts.push(writable(SOL.mint)); //8
      remainingAccounts.push(writable(fulfillerBondingCurveTokenAccount)); //9
      remainingAccounts.push(writable(fulfillerSolTokenAccount)); //10
      remainingAccounts.push(writable(globalVolumeAccumulator)); //11
      remainingAccounts.push(writable(userVolumeAccumulator)); //12
      remainingAccounts.push(readOnly(pumpfun_fee_config)); //13
      remainingAccounts.push(readOnly(feeProgram)); //14
      const [bonding_curve_v2] = PumpPoolv2Pda(BondingCurveMint.mint);
      remainingAccounts.push(readOnly(bonding_curve_v2)); //14
      remainingAccounts.push(writable(newFeeReceiptant)); //15
      const orderTempOutputVault = SplToken.getAssociatedTokenAddressSync(
        SOL.mint,
        marketAddress,
        true,
      );

      const feeRecipientTokenAccount = await getAssociatedTokenAddress(
        BondingCurveMint.mint,
        aveFeeRecipient,
        false,
        TOKEN_2022_PROGRAM_ID,
      );
      console.log("feeRecipientTokenAccount: ", feeRecipientTokenAccount);

      const orderUnwrapSolTempTokenAccount =
        SplToken.getAssociatedTokenAddressSync(SOL.mint, orderAddr, true);

      const instructions = [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      ];
      const swapIx = await program.methods
        .fulfillOrderViaRouteSwap(
          [
            {
              minAmountOut: new anchor.BN("1"),
              swapType: { pumpfunBondingCurve: {} },
              remainingAccountsCount: 0,
            },
          ],
          null,
          true,
          0,
          0,
        )
        .accounts({
          fulfiller: wallets.fulfiller.publicKey,
          market: marketAddress,
          maker: wallets.maker.publicKey,
          order: orderAddr,
          orderMakerOutputTokenAccount: ordermakerOutputTokenAccount,
          orderInputTokenVault: bondingVaultAddress,
          orderUnwrapSolTempTokenAccount,
          orderTempOutputVault,
          feeRecipientTokenAccount,
          feeRecipientAuthority: aveFeeRecipient,
          thirdFeeRecipientAuthority: null,
          thirdFeeRecipientTokenAccount: null,
          outputTokenMint: SOL.mint,
          inputTokenMint: BondingCurveMint.mint,
          memoProgram: MEMO_PROGRAM,
        })
        .remainingAccounts(remainingAccounts)
        .instruction();

      instructions.push(swapIx);

      const lookupTableAccount = await buildLookupTable(
        provider.connection,
        wallets.fulfiller,
        [
          BondingCurveMint.mint,
          SOL.mint,
          MEMO_PROGRAM,
          SplToken.TOKEN_PROGRAM_ID,
          SplToken.TOKEN_2022_PROGRAM_ID,
          feeRecipientTokenAccount,
          marketAddress,
        ],
      );

      let blockhash = await provider.connection
        .getLatestBlockhash()
        .then((res) => res.blockhash);

      const messageV0 = new TransactionMessage({
        payerKey: wallets.fulfiller.publicKey,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message([lookupTableAccount]);

      const transaction = new VersionedTransaction(messageV0);
      transaction.sign([wallets.fulfiller.payer]);

      const signature = await provider.connection.sendTransaction(transaction, {
        skipPreflight: true,
      });
      console.log(
        "Fulfill Order Via RouteSwap (PumpFunAmm SOL -> SQUEEZE): ",
        signature,
      );
      await provider.connection.confirmTransaction(signature);

      const closeOrderTx = await program.methods
        .closeOrder()
        .accounts({
          fulfiller: wallets.fulfiller.publicKey,
          order: orderAddr,
          maker: wallets.maker.publicKey,
          market: marketAddress,
        })
        .signers([wallets.fulfiller.payer])
        .rpc();

      console.log("Close order (SOL -> SQUEEZE) tx: ", closeOrderTx);
    }
  });

  it("RouteSwap (PumpFunAmm SOL -> 9F46Lz...) - reproduction from decoded tx", async () => {
    const decodedMint = new PublicKey(
      "9F46LzgebqBFjhyXtT9E3fqH4a6WEPzNhV9dH1hGpump",
    );
    const decodedPool = new PublicKey(
      "8gg6dy9XFtZotrc5DudCtXw5S3o5K9HpxAontLGaTxit",
    );

    const sdk = new OnlinePumpAmmSdk(provider.connection);
    const poolObject = await sdk.fetchPool(decodedPool);
    const globalConfig = await sdk.fetchGlobalConfigAccount();

    const poolBaseTokenAccount = poolObject.poolBaseTokenAccount;
    const poolQuoteTokenAccount = poolObject.poolQuoteTokenAccount;
    const protocolFeeRecipient = poolObject.isMayhemMode
      ? globalConfig.reservedFeeRecipient
      : globalConfig.protocolFeeRecipients[0];

    const protocolFeeTokenAccount = SplToken.getAssociatedTokenAddressSync(
      SOL.mint,
      protocolFeeRecipient,
      true,
    );

    const makerInputTokenAccount = SplToken.getAssociatedTokenAddressSync(
      SOL.mint,
      wallets.maker.publicKey,
    );

    const makerOutputTokenAccount = SplToken.getAssociatedTokenAddressSync(
      decodedMint,
      wallets.maker.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
    );

    const [userVolumeAccumulator] = AmmUserVolumeAccumulatorPda(
      wallets.maker.publicKey,
    );

    const [coinVaultAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("creator_vault"), poolObject.coinCreator.toBuffer()],
      PumpFunAmmProgram,
    );
    const coinCreatorVaultAta = getAssociatedTokenAddressSync(
      SOL.mint,
      coinVaultAuthority,
      true,
    );

    // 链上失败交易中的 buyback fee recipient（导致 BuybackFeeRecipientNotAuthorized）
    const new_fee_recipient = new PublicKey(
      "5eHhjP8JaYkz83CWwvGU2uMUXefd3AazWGx4gpcuEEYD",
    );
    const quoteMintForFeeRecipient = getAssociatedTokenAddressSync(
      poolObject.quoteMint,
      new_fee_recipient,
      true,
    );

    const [userVolumeAccumulatorAta] = PublicKey.findProgramAddressSync(
      [
        userVolumeAccumulator.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        SOL.mint.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    const [pool_v2] = PumpAmmPoolv2Pda(decodedMint);

    const remainingAccounts = [];

    remainingAccounts.push(readOnly(PumpFunAmmProgram));
    remainingAccounts.push(writable(decodedPool));
    remainingAccounts.push(writable(PumpFunAmmGlobalConfig));
    remainingAccounts.push(writable(decodedMint));
    remainingAccounts.push(writable(SOL.mint));
    remainingAccounts.push(writable(poolBaseTokenAccount));
    remainingAccounts.push(writable(poolQuoteTokenAccount));
    remainingAccounts.push(writable(protocolFeeRecipient));
    remainingAccounts.push(writable(protocolFeeTokenAccount));
    // 修正：链上解析显示 EventAuthority 是 Readonly，不是 Writable
    remainingAccounts.push(readOnly(PumpFunAmmEventAuthority));
    remainingAccounts.push(writable(coinCreatorVaultAta));
    remainingAccounts.push(readOnly(coinVaultAuthority));
    remainingAccounts.push(writable(makerInputTokenAccount));
    remainingAccounts.push(writable(AmmGlobalVolumeAccumulator));
    remainingAccounts.push(writable(userVolumeAccumulator));
    remainingAccounts.push(readOnly(pumpfun_amm_fee_config));
    remainingAccounts.push(readOnly(feeProgram));
    remainingAccounts.push(readOnly(pool_v2));
    remainingAccounts.push(writable(userVolumeAccumulatorAta));
    remainingAccounts.push(writable(new_fee_recipient));
    remainingAccounts.push(writable(quoteMintForFeeRecipient));

    const feeRecipientTokenAccount = await getAssociatedTokenAddress(
      SOL.mint,
      aveFeeRecipient,
    );

    const instructions = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 }),
    ];
    const swapIx = await program.methods
      .routeSwap(
        {
          amountIn: new anchor.BN("500000000"),
          steps: [
            {
              minAmountOut: new anchor.BN("316545207546"),
              swapType: { pumpFunAmm: {} },
              remainingAccountsCount: 0,
            },
          ],
        },
        true, // wrap_and_unwrap_sol
        true, // is_fee_in
        new anchor.BN("60"), // fee_bps
        new anchor.BN("0"), // third_fee_bps
      )
      .accounts({
        authority: wallets.maker.publicKey,
        inputTokenAccount: makerInputTokenAccount,
        outputTokenAccount: makerOutputTokenAccount,
        inputTokenMint: SOL.mint,
        outputTokenMint: decodedMint,
        feeRecipientAuthority: aveFeeRecipient,
        feeRecipientTokenAccount,
        thirdFeeRecipientAuthority: null,
        thirdFeeRecipientTokenAccount: null,
        memoProgram: MEMO_PROGRAM,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();
    instructions.push(swapIx);

    let blockhash = await provider.connection
      .getLatestBlockhash()
      .then((res) => res.blockhash);

    const messageV0 = new TransactionMessage({
      payerKey: wallets.maker.publicKey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message([]);

    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([wallets.maker.payer]);

    const signature = await provider.connection.sendTransaction(transaction, {
      skipPreflight: true,
    });
    console.log(
      "route swap (PumpFunAmm SOL -> 9F46Lz...) reproduction: ",
      signature,
    );
    await provider.connection.confirmTransaction(signature);
  });

  it("Remove event listener", async () => {
    await program.removeEventListener(listener);
  });
});

async function airdrop(
  connection: Connection,
  wallet: PublicKey,
  amount: number,
) {
  const signature = await connection.requestAirdrop(wallet, amount);
  await connection.confirmTransaction(signature);

  console.log("Airdrop to " + wallet.toBase58() + " completed.");

  const accountInfo = await connection.getAccountInfo(wallet);
  console.log(
    "Account balance: " + accountInfo?.lamports / LAMPORTS_PER_SOL + " SOL",
  );
}

function getMarketAddr(program: Program<AveLimitOrder>, name: string) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("market"), Buffer.from(name)],
    program.programId,
  );
}

function getVaultAddr(
  marketAddr: PublicKey,
  mint: PublicKey,
  programId: PublicKey = TOKEN_PROGRAM_ID,
) {
  return SplToken.getAssociatedTokenAddressSync(
    mint,
    marketAddr,
    true,
    programId,
  );
}

function getOrderAddr(
  program: Program<AveLimitOrder>,
  marketAddr: PublicKey,
  maker: PublicKey,
  timestampMs: anchor.BN,
): [PublicKey, number] {
  const timestampMsBuffer = bnToBuffer(timestampMs);
  // console.log("Order ", marketAddr.toBase58(), " ", maker.toBase58(), " ", timestampMsBuffer);
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("order"),
      marketAddr.toBuffer(),
      maker.toBuffer(),
      bnToBuffer(timestampMs),
    ],
    program.programId,
  );
}

function getRefundAddr(
  program: Program<AveLimitOrder>,
  user: PublicKey,
  mint: PublicKey,
) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("REFUND"), user.toBuffer(), mint.toBuffer()],
    program.programId,
  );
}

function generateNewOrderIdAndAddr(
  program: Program<AveLimitOrder>,
  marketAddr: PublicKey,
  maker: PublicKey,
): { timestampMs: anchor.BN; orderAddr: PublicKey; bump: number } {
  const timestampMs = new anchor.BN(Date.now());
  const [orderAddr, bump] = getOrderAddr(
    program,
    marketAddr,
    maker,
    timestampMs,
  );
  console.log(
    "Order ",
    orderAddr.toBase58(),
    " (",
    timestampMs,
    ") generated.",
  );
  return { timestampMs, orderAddr, bump };
}

function bnToBuffer(bn: anchor.BN) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(BigInt(bn.toString()));
  return buffer;
}

function readOnly(addr: PublicKey): AccountMeta {
  return { pubkey: addr, isWritable: false, isSigner: false };
}

function writable(addr: PublicKey): AccountMeta {
  return { pubkey: addr, isWritable: true, isSigner: false };
}

function writableSigner(addr: PublicKey): AccountMeta {
  return { pubkey: addr, isWritable: true, isSigner: true };
}

function AmmUserVolumeAccumulatorPda(
  user: PublicKey,
  programId: PublicKey = PumpFunAmmProgram,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("user_volume_accumulator"), user.toBuffer()],
    programId,
  );
}

function PumpUserVolumeAccumulatorPda(
  user: PublicKey,
  programId: PublicKey = PUMP_PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("user_volume_accumulator"), user.toBuffer()],
    programId,
  );
}

function pumpFeeConfigPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("fee_config"), PUMP_PROGRAM_ID.toBuffer()],
    feeProgram,
  )[0];
}

function pumpAmmFeeConfigPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("fee_config"), PumpFunAmmProgram.toBuffer()],
    feeProgram,
  )[0];
}

function PumpAmmPoolv2Pda(
  mint: PublicKey,
  programId: PublicKey = PumpFunAmmProgram,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("pool-v2"), mint.toBuffer()],
    programId,
  );
}

function PumpPoolv2Pda(
  mint: PublicKey,
  programId: PublicKey = PUMP_PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("bonding-curve-v2"), mint.toBuffer()],
    programId,
  );
}

function PinpetCooldown(mintPubkey: PublicKey, payer: PublicKey): PublicKey {
  // Calculate cooldown PDA
  const [cooldownPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("trade_cooldown"), mintPubkey.toBuffer(), payer.toBuffer()],
    PINPET_PROGRAM_ID,
  );
  return cooldownPDA;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
