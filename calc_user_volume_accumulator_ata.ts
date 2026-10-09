import { PublicKey } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

const PumpFunAmmProgram = new PublicKey(
  "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
);
const SOL_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

/**
 * 计算 UserVolumeAccumulator PDA
 * seeds: ["user_volume_accumulator", userPubkey]
 * program: PumpFunAmmProgram
 */
function calcUserVolumeAccumulator(userPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("user_volume_accumulator"), userPubkey.toBuffer()],
    PumpFunAmmProgram,
  );
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

/**
 * 计算 UserVolumeAccumulator 的 SOL ATA
 * seeds: [userVolumeAccumulator, TOKEN_PROGRAM_ID, SOL_MINT]
 * program: ASSOCIATED_TOKEN_PROGRAM_ID
 */
function calcUserVolumeAccumulatorAta(
  userVolumeAccumulator: PublicKey,
  quoteMint: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      userVolumeAccumulator.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      quoteMint.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
}

function main() {
  // 默认用链上交易中的 authority 作为示例
  const userPubkey = process.argv[2]
    ? new PublicKey(process.argv[2])
    : new PublicKey("FSFB1mQqXc3cC57DHaKijHzcqMsnYHsueCWnLt97ePbD");

  console.log("Input user pubkey:", userPubkey.toBase58());
  console.log();

  const [userVolumeAccumulator, bump1] = calcUserVolumeAccumulator(userPubkey);
  console.log("userVolumeAccumulator:");
  console.log("  Address:", userVolumeAccumulator.toBase58());
  console.log("  Bump:   ", bump1);
  console.log();

  const [userVolumeAccumulatorAta, bump2] = calcUserVolumeAccumulatorAta(
    userVolumeAccumulator,
  );
  console.log("userVolumeAccumulatorAta (SOL ATA):");
  console.log("  Address:", userVolumeAccumulatorAta.toBase58());
  console.log("  Bump:   ", bump2);

  const new_fee_recipient = new PublicKey(
    "EHAAiTxcdDwQ3U4bU6YcMsQGaekdzLS3B5SmYo46kJtL",
  );

  const quoteMintForFeeRecipient = getAssociatedTokenAddressSync(
    SOL_MINT,
    new_fee_recipient,
    true,
  );
  console.log("quoteMintForFeeRecipient:");
  console.log("  Address:", quoteMintForFeeRecipient.toBase58());
}

main();
