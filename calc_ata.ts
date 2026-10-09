import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

const args = process.argv.slice(2);

let mintStr = "So11111111111111111111111111111111111111112"; // default: wSOL
let allowOwnerOffCurve = true;
const owners: string[] = [];

for (let i = 0; i < args.length; i++) {
  if ((args[i] === "--mint" || args[i] === "-m") && i + 1 < args.length) {
    mintStr = args[i + 1];
    i++;
  } else if (args[i] === "--strict") {
    allowOwnerOffCurve = false;
  } else {
    owners.push(args[i]);
  }
}

if (owners.length === 0) {
  console.error(
    "Usage: npx ts-node calc_ata.ts <owner1> [owner2] ... [--mint <mint>]",
  );
  console.error("");
  console.error("Examples:");
  console.error(
    "  npx ts-node calc_ata.ts EKbDbkV88Yi3n9oVAC5pVJHDSyBPwGdF1J3i2Hp4cN5v",
  );
  console.error(
    "  npx ts-node calc_ata.ts owner1 owner2 --mint 3Ln2EH9txLwMjLP4NEcLuEfGEbwb1pKjUyiMfKYDpump",
  );
  console.error(
    "  npx ts-node calc_ata.ts ownerPda --mint ... --strict   (reject off-curve owners)",
  );
  process.exit(1);
}

let mint: PublicKey;
try {
  mint = new PublicKey(mintStr);
} catch (e) {
  console.error(`❌ Invalid mint address: ${mintStr}`);
  process.exit(1);
}

const tokenPrograms = [
  {
    name: "SPL Token",
    program: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
  },
  {
    name: "Token-2022",
    program: new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"),
  },
];

console.log(`Mint: ${mintStr}`);
console.log("=".repeat(64));

for (const ownerStr of owners) {
  let owner: PublicKey;
  try {
    owner = new PublicKey(ownerStr);
  } catch (e) {
    console.error(`\n❌ Invalid owner address: ${ownerStr}`);
    continue;
  }

  console.log(`\nOwner: ${ownerStr}`);
  for (const { name, program } of tokenPrograms) {
    try {
      const ata = getAssociatedTokenAddressSync(
        mint,
        owner,
        allowOwnerOffCurve,
        program,
      );
      console.log(`  [${name}] ATA: ${ata.toBase58()}`);
    } catch (e: any) {
      console.log(`  [${name}] Error: ${e.message}`);
    }
  }
}
