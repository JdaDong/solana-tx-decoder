import {
  Connection,
  VersionedTransaction,
  Message,
  AddressLookupTableAccount,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { BN, BorshCoder, Idl } from "@coral-xyz/anchor";
import idl from "./ave_limit_order.json"; // 👈 你的 IDL
import base58 from "bs58";

// 你粘贴的 Base64 编码交易
// const BASE64_TX = `AYuyisCqOXorT8vlx0TB/CtWQ1tJ95ijULhF+7XM++OY36uIEcK5Hli8dx5oAcQph06Zp8GRQc57Y6ZBTik5YQeAAQACDwhqwNreLQm/Zz59vkQ5Fe7pNn1s2lT69KxHUlr4+x0xO1ptmcYhNG8SIlt/tgAMHCDnDL+tKH3E53L9y378ehZq8RHzQu2BNJKLCDgoPP9wdj2ZCjyDEFlfBtlmtO6g/3LX/9IKAh7+fq0MdA7aCCjlnIsgI4m7MRVBMWdTKFLGvANps295QP3TO/8cHLicBVurghd7shp6TUnfpyb6+q1XCbbdOrKE2R47091krftxxZpuTsvZV3QtWWhJ/WeSa9wqw9HTqz5O+SxkTPQwEVj3M+ONip2AoxOOo5PBD2AvNIVBeM6zTIFVNc7ZLP14H11Sq63QW3U59jHqZrNGcT5SwUv0n7i79kUJDUU+R8m6KqxVZ44m5dFd7h/SAGwOY5Z870z9vanZXxecbHdy8g+L+zH2yXfUcOTGQoxsU4Iv2bg3UCfAiJOmlGgyk+zZPxChuMtQfgyO5xffnBCnvQNmewW+YHjsCbZysa+obxgcr5lJ5/evsUaa4ZkRkxSEmYjx/6Oi3+YXvcTjVzJRoyLj/K6B5aRXOQ5kdRwApGXiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADBkZv5SEXMv/srbpyw5vnvIzlu8X3EmssQ5s6QAAAAJyhyNiCiGPvS/E99/hF9BUTbv4q4B4NPWujrTWCu1WSBQ4ACQMAAAAAAAAAAA4ABQJAQg8ABB0AAQ8CEAMEBREGEhMWFxgZDRobFBUHCAkcBhEKCyUSOMYXzdKo6gEAAAABAAAAAAAAAAgAAAAAAalIgbwHAAAAATIABAQAAQIPCFpn0RwHP6gEDQIADAwCAAAAgIQeAAAAAAABN11o6XLUW5juApD9EKubZD6KDTr2cEX7mdjlbNR/XDYHGxwRBAcTFAcJCgwiJxIV`;
const BASE64_TX = `AWWbgpX7cD5Rni2ZDwee6glD/UzUYpnAHWTt4VhzAC/Brt4zbzwkQb2VOY9+4IGvJGpA4YnZR4qP8OKThFlC/QOAAQADEaApBKNIB4MgIF3PsuWiVaoHMaSRUxIDkLdjVkLvrPcAGGLpvjP+3YPLB5MJCt2HP8P9YgfjS2kTpMbutNE0QMY/E+nltKMNJEZ3iQ7norYzs+Bx6AzQ3HMZRAUeZRgmj0hl97I3CfQxvw8ypUDBaZzCz0qXsN3PpsdT6s/IW5JkcLlbhyfTOxfyY662S5BYDomhdpZz7oTSeVJ92iyRh1WWrNH9cRfXyUmcZLozsSnLS1H5X40Hzahgl6hTVXOuqaIj1gcdBnvbKyrGZffGvPq13ew9ocls5eSOAiHlg0j0q8twZJlgQtcchwodueG+1nYa7NnoYzDqzx9OWcUxyMWsbwybiyMOgVxQQ55iwkA4qGpbHE1Ly5mUyYM61+R2bcneeOI1pYyVYLxjTs2wr6N5tuujdf7FSO27MzphULmky/a85blsXhrL+ZIhSnc3AiRkNNAgo5Hfh0lGKKf1I0rf8GIJjh9s/j5/3ndQxRz6eXi0TV/Vkpru3uVEWyosBOEZiaOD+f3hM+1MZRz75LZhS4FsoscNBr2FE85hE84t+Tu+AwDKmwRVCqhVhfY422pV6W/vrtrWQIkdgMTEoWIDBkZv5SEXMv/srbpyw5vnvIzlu8X3EmssQ5s6QAAAADXljQh7loevjdZAAgQE7ZTYirPnJXs2AAoKWkvDvHAVvANps295QP3TO/8cHLicBVurghd7shp6TUnfpyb6+q1rM5NZv1g3LfVNMX//OQi1n2/5pVdhCJeMlqjaF10IxwMOAAkDQA0DAAAAAAAOAAUCIKEHABAyAAUHBhEUEhQSHR4hGhkcGwMBCiUjDwgHFwIEDCIWDQskCRcgEx8TExUYExMTExMTExM0cpYNwIz83R+AsCkBAAAAAAIAAAABAAAAAAAAAA0AAAAAJCObTAIAAAAAAAAAAAEAUAAAAAE3XWjpctRbmO4CkP0Qq5tkPooNOvZwRfuZ2OVs1H9cNggRZU5mT0oPUA0NIkQnCQoXFgxFR0hG`;

/**
 * 递归序列化 args 中的对象，使其可以正确显示
 * 处理 BN、Buffer、PublicKey、数组、嵌套对象等
 */
function serializeArgs(obj: any): any {
  // 处理 null/undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // 处理 BN 类型
  if (obj instanceof BN) {
    return obj.toString();
  }

  // 处理 Buffer/Uint8Array
  if (obj instanceof Buffer || obj instanceof Uint8Array) {
    return {
      _type: "Buffer",
      hex: Buffer.from(obj).toString("hex"),
      base58: bs58.encode(Buffer.from(obj)),
    };
  }

  // 处理 PublicKey
  if (obj instanceof PublicKey) {
    return {
      _type: "PublicKey",
      base58: obj.toBase58(),
    };
  }

  // 处理数组
  if (Array.isArray(obj)) {
    return obj.map((item) => serializeArgs(item));
  }

  // 处理普通对象
  if (typeof obj === "object") {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeArgs(value);
    }
    return result;
  }

  // 其他基本类型直接返回
  return obj;
}

/**
 * 格式化打印 args，支持嵌套对象
 */
function formatArgs(args: any, indent: string = "  "): string {
  const serialized = serializeArgs(args);
  return JSON.stringify(serialized, null, 2).replace(/\n/g, "\n" + indent);
}

/**
 * 将解析出的参数和账户构造为 TransactionInstruction
 * @param programId 程序 ID
 * @param accounts 账户列表
 * @param decodedData 解码后的数据
 * @param coder BorshCoder 实例
 * @returns TransactionInstruction
 */
function buildTransactionInstruction(
  programId: PublicKey,
  accounts: PublicKey[],
  decodedData: { name: string; data: any },
  coder: BorshCoder,
): TransactionInstruction {
  // 使用 coder 重新编码指令数据
  const data = coder.instruction.encode(decodedData.name, decodedData.data);

  // 构造 AccountMeta 数组
  const keys = accounts.map((pubkey, index) => ({
    pubkey,
    isSigner: false, // 默认 false，需要根据 IDL 或上下文判断
    isWritable: false, // 默认 false，需要根据 IDL 或上下文判断
  }));

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}

/**
 * 根据 IDL 获取账户的 isSigner 和 isWritable 属性
 */
function getAccountMetaWithIdl(
  accounts: PublicKey[],
  idlIx: any,
  programId: PublicKey,
): { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[] {
  return accounts.map((pubkey, index) => {
    const idlAccount = idlIx.accounts[index];
    if (idlAccount) {
      return {
        pubkey,
        isSigner: idlAccount.isSigner || false,
        isWritable: idlAccount.isMut || false,
      };
    }
    // remaining accounts 默认非签名、非可写
    return {
      pubkey,
      isSigner: false,
      isWritable: false,
    };
  });
}

(async () => {
  const conn = new Connection("https://api.mainnet-beta.solana.com");
  const coder = new BorshCoder(idl as Idl);
  const buf = Buffer.from(BASE64_TX, "base64");
  console.log("start decode");
  const vtx = VersionedTransaction.deserialize(buf);

  console.log("start decode end");

  console.log(
    "✅ 签名列表:",
    vtx.signatures.map((s) => bs58.encode(s)),
  );

  const altAccs: AddressLookupTableAccount[] = [];

  for (const lookup of vtx.message.addressTableLookups) {
    console.log("🔍 发现 ALT:", lookup.accountKey.toBase58());
    const resp = await conn.getAddressLookupTable(lookup.accountKey);
    if (!resp.value)
      throw new Error(`ALT ${lookup.accountKey.toBase58()} 加载失败`);
    altAccs.push(resp.value);
  }

  const msg_accountKeys = vtx.message.getAccountKeys({
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
  accountKeys.forEach((k, i) => console.log(i, k.toBase58()));

  console.log("\n📦 指令详情:");
  const reconstructedInstructions: TransactionInstruction[] = [];

  vtx.message.compiledInstructions.forEach((ix, idx) => {
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
    const accounts = ix.accountKeyIndexes.map((i) => accountKeys[i]);

    console.log(`\n-- 指令 ${idx + 1} --`);
    console.log("  ✅ 方法名:", method);
    console.log("  📥 参数:", formatArgs(args));
    console.log(
      "  📥 账户:",
      accounts.map((a) => a.toBase58()),
    );

    // 查找 IDL 中的指令定义
    const idlIx = (idl as Idl).instructions.find((ix) => ix.name === method);

    // 构造 TransactionInstruction
    let reconstructedIx: TransactionInstruction;
    if (idlIx) {
      // 使用 IDL 中的账户信息
      const keys = getAccountMetaWithIdl(accounts, idlIx, programId);
      const instructionData = coder.instruction.encode(method, args);
      reconstructedIx = new TransactionInstruction({
        keys,
        programId,
        data: instructionData,
      });
    } else {
      // 没有 IDL 信息时使用默认构造
      reconstructedIx = buildTransactionInstruction(
        programId,
        accounts,
        decoded,
        coder,
      );
    }
    reconstructedInstructions.push(reconstructedIx);

    // 显示构造的 TransactionInstruction 信息
    console.log("  🔧 构造的 TransactionInstruction:");
    console.log("     Program ID:", reconstructedIx.programId.toBase58());
    console.log("     Keys:");
    reconstructedIx.keys.forEach((key, i) => {
      console.log(
        `       [${i}] ${key.pubkey.toBase58()} isSigner=${key.isSigner} isWritable=${key.isWritable}`,
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

    if (!idlIx) {
      console.log("  ⚠️ 无法找到对应 IDL 方法定义");
      return;
    }

    // 显示账户地址对应字段名
    idlIx.accounts.forEach((acct, i) => {
      console.log(`  📌 ${acct.name}: ${accounts[i]?.toBase58()}`);
    });

    // 剩余的是 remaining_accounts
    const remainingAccounts = accounts
      .slice(idlIx.accounts.length)
      .map((pubkey, i) => ({
        name: `remaining_account[${i}]`,
        pubkey: pubkey.toBase58(),
      }));

    remainingAccounts.forEach((acct, i) => {
      console.log(`  📌 ${acct.name}: ${remainingAccounts[i]?.pubkey}`);
    });
  });

  // 显示所有重构的指令
  console.log("\n" + "=".repeat(60));
  console.log("📋 所有重构的 TransactionInstruction 摘要:");
  reconstructedInstructions.forEach((ix, idx) => {
    console.log(`\n  指令 ${idx + 1}:`);
    console.log(`    Program ID: ${ix.programId.toBase58()}`);
    console.log(`    Accounts: ${ix.keys.length} 个`);
    console.log(`    Data 长度: ${ix.data.length} bytes`);
  });
})().catch((err) => console.error("❌ 解析失败:", err));
