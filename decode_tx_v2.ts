import {
  Connection,
  VersionedTransaction,
  VersionedMessage,
  AddressLookupTableAccount,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { BN, BorshCoder, Idl } from "@coral-xyz/anchor";
import idl from "./ave_limit_order.json";
import base58 from "bs58";

const BASE64_TX = `AT/sSNQolCgXeYQLDYjoY2BeUxf/QmQ3fpwxZ5JH/NG9Flty2aUkNXJb0KeKTcUJ6/THW+bcgZrViJFUnjnnFAqAAQAFEiXPZDOkGZ+O1jz1+/p+NBIzElcAryjy6G6j0RBb99LwLcFgrcCKiij9fK01tndx1XbeNktIqEvm1OG50SdPCymqCSFapnDKCOe36DbQI83MT6y++pbmXAfBYeAHcKI6cnp3H3/KTn9svvfnloIqNvvOOBlFnBU2RHn0EuYOlGO/ciuq2VsITr2arhX4em/fq7wcBsXt0FXj4HlMRT9ZCvm9u5F5DOmG1Jd6xQwdDVHhthO6S6XNK3ZNkA1Ys2D3jV6PkRQA+dPG976Ku84YnXXjhCXf42gHRqd3JxFEMjHiy682vPDOmLHsViviyuSTdkyIWS16hf8TF6IHAoo4xu3ZwPWSGTXReaRVnueNKtnEIczcC9Sw5/X5LbYaqQtfkAPRbGIv3lYS4LzNuA/Rk9N613OXTIaLp0WQ57iZ0kX0RPwfePlKM9CQnF5rX7AhVwrY262N6P2z0g7RzZnrjk6l24Z8ecBh8dnAhWVZ9aS0LXVYP1PkU+UZ7RxwCct1DV1w2A6qx7YYmps6g7xCml462qR5y67JKJrCVi/zjjIrAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABtZZBDuqUqGBtYRCOejVQtH97c1oHOfnHQdSnayW4mrRu7UcV4UcOwjsAk1vl142pir3TFEo/X9IYDlwL9ac77AwZGb+UhFzL/7K26csOb57yM5bvF9xJrLEObOkAAAACTd3VrIp6VJOV4IyGeLf6RrMqhZQ3Qfo0ArK42DfBgAH4BRTO2MLz7IxDFHWFlDlxre8vNliu5DKYtteHR7HfUBBAACQPg/RwAAAAAABAABQIgoQcAESQAARICAxMUExQZGhscDR0eBBUDEgUGFhcfBw4BGAggIQ8JCgsncpYNwIz83R8AZc0dAAAAAAEAAAD6jJCzSQAAAAYAAAAAAQE8AAAADQIADAwCAAAAMIwRAAAAAAABN11o6XLUW5juApD9EKubZD6KDTr2cEX7mdjlbNR/XDYHEQcEKCMkOAkJCgwiJx8lQ0E=`;

function serializeArgs(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (obj instanceof BN) {
    return obj.toString();
  }
  if (obj instanceof Buffer || obj instanceof Uint8Array) {
    return {
      _type: "Buffer",
      hex: Buffer.from(obj).toString("hex"),
      base58: bs58.encode(Buffer.from(obj)),
    };
  }
  if (obj instanceof PublicKey) {
    return {
      _type: "PublicKey",
      base58: obj.toBase58(),
    };
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => serializeArgs(item));
  }
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
  const serialized = serializeArgs(args);
  return JSON.stringify(serialized, null, 2).replace(/\n/g, "\n" + indent);
}

/**
 * 根据 VersionedMessage 的 Header 和 ALT lookups 判断账户的真实权限
 */
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

function formatMeta(meta: { isSigner: boolean; isWritable: boolean }): string {
  const sign = meta.isSigner ? "Signer" : "NonSigner";
  const write = meta.isWritable ? "Writable" : "Readonly";
  return `${sign} | ${write}`;
}

(async () => {
  const conn = new Connection("https://api.mainnet-beta.solana.com");
  const coder = new BorshCoder(idl as Idl);
  const buf = Buffer.from(BASE64_TX, "base64");
  console.log("start decode");

  const vtx = VersionedTransaction.deserialize(buf);
  const msg = vtx.message;

  console.log("✅ VersionedTransaction 解析成功");
  console.log("   签名数:", vtx.signatures.length);
  console.log("   Version:", msg.version);
  console.log("   静态账户数:", msg.staticAccountKeys.length);
  console.log("   指令数:", msg.compiledInstructions.length);
  console.log(
    "   Header: numRequiredSignatures=",
    msg.header.numRequiredSignatures,
    "numReadonlySigned=",
    msg.header.numReadonlySignedAccounts,
    "numReadonlyUnsigned=",
    msg.header.numReadonlyUnsignedAccounts,
  );

  console.log(
    "\n✍️  签名列表:",
    vtx.signatures.map((s) => bs58.encode(s)),
  );

  const altAccs: AddressLookupTableAccount[] = [];

  if (msg.addressTableLookups.length > 0) {
    for (const lookup of msg.addressTableLookups) {
      console.log("🔍 发现 ALT:", lookup.accountKey.toBase58());
      const resp = await conn.getAddressLookupTable(lookup.accountKey);
      if (!resp.value)
        throw new Error(`ALT ${lookup.accountKey.toBase58()} 加载失败`);
      altAccs.push(resp.value);
    }
  }

  const msg_accountKeys = msg.getAccountKeys({
    addressLookupTableAccounts: altAccs,
  });

  let accountKeys: Array<PublicKey> = [];
  for (let i = 0; i < msg_accountKeys.length; i++) {
    const accountKEY = msg_accountKeys.get(i);
    if (accountKEY != null) {
      accountKeys.push(accountKEY);
    }
  }

  console.log("\n📄 所有账户:");
  accountKeys.forEach((k, i) => {
    const meta = getAccountMetaFromMessage(msg, i);
    console.log(
      `  [${i.toString().padStart(2)}] ${k.toBase58()}  →  ${formatMeta(meta)}`,
    );
  });

  console.log("\n📦 指令详情:");
  const reconstructedInstructions: TransactionInstruction[] = [];

  msg.compiledInstructions.forEach((ix, idx) => {
    const data = Buffer.from(ix.data);
    console.log("instruction data: ", data);
    const data58 = base58.encode(data);
    console.log("instruction data58: ", data58);
    const decoded = coder.instruction.decode(data);
    if (!decoded) {
      console.log(`❌ 第 ${idx} 条指令无法解码`);
      return;
    }

    const method = decoded.name;
    const args = decoded.data;
    const programId = accountKeys[ix.programIdIndex];

    const accountMetas = ix.accountKeyIndexes.map((i) => {
      const pubkey = accountKeys[i];
      const meta = getAccountMetaFromMessage(msg, i);
      return {
        pubkey,
        isSigner: meta.isSigner,
        isWritable: meta.isWritable,
      };
    });

    console.log(`\n-- 指令 ${idx + 1} --`);
    console.log("  ✅ 方法名:", method);
    console.log("  📥 参数:", formatArgs(args));
    console.log("  📥 账户:");
    accountMetas.forEach((meta, i) => {
      const tag = meta.isWritable ? "📝 Writable" : "📖 Readonly";
      const signerTag = meta.isSigner ? " ✍️ Signer" : "";
      console.log(
        `    [${i}] ${meta.pubkey.toBase58()}  ${tag}${signerTag}`,
      );
    });

    const reconstructedIx = new TransactionInstruction({
      keys: accountMetas,
      programId,
      data,
    });
    reconstructedInstructions.push(reconstructedIx);

    console.log("  🔧 构造的 TransactionInstruction:");
    console.log("     Program ID:", reconstructedIx.programId.toBase58());
    console.log("     Keys:");
    reconstructedIx.keys.forEach((key, i) => {
      const tag = key.isWritable ? "Writable" : "Readonly";
      const signerTag = key.isSigner ? "Signer" : "NonSigner";
      console.log(
        `       [${i}] ${key.pubkey.toBase58()}  →  ${signerTag} | ${tag}`,
      );
    });
    console.log("     Data (hex):", reconstructedIx.data.toString("hex"));
    console.log("     Data (base58):", bs58.encode(reconstructedIx.data));

    if ("steps" in args && Array.isArray(args.steps)) {
      const step = args.steps[0];
      console.log(step);
      if ("swap_type" in step) {
        console.log(step.swap_type);
      }
    }
    if ("taking_amount" in args) {
      console.log(args.taking_amount);
    }
    console.log("Program ID:", programId.toBase58());
    console.log("Data (hex):", Buffer.from(ix.data).toString("hex"));
    console.log("Data (base58):", bs58.encode(ix.data));

    const idlIx = (idl as Idl).instructions.find((ix) => ix.name === method);
    if (!idlIx) {
      console.log("  ⚠️ 无法找到对应 IDL 方法定义");
      return;
    }

    idlIx.accounts.forEach((acct, i) => {
      const meta = accountMetas[i];
      const rw = meta?.isWritable ? "Writable" : "Readonly";
      console.log(`  📌 ${acct.name}: ${meta?.pubkey.toBase58()} (${rw})`);
    });

    const remainingAccounts = accountMetas.slice(idlIx.accounts.length);
    remainingAccounts.forEach((meta, i) => {
      const rw = meta.isWritable ? "Writable" : "Readonly";
      console.log(
        `  📌 remaining_account[${i}]: ${meta.pubkey.toBase58()} (${rw})`,
      );
    });
  });

  console.log("\n" + "=".repeat(60));
  console.log("📋 所有重构的 TransactionInstruction 摘要:");
  reconstructedInstructions.forEach((ix, idx) => {
    console.log(`\n  指令 ${idx + 1}:`);
    console.log(`    Program ID: ${ix.programId.toBase58()}`);
    console.log(`    Accounts: ${ix.keys.length} 个`);
    ix.keys.forEach((k, i) => {
      const rw = k.isWritable ? "Writable" : "Readonly";
      const sg = k.isSigner ? "Signer" : "NonSigner";
      console.log(`      [${i}] ${k.pubkey.toBase58()}  →  ${sg} | ${rw}`);
    });
    console.log(`    Data 长度: ${ix.data.length} bytes`);
  });
})().catch((err) => console.error("❌ 解析失败:", err));
