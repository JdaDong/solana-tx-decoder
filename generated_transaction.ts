import {
  Connection,
  PublicKey,
  TransactionInstruction,
  ComputeBudgetProgram,
  TransactionMessage,
  VersionedTransaction,
  AddressLookupTableAccount,
} from "@solana/web3.js";
import { BN, Program, AnchorProvider } from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import idl from "./ave_limit_order.json";

// Program ID
const PROGRAM_ID = new PublicKey("AveaiuA1emN71q9mS2QQ9BEWNAAHmp8sHSvwLFHQjufM");

// ALT Addresses
const ALT_ADDRESSES = [new PublicKey("4j834PBihsChsKWF4SZCY4K9tVNHc5JFpw1vEDJgbW29")];


// ========== Instruction 1: route_swap ==========

// Accounts for route_swap
const AUTHORITY = new PublicKey("8WG4g9hzVp9cTHa99r1GSWCgCuH994KpRm3DKUWZL931"); // authority
const INPUT_TOKEN_ACCOUNT = new PublicKey("C5ymSqkFc6SN2HCnBaBfqMseFvf7B3Svu113Y2ujx9iD"); // input_token_account
const INPUT_TOKEN_MINT = new PublicKey("EccUgMzmMpiqxqpz6dHCBR4Tb4G1JJkdDJAqP8Jupump"); // input_token_mint
const OUTPUT_TOKEN_ACCOUNT = new PublicKey("EstTH2akAvRNqXHb3sttM8iU5wnAKvHsqQaeNV15Puai"); // output_token_account
const OUTPUT_TOKEN_MINT = new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"); // output_token_mint
const FEE_RECIPIENT_TOKEN_ACCOUNT = new PublicKey("4FKboDtvJmzBrw9rWCtimtSXvMAy1ATbtnoATa4BpcB1"); // fee_recipient_token_account
const FEE_RECIPIENT_AUTHORITY = new PublicKey("2416yFoX5ep69Ae8u4EoWN2b1jRMC8diygQDf4zqNAQG"); // fee_recipient_authority
const THIRD_FEE_RECIPIENT_TOKEN_ACCOUNT = new PublicKey("2416yFoX5ep69Ae8u4EoWN2b1jRMC8diygQDf4zqNAQG"); // third_fee_recipient_token_account
const THIRD_FEE_RECIPIENT_AUTHORITY = new PublicKey("4FKboDtvJmzBrw9rWCtimtSXvMAy1ATbtnoATa4BpcB1"); // third_fee_recipient_authority
const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"); // token_program
const TOKEN_PROGRAM_2022 = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"); // token_program_2022
const ASSOCIATED_TOKEN_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"); // associated_token_program
const MEMO_PROGRAM = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"); // memo_program
const SYSTEM_PROGRAM = new PublicKey("11111111111111111111111111111111"); // system_program
const RENT_SYSVAR = new PublicKey("SysvarRent111111111111111111111111111111111"); // rent_sysvar

// Remaining accounts
const REMAINING_0 = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
const REMAINING_1 = new PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf");
const REMAINING_2 = new PublicKey("7VtfL8fvgNfhz17qKRMjzQEXgbdpnHHHQRh54R9jP2RJ");
const REMAINING_3 = new PublicKey("9ip4c6yoKBmW1D7khrGerW1k52LRKHfNAg5m6uWP37fa");
const REMAINING_4 = new PublicKey("6wBmYKJn7kZ6Uc7A6rGeNripcukKbVRKX9yPyfPAGJ7P");
const REMAINING_5 = new PublicKey("3bGXvkD6XYEXFeLJdMXjyhjWFoQqdo1mGSWjN8TMK7Z9");
const REMAINING_6 = new PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1");
const REMAINING_7 = new PublicKey("EccUgMzmMpiqxqpz6dHCBR4Tb4G1JJkdDJAqP8Jupump");
const REMAINING_8 = new PublicKey("So11111111111111111111111111111111111111112");
const REMAINING_9 = new PublicKey("C5ymSqkFc6SN2HCnBaBfqMseFvf7B3Svu113Y2ujx9iD");
const REMAINING_10 = new PublicKey("8f96VSMEckc5NXZWJDQ4fTvfFEKQzXRAGWATJZNTQicW");
const REMAINING_11 = new PublicKey("Hq2wp8uJ9jCPsYgNHex8RtqdvMPfVGoYwjvF1ATiwn2Y");
const REMAINING_12 = new PublicKey("2m9BkM3fuCqnhtxwYwH75fstzwfxEF6EKRE6Po9GTNCz");
const REMAINING_13 = new PublicKey("8Wf5TiAheLUqBrKXeYg2JtAFFMWtKdG2BSFgqUcPVwTt");
const REMAINING_14 = new PublicKey("pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ");
const REMAINING_15 = new PublicKey("2dz6M1mf2SeR9Mu69ZqumhYDgEv67WstjvH1vHxFHfJM");
const REMAINING_16 = new PublicKey("8f96VSMEckc5NXZWJDQ4fTvfFEKQzXRAGWATJZNTQicW");
const REMAINING_17 = new PublicKey("So11111111111111111111111111111111111111112");
const REMAINING_18 = new PublicKey("whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc");
const REMAINING_19 = new PublicKey("FwewVm8u6tFPGewAyHmWAqad9hmF7mvqxK4mJ7iNqqGC");
const REMAINING_20 = new PublicKey("So11111111111111111111111111111111111111112");
const REMAINING_21 = new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB");
const REMAINING_22 = new PublicKey("BFAWVmF5aoALggQ9Y2RpTijpYKRESxcdNe6JDNZEpoxC");
const REMAINING_23 = new PublicKey("B1qD7GDsKN4kz2ehks71eEpVhUzqaTVXaWfCxXykRAA9");
const REMAINING_24 = new PublicKey("5oVJcdBZFeRQZsPgp7SdfuUC9JeozzkA14669uTdscZJ");
const REMAINING_25 = new PublicKey("FKgy3Fq7FEPSBEf2rFfWDP2TKNKgqwkPtwED8s6U19gQ");
const REMAINING_26 = new PublicKey("8zd2pV7eEeBMzPm9VDHNsaYtp3DDbgqkvt68u7emH8JB");
const REMAINING_27 = new PublicKey("C9fdYbm6pohfBWHh9bfkdyum3PCPgNmpUpyMrxXpVN6m");

// Args for route_swap
const ROUTE_SWAP_ARGS = {
  args: {
    amount_in: new BN("338921604853"),
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
  },
  wrap_and_unwrap_sol: true,
  is_fee_in: false,
  fee_bps: 80,
  third_fee_bps: 0,
};

/**
 * Build route_swap instruction
 */
async function buildRouteSwapInstruction(program: Program): Promise<TransactionInstruction> {
  const accounts = {
    authority: AUTHORITY,
    input_token_account: INPUT_TOKEN_ACCOUNT,
    input_token_mint: INPUT_TOKEN_MINT,
    output_token_account: OUTPUT_TOKEN_ACCOUNT,
    output_token_mint: OUTPUT_TOKEN_MINT,
    fee_recipient_token_account: FEE_RECIPIENT_TOKEN_ACCOUNT,
    fee_recipient_authority: FEE_RECIPIENT_AUTHORITY,
    third_fee_recipient_token_account: THIRD_FEE_RECIPIENT_TOKEN_ACCOUNT,
    third_fee_recipient_authority: THIRD_FEE_RECIPIENT_AUTHORITY,
    token_program: TOKEN_PROGRAM,
    token_program_2022: TOKEN_PROGRAM_2022,
    associated_token_program: ASSOCIATED_TOKEN_PROGRAM,
    memo_program: MEMO_PROGRAM,
    system_program: SYSTEM_PROGRAM,
    rent_sysvar: RENT_SYSVAR,
  };

  const remainingAccounts = [
    { pubkey: REMAINING_0, isWritable: true, isSigner: false },
    { pubkey: REMAINING_1, isWritable: true, isSigner: false },
    { pubkey: REMAINING_2, isWritable: true, isSigner: false },
    { pubkey: REMAINING_3, isWritable: true, isSigner: false },
    { pubkey: REMAINING_4, isWritable: true, isSigner: false },
    { pubkey: REMAINING_5, isWritable: true, isSigner: false },
    { pubkey: REMAINING_6, isWritable: true, isSigner: false },
    { pubkey: REMAINING_7, isWritable: true, isSigner: false },
    { pubkey: REMAINING_8, isWritable: true, isSigner: false },
    { pubkey: REMAINING_9, isWritable: true, isSigner: false },
    { pubkey: REMAINING_10, isWritable: true, isSigner: false },
    { pubkey: REMAINING_11, isWritable: true, isSigner: false },
    { pubkey: REMAINING_12, isWritable: true, isSigner: false },
    { pubkey: REMAINING_13, isWritable: true, isSigner: false },
    { pubkey: REMAINING_14, isWritable: true, isSigner: false },
    { pubkey: REMAINING_15, isWritable: true, isSigner: false },
    { pubkey: REMAINING_16, isWritable: true, isSigner: false },
    { pubkey: REMAINING_17, isWritable: true, isSigner: false },
    { pubkey: REMAINING_18, isWritable: true, isSigner: false },
    { pubkey: REMAINING_19, isWritable: true, isSigner: false },
    { pubkey: REMAINING_20, isWritable: true, isSigner: false },
    { pubkey: REMAINING_21, isWritable: true, isSigner: false },
    { pubkey: REMAINING_22, isWritable: true, isSigner: false },
    { pubkey: REMAINING_23, isWritable: true, isSigner: false },
    { pubkey: REMAINING_24, isWritable: true, isSigner: false },
    { pubkey: REMAINING_25, isWritable: true, isSigner: false },
    { pubkey: REMAINING_26, isWritable: true, isSigner: false },
    { pubkey: REMAINING_27, isWritable: true, isSigner: false },
  ];

  const ix = await program.methods
    .route_swap(
      ROUTE_SWAP_ARGS.args, true, false, 80, 0
    )
    .accounts(accounts)
    .remainingAccounts(remainingAccounts)
    .instruction();

  return ix;
}

// ========== Main Function ==========

async function main() {
  const connection = new Connection("https://api.mainnet-beta.solana.com");
  const wallet = NodeWallet.local(); // Replace with your wallet
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const program = new Program(idl as any, PROGRAM_ID, provider);

  console.log("Building instructions...");

  // Build instruction 1: route_swap
  const ix1 = await buildRouteSwapInstruction(program);

  const instructions = [ix1];

  // Load ALTs
  const altAccounts = await Promise.all(
    ALT_ADDRESSES.map((addr) =>
      connection.getAddressLookupTable(addr).then((res) => {
        if (!res.value) throw new Error(`ALT ${addr.toBase58()} not found`);
        return res.value;
      })
    )
  );

  // Build transaction
  const { blockhash } = await connection.getLatestBlockhash();
  const messageV0 = new TransactionMessage({
    payerKey: wallet.publicKey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message(altAccounts);

  const transaction = new VersionedTransaction(messageV0);
  
  // Sign and send (uncomment to execute)
  // transaction.sign([wallet.payer]);
  // const signature = await connection.sendTransaction(transaction, { skipPreflight: true });
  // console.log("Transaction sent:", signature);

  console.log("Transaction built successfully!");
  console.log("Serialized (base64):", Buffer.from(transaction.serialize()).toString("base64"));

  return transaction;
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });