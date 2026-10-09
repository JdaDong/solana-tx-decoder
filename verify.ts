import {
  Connection,
  VersionedTransaction,
  Message,
  AddressLookupTableAccount,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";

// 4P2te21f1k5tXZfPq4XNRy2GLcBTY6TvuRYugy9Rpump
const PUMP_PROGRAM_ID = new PublicKey(
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
);

const PUMP_CREATOR = new PublicKey(
  "DvtcPMuWVLbf1AyWVSJRPyCuLd3QUHWz1T4D8pjJm3H7",
);

const [PUMP_CREATOR_VAULT] = PublicKey.findProgramAddressSync(
  [Buffer.from("creator-vault"), PUMP_CREATOR.toBuffer()],
  PUMP_PROGRAM_ID,
);

console.log(PUMP_CREATOR_VAULT);
