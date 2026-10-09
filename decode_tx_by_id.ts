import {
  Connection,
  PublicKey,
  VersionedMessage,
  AddressLookupTableAccount,
} from "@solana/web3.js";
import bs58 from "bs58";
import { BN, BorshCoder, Idl } from "@coral-xyz/anchor";
import idl from "./ave_swap.json";

const PROGRAM_ID = new PublicKey(idl.address);

// Build map of known discriminators from IDL for CPI scanning
const knownDiscriminators = new Map<string, string>();
for (const ix of (idl as Idl).instructions) {
  const discHex = Buffer.from(ix.discriminator as number[]).toString("hex");
  knownDiscriminators.set(discHex, ix.name);
}

function formatMeta(meta: { isSigner: boolean; isWritable: boolean }): string {
  const sign = meta.isSigner ? "Signer" : "NonSigner";
  const write = meta.isWritable ? "Writable" : "Readonly";
  return `${sign} | ${write}`;
}

function getAccountMetaFromMessage(
  msg: VersionedMessage,
  index: number,
): { isSigner: boolean; isWritable: boolean } {
  const staticLen = msg.staticAccountKeys.length;

  if (index < staticLen) {
    const isSigner = index < msg.header.numRequiredSignatures;
    let isWritable: boolean;
    if (isSigner) {
      isWritable = index >= msg.header.numReadonlySignedAccounts;
    } else {
      const unsignedStart = msg.header.numRequiredSignatures;
      const unsignedCount = staticLen - unsignedStart;
      const writableUnsignedCount =
        unsignedCount - msg.header.numReadonlyUnsignedAccounts;
      isWritable = index < unsignedStart + writableUnsignedCount;
    }
    return { isSigner, isWritable };
  }

  let altIndex = staticLen;
  for (const lookup of msg.addressTableLookups) {
    const writableCount = lookup.writableIndexes.length;
    if (index < altIndex + writableCount) {
      return { isSigner: false, isWritable: true };
    }
    altIndex += writableCount;

    const readonlyCount = lookup.readonlyIndexes.length;
    if (index < altIndex + readonlyCount) {
      return { isSigner: false, isWritable: false };
    }
    altIndex += readonlyCount;
  }

  return { isSigner: false, isWritable: false };
}

function serializeArgs(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof BN) return obj.toString();
  if (obj instanceof Buffer || obj instanceof Uint8Array) {
    return {
      _type: "Buffer",
      hex: Buffer.from(obj).toString("hex"),
      base58: bs58.encode(Buffer.from(obj)),
    };
  }
  if (obj instanceof PublicKey) {
    return { _type: "PublicKey", base58: obj.toBase58() };
  }
  if (Array.isArray(obj)) return obj.map((item) => serializeArgs(item));
  if (typeof obj === "object") {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeArgs(value);
    }
    return result;
  }
  return obj;
}

function formatArgs(args: any, indent: string = "  "): string {
  return JSON.stringify(serializeArgs(args), null, 2).replace(
    /\n/g,
    "\n" + indent,
  );
}

async function main() {
  const txid = process.argv[2];
  if (!txid) {
    console.error("Usage: npx ts-node decode_tx_by_id.ts <TXID>");
    process.exit(1);
  }

  const conn = new Connection("https://api.mainnet-beta.solana.com");
  console.log("Fetching transaction:", txid);

  const tx = await conn.getTransaction(txid, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });

  if (!tx || !tx.transaction) {
    console.error("❌ Transaction not found or no data");
    process.exit(1);
  }

  const msg = tx.transaction.message;
  const coder = new BorshCoder(idl as Idl);

  console.log("\n✅ Transaction fetched");
  console.log("   Slot:", tx.slot);
  console.log("   Version:", msg.version);
  console.log("   Static accounts:", msg.staticAccountKeys.length);
  console.log("   Instructions:", msg.compiledInstructions.length);
  console.log(
    "   Header: numRequiredSignatures=",
    msg.header.numRequiredSignatures,
    "numReadonlySigned=",
    msg.header.numReadonlySignedAccounts,
    "numReadonlyUnsigned=",
    msg.header.numReadonlyUnsignedAccounts,
  );

  // Fetch ALTs
  const altAccs: AddressLookupTableAccount[] = [];
  if (msg.addressTableLookups.length > 0) {
    console.log("\n🔍 Fetching ALT accounts...");
    for (const lookup of msg.addressTableLookups) {
      const resp = await conn.getAddressLookupTable(lookup.accountKey);
      if (resp.value) {
        altAccs.push(resp.value);
        console.log("   ALT:", lookup.accountKey.toBase58());
      } else {
        console.log("   ⚠️ ALT not found:", lookup.accountKey.toBase58());
      }
    }
  }

  const accountKeys = msg.getAccountKeys({
    addressLookupTableAccounts: altAccs,
  });

  const allAccounts: PublicKey[] = [];
  for (let i = 0; i < accountKeys.length; i++) {
    const key = accountKeys.get(i);
    if (key) allAccounts.push(key);
  }

  console.log("\n📄 All Accounts:");
  allAccounts.forEach((k, i) => {
    const meta = getAccountMetaFromMessage(msg, i);
    console.log(
      `  [${i.toString().padStart(2)}] ${k.toBase58()}  →  ${formatMeta(meta)}`,
    );
  });

  console.log("\n📦 Instructions:");
  for (let idx = 0; idx < msg.compiledInstructions.length; idx++) {
    const ix = msg.compiledInstructions[idx];
    const programId = allAccounts[ix.programIdIndex];
    const data = Buffer.from(ix.data);

    console.log(`\n-- Instruction ${idx} --`);
    console.log("  Program ID:", programId.toBase58());
    console.log("  Data (hex):", data.toString("hex"));
    console.log("  Data (base58):", bs58.encode(data));

    let decoded = null;
    let decodeOffset = 0;

    // Try direct decode first (offset 0)
    decoded = coder.instruction.decode(data);

    // If direct decode fails, scan for known discriminators (CPI / proxy wrappers)
    if (!decoded) {
      for (const [discHex, ixName] of knownDiscriminators) {
        const disc = Buffer.from(discHex, "hex");
        let scanOffset = 0;
        while ((scanOffset = data.indexOf(disc, scanOffset)) !== -1) {
          try {
            const candidate = coder.instruction.decode(data.slice(scanOffset));
            if (candidate) {
              decoded = candidate;
              decodeOffset = scanOffset;
              break;
            }
          } catch (e) {
            // ignore decode errors at this offset
          }
          scanOffset++;
        }
        if (decoded) break;
      }
    }

    if (!decoded) {
      console.log("  ⚠️  Not an ave_swap instruction (discriminator mismatch)");
      continue;
    }

    if (!programId.equals(PROGRAM_ID)) {
      console.log(
        "  ⚠️  Outer Program ID does not match IDL, but data decodes as ave_swap (likely CPI/proxy)",
      );
    }

    if (decodeOffset > 0) {
      console.log(
        `  📍 Anchor data starts at byte offset ${decodeOffset} inside CPI data`,
      );
      console.log(
        `  ⚠️  Account mapping below is based on outer instruction keys; actual CPI accounts may differ`,
      );
    }

    console.log("  ✅ Method:", decoded.name);
    console.log("  Parameters:", formatArgs(decoded.data));

    const idlIx = (idl as Idl).instructions.find(
      (i) => i.name === decoded.name,
    );

    // Map accounts
    const accountMetas = ix.accountKeyIndexes.map((accountIndex, i) => {
      const pubkey = allAccounts[accountIndex];
      const meta = getAccountMetaFromMessage(msg, accountIndex);
      return { index: accountIndex, pubkey, meta };
    });

    const isDirectCall = programId.equals(PROGRAM_ID) && decodeOffset === 0;

    console.log("  Accounts:");
    if (idlIx && isDirectCall) {
      // Direct call: safe to map IDL account names in order
      accountMetas.forEach((am, i) => {
        const idlAccount = idlIx.accounts[i];
        const name = idlAccount
          ? idlAccount.name
          : `remaining_account[${i - idlIx.accounts.length}]`;
        const tag = am.meta.isWritable ? "📝 Writable" : "📖 Readonly";
        const signerTag = am.meta.isSigner ? " ✍️ Signer" : "";
        console.log(
          `    [${am.index}] ${am.pubkey.toBase58()}  ${tag}${signerTag}  →  ${name}`,
        );
      });
    } else {
      // CPI/Proxy: only list outer accounts with permissions, do NOT force IDL mapping
      accountMetas.forEach((am, i) => {
        const tag = am.meta.isWritable ? "📝 Writable" : "📖 Readonly";
        const signerTag = am.meta.isSigner ? " ✍️ Signer" : "";
        console.log(
          `    [${am.index}] ${am.pubkey.toBase58()}  ${tag}${signerTag}`,
        );
      });

      // Print IDL expected structure as reference
      if (idlIx) {
        console.log("  📋 IDL expected accounts (for reference):");
        idlIx.accounts.forEach((acc, i) => {
          const a = acc as any;
          const tags = [a.isMut ? "mut" : null, a.isSigner ? "signer" : null]
            .filter(Boolean)
            .join(", ");
          console.log(`    [${i}] ${a.name}  (${tags})`);
        });
        if (idlIx.accounts.length < accountMetas.length) {
          console.log(
            `    [${idlIx.accounts.length}..${accountMetas.length - 1}] remaining_accounts`,
          );
        }
      }
    }
  }

  console.log("\n✅ Done");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
