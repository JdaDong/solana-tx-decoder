import {
  Connection,
  VersionedTransaction,
  VersionedMessage,
  AddressLookupTableAccount,
  PublicKey,
} from "@solana/web3.js";
import bs58 from "bs58";
import { BN, BorshCoder, Idl } from "@coral-xyz/anchor";
import idl from "./ave_swap.json";

const PROGRAM_ID = new PublicKey(idl.address);

const BASE64_TX =
  process.argv[2] ||
  `AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQADEaApBKNIB4MgIF3PsuWiVaoHMaSRUxIDkLdjVkLvrPcAGGLpvjP+3YPLB5MJCt2HP8P9YgfjS2kTpMbutNE0QMYtCrcRpjxCpQoh1NxUEnOCWYaqa06VLP/W3np8dLLlyD8T6eW0ow0kRneJDueitjOz4HHoDNDccxlEBR5lGCaPSGX3sjcJ9DG/DzKlQMFpnMLPSpew3c+mx1Pqz8hbkmRwuVuHJ9M7F/JjrrZLkFgOiaF2lnPuhNJ5Un3aLJGHVZas0f1xF9fJSZxkujOxKctLUflfjQfNqGCXqFNVc66poiPWBx0Ge9srKsZl98a8+rXd7D2hyWzl5I4CIeWDSPSry3BkmWBC1xyHCh254b7Wdhrs2ehjMOrPH05ZxTHIxaxvDJuLIw6BXFBDnmLCQDioalscTUvLmZTJgzrX5HZtyd544jWljJVgvGNOzbCvo3m266N1/sVI7bszOmFQuaTL9rzluWxeGsv5kiFKdzcCJGQ00CCjkd+HSUYop/UjSuEZiaOD+f3hM+1MZRz75LZhS4FsoscNBr2FE85hE84t+Tu+AwDKmwRVCqhVhfY422pV6W/vrtrWQIkdgMTEoWIDBkZv5SEXMv/srbpyw5vnvIzlu8X3EmssQ5s6QAAAADXljQh7loevjdZAAgQE7ZTYirPnJXs2AAoKWkvDvHAVvANps295QP3TO/8cHLicBVurghd7shp6TUnfpyb6+q2PkajFE5RJhi6sqwgSLPFqfdk/JUaP5R/ovuRcmO49RQMOAAkDQA0DAAAAAAAOAAUCIKEHABAyAAcRBggUEhQSHR4hGhkcIBMfExMVGBMTExMTExMTChcbBAELJSMPCRcIAwUMIhYNAiQ0cpYNwIz83R+ghgEAAAAAAAIAAAABAAAAAAAAAAAAAAAAxGkaAAAAAAANAAAAAAEBUAAAAAE3XWjpctRbmO4CkP0Qq5tkPooNOvZwRfuZ2OVs1H9cNggRZU5mT0oPUA0NIkQnCQoXFgxFR0hG`;

// Build map of known discriminators from IDL for CPI scanning
const knownDiscriminators = new Map<string, string>();
for (const ix of (idl as Idl).instructions) {
  const discHex = Buffer.from((ix as any).discriminator as number[]).toString("hex");
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
  const conn = new Connection("https://api.mainnet-beta.solana.com");
  const coder = new BorshCoder(idl as Idl);
  const buf = Buffer.from(BASE64_TX, "base64");
  const vtx = VersionedTransaction.deserialize(buf);
  const msg = vtx.message;

  console.log("✅ VersionedTransaction parsed");
  console.log("   Signatures:", vtx.signatures.length);
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

  console.log(
    "\n✍️  Signatures:",
    vtx.signatures.map((s) => bs58.encode(s)),
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

    // Try direct decode first
    decoded = coder.instruction.decode(data);

    // If direct decode fails, scan for known discriminators (CPI/proxy)
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
          } catch (e) {}
          scanOffset++;
        }
        if (decoded) break;
      }
    }

    if (!decoded) {
      console.log("  ⚠️  Not an ave_swap instruction");
      continue;
    }

    if (!programId.equals(PROGRAM_ID)) {
      console.log(
        "  ⚠️  Outer Program ID does not match IDL (CPI/proxy)",
      );
    }

    if (decodeOffset > 0) {
      console.log(
        `  📍 Anchor data starts at byte offset ${decodeOffset}`,
      );
    }

    console.log("  ✅ Method:", decoded.name);
    console.log("  Parameters:", formatArgs(decoded.data));

    const idlIx = (idl as Idl).instructions.find(
      (i) => i.name === decoded.name,
    );

    // Map accounts
    const accountMetas = ix.accountKeyIndexes.map((accountIndex) => {
      const pubkey = allAccounts[accountIndex];
      const meta = getAccountMetaFromMessage(msg, accountIndex);
      return { index: accountIndex, pubkey, meta };
    });

    // Direct call = discriminator at offset 0 (even if programId differs, e.g. devnet vs mainnet)
    const isDirectCall = decodeOffset === 0;

    console.log("  Accounts:");
    if (idlIx && isDirectCall) {
      accountMetas.forEach((am, i) => {
        const idlAccount = idlIx.accounts[i];
        const name = idlAccount
          ? (idlAccount as any).name
          : `remaining_account[${i - idlIx.accounts.length}]`;
        const tag = am.meta.isWritable ? "📝 Writable" : "📖 Readonly";
        const signerTag = am.meta.isSigner ? " ✍️ Signer" : "";
        console.log(
          `    [${am.index}] ${am.pubkey.toBase58()}  ${tag}${signerTag}  →  ${name}`,
        );
      });
    } else {
      accountMetas.forEach((am) => {
        const tag = am.meta.isWritable ? "📝 Writable" : "📖 Readonly";
        const signerTag = am.meta.isSigner ? " ✍️ Signer" : "";
        console.log(
          `    [${am.index}] ${am.pubkey.toBase58()}  ${tag}${signerTag}`,
        );
      });
      if (idlIx) {
        console.log("  📋 IDL expected accounts (reference):");
        idlIx.accounts.forEach((acc, i) => {
          const a = acc as any;
          const tags = [a.isMut ? "mut" : null, a.isSigner ? "signer" : null]
            .filter(Boolean)
            .join(", ");
          console.log(`    [${i}] ${a.name}  (${tags})`);
        });
      }
    }
  }

  console.log("\n✅ Done");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
