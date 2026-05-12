import {
  Connection,
  PublicKey,
  TransactionInstruction,
  ComputeBudgetProgram,
  TransactionMessage,
  VersionedTransaction,
  AddressLookupTableAccount,
} from "@solana/web3.js";
import { BN, BorshCoder, Idl, AnchorProvider, Program } from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import idl from "./ave_limit_order.json";
import bs58 from "bs58";

// 从解析结果中提取的常量
const PROGRAM_ID = new PublicKey("AveaiuA1emN71q9mS2QQ9BEWNAAHmp8sHSvwLFHQjufM");

// 主要账户
const AUTHORITY = new PublicKey("8WG4g9hzVp9cTHa99r1GSWCgCuH994KpRm3DKUWZL931");
const INPUT_TOKEN_ACCOUNT = new PublicKey("C5ymSqkFc6SN2HCnBaBfqMseFvf7B3Svu113Y2ujx9iD");
const INPUT_TOKEN_MINT = new PublicKey("EccUgMzmMpiqxqpz6dHCBR4Tb4G1JJkdDJAqP8Jupump");
const OUTPUT_TOKEN_ACCOUNT = new PublicKey("EstTH2akAvRNqXHb3sttM8iU5wnAKvHsqQaeNV15Puai");
const OUTPUT_TOKEN_MINT = new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB");
const FEE_RECIPIENT_TOKEN_ACCOUNT = new PublicKey("4FKboDtvJmzBrw9rWCtimtSXvMAy1ATbtnoATa4BpcB1");
const FEE_RECIPIENT_AUTHORITY = new PublicKey("2416yFoX5ep69Ae8u4EoWN2b1jRMC8diygQDf4zqNAQG");
const THIRD_FEE_RECIPIENT_TOKEN_ACCOUNT = new PublicKey("2416yFoX5ep69Ae8u4EoWN2b1jRMC8diygQDf4zqNAQG");
const THIRD_FEE_RECIPIENT_AUTHORITY = new PublicKey("4FKboDtvJmzBrw9rWCtimtSXvMAy1ATbtnoATa4BpcB1");

// 系统程序
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const TOKEN_PROGRAM_2022_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const SYSTEM_PROGRAM_ID = new PublicKey("11111111111111111111111111111111");
const RENT_SYSVAR = new PublicKey("SysvarRent111111111111111111111111111111111");

// Remaining accounts (从解析结果中提取)
const REMAINING_ACCOUNTS = [
  new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"),   // PumpFun AMM Program
  new PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf"),   // Pool
  new PublicKey("7VtfL8fvgNfhz17qKRMjzQEXgbdpnHHHQRh54R9jP2RJ"),   // Global Config
  new PublicKey("9ip4c6yoKBmW1D7khrGerW1k52LRKHfNAg5m6uWP37fa"),   // Mint
  new PublicKey("6wBmYKJn7kZ6Uc7A6rGeNripcukKbVRKX9yPyfPAGJ7P"),   // SOL Mint
  new PublicKey("3bGXvkD6XYEXFeLJdMXjyhjWFoQqdo1mGSWjN8TMK7Z9"),   // Pool Base Token Account
  new PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1"),   // Pool Quote Token Account
  new PublicKey("EccUgMzmMpiqxqpz6dHCBR4Tb4G1JJkdDJAqP8Jupump"),   // Protocol Fee Recipient
  new PublicKey("So11111111111111111111111111111111111111112"),   // Protocol Fee Token Account
  new PublicKey("C5ymSqkFc6SN2HCnBaBfqMseFvf7B3Svu113Y2ujx9iD"),   // Event Authority
  new PublicKey("8f96VSMEckc5NXZWJDQ4fTvfFEKQzXRAGWATJZNTQicW"),   // Coin Creator Vault ATA
  new PublicKey("Hq2wp8uJ9jCPsYgNHex8RtqdvMPfVGoYwjvF1ATiwn2Y"),   // Coin Vault Authority
  new PublicKey("2m9BkM3fuCqnhtxwYwH75fstzwfxEF6EKRE6Po9GTNCz"),   // Fulfiller Input Token Account
  new PublicKey("8Wf5TiAheLUqBrKXeYg2JtAFFMWtKdG2BSFgqUcPVwTt"),   // Global Volume Accumulator
  new PublicKey("pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ"),   // User Volume Accumulator
  new PublicKey("2dz6M1mf2SeR9Mu69ZqumhYDgEv67WstjvH1vHxFHfJM"),   // Fee Config
  new PublicKey("8f96VSMEckc5NXZWJDQ4fTvfFEKQzXRAGWATJZNTQicW"),   // Fee Program
  new PublicKey("So11111111111111111111111111111111111111112"),   // Pool v2
  new PublicKey("whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc"),   // User Volume Accumulator ATA
  new PublicKey("FwewVm8u6tFPGewAyHmWAqad9hmF7mvqxK4mJ7iNqqGC"),   // Whirlpools Program (Orca)
  new PublicKey("So11111111111111111111111111111111111111112"),   // Whirlpool
  new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"),   // Token Vault A
  new PublicKey("BFAWVmF5aoALggQ9Y2RpTijpYKRESxcdNe6JDNZEpoxC"),   // Token Vault B
  new PublicKey("B1qD7GDsKN4kz2ehks71eEpVhUzqaTVXaWfCxXykRAA9"),   // Oracle
  new PublicKey("5oVJcdBZFeRQZsPgp7SdfuUC9JeozzkA14669uTdscZJ"),   // Tick Array 0
  new PublicKey("FKgy3Fq7FEPSBEf2rFfWDP2TKNKgqwkPtwED8s6U19gQ"),   // Tick Array 1
  new PublicKey("8zd2pV7eEeBMzPm9VDHNsaYtp3DDbgqkvt68u7emH8JB"),   // Tick Array 2
  new PublicKey("C9fdYbm6pohfBWHh9bfkdyum3PCPgNmpUpyMrxXpVN6m"),   // Remaining...
];

// ALT 地址
const ALT_ADDRESS = new PublicKey("4j834PBihsChsKWF4SZCY4K9tVNHc5JFpw1vEDJgbW29");

/**
 * 构造 route_swap 指令
 */
async function buildRouteSwapInstruction(
  program: Program,
  params: {
    amountIn: BN;
    steps: Array<{
      minAmountOut: BN;
      swapType: any;
      remainingAccountsCount: number;
    }>;
    wrapAndUnwrapSol: boolean;
    isFeeIn: boolean;
    feeBps: number;
    thirdFeeBps: number;
  }
): Promise<TransactionInstruction> {
  const {
    amountIn,
    steps,
    wrapAndUnwrapSol,
    isFeeIn,
    feeBps,
    thirdFeeBps,
  } = params;

  // 构造 accounts
  const accounts = {
    authority: AUTHORITY,
    inputTokenAccount: INPUT_TOKEN_ACCOUNT,
    outputTokenAccount: OUTPUT_TOKEN_ACCOUNT,
    inputTokenMint: INPUT_TOKEN_MINT,
    outputTokenMint: OUTPUT_TOKEN_MINT,
    feeRecipientAuthority: FEE_RECIPIENT_AUTHORITY,
    feeRecipientTokenAccount: FEE_RECIPIENT_TOKEN_ACCOUNT,
    thirdFeeRecipientAuthority: THIRD_FEE_RECIPIENT_AUTHORITY,
    thirdFeeRecipientTokenAccount: THIRD_FEE_RECIPIENT_TOKEN_ACCOUNT,
    memoProgram: MEMO_PROGRAM_ID,
    tokenProgram: TOKEN_PROGRAM_ID,
    tokenProgram2022: TOKEN_PROGRAM_2022_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SYSTEM_PROGRAM_ID,
    rentSysvar: RENT_SYSVAR,
  };

  // 构造 remaining accounts (标记 isWritable)
  // 根据解析结果，需要标记哪些账户是可写的
  const writableIndexes = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 13, 14, 15, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42];

  const remainingAccounts = REMAINING_ACCOUNTS.map((pubkey, index) => ({
    pubkey,
    isWritable: writableIndexes.includes(index),
    isSigner: false,
  }));

  // 使用 Anchor 构造指令
  const ix = await program.methods
    .routeSwap(
      {
        amountIn,
        steps: steps.map((s) => ({
          minAmountOut: s.minAmountOut,
          swapType: s.swapType,
          remainingAccountsCount: s.remainingAccountsCount,
        })),
      },
      wrapAndUnwrapSol,
      isFeeIn,
      new BN(feeBps),
      new BN(thirdFeeBps)
    )
    .accounts(accounts)
    .remainingAccounts(remainingAccounts)
    .instruction();

  return ix;
}

/**
 * 从链上获取 ALT
 */
async function getAddressLookupTable(
  connection: Connection,
  address: PublicKey
): Promise<AddressLookupTableAccount> {
  const resp = await connection.getAddressLookupTable(address);
  if (!resp.value) {
    throw new Error(`ALT ${address.toBase58()} 加载失败`);
  }
  return resp.value;
}

/**
 * 主函数：构造并发送交易
 */
async function main() {
  // 设置连接和 provider
  const connection = new Connection("https://api.mainnet-beta.solana.com");

  // 注意：需要设置实际的钱包私钥才能发送交易
  // 这里仅作演示，构造指令
  const wallet = NodeWallet.local();
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  // 创建 Program 实例
  const program = new Program(idl as Idl, PROGRAM_ID, provider);

  console.log("开始构造 route_swap 交易...");

  // 构造参数（从解析结果中提取）
  const routeSwapParams = {
    amountIn: new BN("338921604853"),
    steps: [
      {
        minAmountOut: new BN("1"),
        swapType: { pumpfunBondingCurve: {} },
        remainingAccountsCount: 0,
      },
      {
        minAmountOut: new BN("2176093"),
        swapType: { orca: { sqrtPriceLimit: new BN("4295048016") } },
        remainingAccountsCount: 0,
      },
    ],
    wrapAndUnwrapSol: true,
    isFeeIn: false,
    feeBps: 80,
    thirdFeeBps: 0,
  };

  console.log("参数:", JSON.stringify({
    ...routeSwapParams,
    amountIn: routeSwapParams.amountIn.toString(),
    steps: routeSwapParams.steps.map(s => ({
      ...s,
      minAmountOut: s.minAmountOut.toString(),
      swapType: s.swapType,
    })),
    feeBps: routeSwapParams.feeBps,
    thirdFeeBps: routeSwapParams.thirdFeeBps,
  }, null, 2));

  // 构造 ComputeBudget 指令
  const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: 400_000,
  });

  // 构造 route_swap 指令
  const routeSwapIx = await buildRouteSwapInstruction(program, routeSwapParams);

  console.log("\n构造的 route_swap 指令:");
  console.log("  Program ID:", routeSwapIx.programId.toBase58());
  console.log("  Keys 数量:", routeSwapIx.keys.length);
  console.log("  Data (hex):", routeSwapIx.data.toString("hex"));
  console.log("  Data (base58):", bs58.encode(routeSwapIx.data));

  // 获取 ALT
  const altAccount = await getAddressLookupTable(connection, ALT_ADDRESS);
  console.log("\nALT 加载成功:", ALT_ADDRESS.toBase58());
  console.log("ALT 中的地址数量:", altAccount.state.addresses.length);

  // 构造交易消息
  const instructions = [computeBudgetIx, routeSwapIx];

  // 获取最新 blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  console.log("\nBlockhash:", blockhash);

  // 构造 VersionedTransaction
  const messageV0 = new TransactionMessage({
    payerKey: AUTHORITY, // 使用解析出的 authority 作为 payer
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message([altAccount]);

  const transaction = new VersionedTransaction(messageV0);

  console.log("\n交易构造完成!");
  console.log("交易序列化 (base64):", Buffer.from(transaction.serialize()).toString("base64"));

  // 注意：需要签名才能发送
  // transaction.sign([wallet.payer]);
  // const signature = await connection.sendTransaction(transaction, { skipPreflight: true });
  // console.log("交易签名:", signature);

  return transaction;
}

// 运行
main()
  .then((tx) => {
    console.log("\n✅ 成功构造交易");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ 错误:", err);
    process.exit(1);
  });
