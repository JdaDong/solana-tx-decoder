import {
  Connection,
  VersionedTransaction,
  AddressLookupTableAccount,
  PublicKey,
  TransactionInstruction,
  ComputeBudgetProgram,
  TransactionMessage,
} from "@solana/web3.js";
import bs58 from "bs58";
import { BN, BorshCoder, Idl } from "@coral-xyz/anchor";
import idl from "./ave_limit_order.json";
import * as fs from "fs";

// 要解析的 Base64 交易
const BASE64_TX = `AbP1yUOPp8siO2TA2QRQlwwWhu41/Gc1/QMs8h7ljsiOV5Gm8jUs0dahxtfMM52gkmImQYAe0x+kwUqVL6cckgOAAQADFW+AryQoX4bzqVSCSZsMAeo8qF7bwrLsvz3biN+rihVspLcQtsHDiseesrv5MTqg0n9gaDdDTc2aQ54tMGP+F+7KR19hUWNEukoq2qKbUZujJphEmyXVeX4T5yXItxsqb84xJgznBRJz1/+IFZQ9urO8EnLOQNgoqHX3HQSEu60jMD45H0Xh4sdG/mwBwzkO/JQokC7Nb8QqX0y+ENK1X0gPoIu1YnE6T37lxoCw4+KnKkNlUhJZz68pKoFg2Zq0MYGThZ2Vl3JMnavEZSgmPUbFuQKnAUump6OIHD5jyl/lWCv5QbOvoCXe3V+eCJfuY5HsyrvYi+81mX9Wh2ofqf4mfq9QzblCN+NQybcYbTbSIkktBrHaceFnVGzz2BzEsHHHCCn/Xiypm/zQRuEGKRzP9JughmCT3QutFNP7xNCnGip/Z3nWCL//b7DMHEzhpL+wGdv8bXF7mnCAtenOTSveA+ELnegTx0KWaUAM/Ei+7wJkys0IDCH5tga2OFy8oZg1wH9OZNloWpRBOhpHbPoIwQTWIYGucccNR+UnvWRhlMthC2WflKoBh1VmZ4e4IJH/3p3doAciTYfdF4M2+MZHV3fPjZGHgoGB7cB7fOFImTi7C6b4Nab4eQ2EFdIzjdTNQu4NEStr+bBhrHtO3L90ZoD7Z8P4pGMH0Fq/Y+7ddsSnx2/XuqatZ6IqrjH6tsjf8WtJI2Thdm29ngGENcClqOHAC01IDYbEtaV6gjPyxnrFibhsIZht/oyVYm8ikhhVJn37BHD1JWloDcQDWMGQ1CGRgDUjJ3B8xxv/lxqGAwZGb+UhFzL/7K26csOb57yM5bvF9xJrLEObOkAAAACTd3VrIp6VJOV4IyGeLf6RrMqhZQ3Qfo0ArK42DfBgADthACIedhiMMKlQZCegfhAfEqomUGGyD5yowaDiXVhBAxMACQNAHwAAAAAAABMABQIgoQcAFCsAAQIDFQQFBQQaGxwdHh8gFhcGBwghAhgBCRkKIiMSCRgkCxgVDA0ODxARRHKWDcCM/N0f9UZN6U4AAAACAAAAAQAAAAAAAAAIAAAAAF00IQAAAAAAA1A7AQABAAAAAAAAAAAAAAAAAAAAAQBQAAAAATddaOly1FuY7gKQ/RCrm2Q+ig069nBF+5nY5WzUf1w2BRATLRE3CwkKDCINJxIVQkEY`;

/**
 * 递归序列化 args 中的对象
 */
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

/**
 * 将 camelCase 转换为 snake_case
 */
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * 生成 TypeScript 代码
 */
function generateTypeScriptCode(
  decodedResult: {
    method: string;
    args: any;
    accounts: PublicKey[];
    remainingAccounts: PublicKey[];
    programId: PublicKey;
    idlIx: any;
  }[],
  altAddresses: PublicKey[],
): string {
  const code: string[] = [];

  // 头部导入
  code.push(`import {
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
const PROGRAM_ID = new PublicKey("${decodedResult[0].programId.toBase58()}");

// ALT Addresses
const ALT_ADDRESSES = [${altAddresses.map((a) => `new PublicKey("${a.toBase58()}")`).join(", ")}];

`);

  // 为每个指令生成代码
  decodedResult.forEach((result, idx) => {
    const fnName = `build${result.method
      .split("_")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join("")}Instruction`;

    code.push(
      `// ========== Instruction ${idx + 1}: ${result.method} ==========`,
    );
    code.push("");

    // 生成账户常量定义
    code.push(`// Accounts for ${result.method}`);
    const allAccounts = [...result.accounts, ...result.remainingAccounts];

    // 主要账户（来自 IDL）
    if (result.idlIx) {
      result.idlIx.accounts.forEach((acct: any, i: number) => {
        if (i < result.accounts.length) {
          const constName = toSnakeCase(acct.name).toUpperCase();
          code.push(
            `const ${constName} = new PublicKey("${result.accounts[i].toBase58()}"); // ${acct.name}`,
          );
        }
      });
    }

    // Remaining accounts
    if (result.remainingAccounts.length > 0) {
      code.push("");
      code.push("// Remaining accounts");
      result.remainingAccounts.forEach((acc, i) => {
        code.push(`const REMAINING_${i} = new PublicKey("${acc.toBase58()}");`);
      });
    }

    code.push("");

    // 生成参数类型定义
    const serializedArgs = serializeArgs(result.args);
    code.push(`// Args for ${result.method}`);
    code.push(`const ${result.method.toUpperCase()}_ARGS = {`);

    Object.entries(serializedArgs).forEach(([key, value]) => {
      if (key === "args") {
        code.push(`  ${key}: {`);
        Object.entries(value as any).forEach(([k, v]) => {
          if (k === "steps" && Array.isArray(v)) {
            code.push(`    ${k}: [`);
            v.forEach((step) => {
              code.push(`      {`);
              Object.entries(step).forEach(([sk, sv]) => {
                if (sk === "swapType" || sk === "swap_type") {
                  // 处理 swap type
                  const swapTypeVal = sv as any;
                  if (swapTypeVal.PumpfunBondingCurve !== undefined) {
                    code.push(`        swapType: { pumpfunBondingCurve: {} },`);
                  } else if (swapTypeVal.Orca !== undefined) {
                    const sqrtPriceLimit =
                      swapTypeVal.Orca.sqrt_price_limit ||
                      swapTypeVal.Orca.sqrtPriceLimit;
                    code.push(
                      `        swapType: { orca: { sqrtPriceLimit: new BN("${sqrtPriceLimit}") } },`,
                    );
                  } else if (swapTypeVal.pumpFunAmm !== undefined) {
                    code.push(`        swapType: { pumpFunAmm: {} },`);
                  } else {
                    code.push(`        swapType: ${JSON.stringify(sv)},`);
                  }
                } else if (sk === "minAmountOut" || sk === "min_amount_out") {
                  code.push(`        minAmountOut: new BN("${sv}"),`);
                } else if (
                  sk === "remainingAccountsCount" ||
                  sk === "remaining_accounts_count"
                ) {
                  code.push(`        remainingAccountsCount: ${sv},`);
                } else {
                  code.push(`        ${sk}: ${JSON.stringify(sv)},`);
                }
              });
              code.push(`      },`);
            });
            code.push(`    ],`);
          } else if (k === "amountIn" || k === "amount_in") {
            code.push(`    ${k}: new BN("${v}"),`);
          } else {
            code.push(`    ${k}: ${JSON.stringify(v)},`);
          }
        });
        code.push(`  },`);
      } else if (typeof value === "boolean") {
        code.push(`  ${key}: ${value},`);
      } else if (typeof value === "number") {
        code.push(`  ${key}: ${value},`);
      } else if (typeof value === "string" && !isNaN(Number(value))) {
        code.push(`  ${key}: new BN("${value}"),`);
      } else {
        code.push(`  ${key}: ${JSON.stringify(value)},`);
      }
    });
    code.push(`};`);
    code.push("");

    // 生成函数
    code.push(`/**
 * Build ${result.method} instruction
 */
async function ${fnName}(program: Program): Promise<TransactionInstruction> {`);

    // Accounts 对象
    code.push(`  const accounts = {`);
    if (result.idlIx) {
      result.idlIx.accounts.forEach((acct: any) => {
        const constName = toSnakeCase(acct.name).toUpperCase();
        code.push(`    ${acct.name}: ${constName},`);
      });
    }
    code.push(`  };`);
    code.push("");

    // Remaining accounts
    if (result.remainingAccounts.length > 0) {
      code.push(`  const remainingAccounts = [`);
      result.remainingAccounts.forEach((_, i) => {
        code.push(
          `    { pubkey: REMAINING_${i}, isWritable: true, isSigner: false },`,
        );
      });
      code.push(`  ];`);
      code.push("");
    }

    // 构造指令
    const args = result.args;
    code.push(`  const ix = await program.methods`);
    code.push(`    .${result.method}(`);

    // 提取函数参数
    const fnArgs: string[] = [];
    Object.entries(args).forEach(([key, value]) => {
      if (key === "args") {
        fnArgs.push(`${result.method.toUpperCase()}_ARGS.args`);
      } else if (typeof value === "boolean") {
        fnArgs.push(String(value));
      } else if (typeof value === "number") {
        fnArgs.push(String(value));
      } else if (value instanceof BN) {
        fnArgs.push(`new BN("${(value as BN).toString()}")`);
      } else {
        fnArgs.push(JSON.stringify(value));
      }
    });
    code.push(`      ${fnArgs.join(", ")}`);
    code.push(`    )`);
    code.push(`    .accounts(accounts)`);
    if (result.remainingAccounts.length > 0) {
      code.push(`    .remainingAccounts(remainingAccounts)`);
    }
    code.push(`    .instruction();`);
    code.push("");
    code.push(`  return ix;`);
    code.push(`}`);
    code.push("");
  });

  // 主函数
  code.push(`// ========== Main Function ==========`);
  code.push("");
  code.push(`async function main() {`);
  code.push(
    `  const connection = new Connection("https://api.mainnet-beta.solana.com");`,
  );
  code.push(`  const wallet = NodeWallet.local(); // Replace with your wallet`);
  code.push(
    `  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });`,
  );
  code.push(`  const program = new Program(idl as any, PROGRAM_ID, provider);`);
  code.push("");
  code.push(`  console.log("Building instructions...");`);
  code.push("");

  // 构造所有指令
  const ixs: string[] = [];
  decodedResult.forEach((result, idx) => {
    const fnName = `build${result.method
      .split("_")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join("")}Instruction`;
    code.push(`  // Build instruction ${idx + 1}: ${result.method}`);
    code.push(`  const ix${idx + 1} = await ${fnName}(program);`);
    ixs.push(`ix${idx + 1}`);
  });

  code.push("");
  code.push(`  const instructions = [${ixs.join(", ")}];`);
  code.push("");

  // 获取 ALT
  code.push(`  // Load ALTs`);
  code.push(`  const altAccounts = await Promise.all(`);
  code.push(`    ALT_ADDRESSES.map((addr) =>`);
  code.push(`      connection.getAddressLookupTable(addr).then((res) => {`);
  code.push(
    `        if (!res.value) throw new Error(\`ALT \${addr.toBase58()} not found\`);`,
  );
  code.push(`        return res.value;`);
  code.push(`      })`);
  code.push(`    )`);
  code.push(`  );`);
  code.push("");

  // 构造交易
  code.push(`  // Build transaction`);
  code.push(`  const { blockhash } = await connection.getLatestBlockhash();`);
  code.push(`  const messageV0 = new TransactionMessage({`);
  code.push(`    payerKey: wallet.publicKey,`);
  code.push(`    recentBlockhash: blockhash,`);
  code.push(`    instructions,`);
  code.push(`  }).compileToV0Message(altAccounts);`);
  code.push("");
  code.push(`  const transaction = new VersionedTransaction(messageV0);`);
  code.push(`  `);
  code.push(`  // Sign and send (uncomment to execute)`);
  code.push(`  // transaction.sign([wallet.payer]);`);
  code.push(
    `  // const signature = await connection.sendTransaction(transaction, { skipPreflight: true });`,
  );
  code.push(`  // console.log("Transaction sent:", signature);`);
  code.push("");
  code.push(`  console.log("Transaction built successfully!");`);
  code.push(
    `  console.log("Serialized (base64):", Buffer.from(transaction.serialize()).toString("base64"));`,
  );
  code.push("");
  code.push(`  return transaction;`);
  code.push(`}`);
  code.push("");
  code.push(`main()`);
  code.push(`  .then(() => process.exit(0))`);
  code.push(`  .catch((err) => {`);
  code.push(`    console.error(err);`);
  code.push(`    process.exit(1);`);
  code.push(`  });`);

  return code.join("\n");
}

/**
 * 主函数：解析交易并生成代码
 */
async function main() {
  const conn = new Connection("https://api.mainnet-beta.solana.com");
  const coder = new BorshCoder(idl as Idl);

  console.log("🔍 开始解析交易...\n");

  const buf = Buffer.from(BASE64_TX, "base64");
  const vtx = VersionedTransaction.deserialize(buf);

  console.log(
    "✅ 签名列表:",
    vtx.signatures.map((s) => bs58.encode(s)),
  );

  // 加载 ALTs
  const altAddresses: PublicKey[] = [];
  const altAccs: AddressLookupTableAccount[] = [];

  for (const lookup of vtx.message.addressTableLookups) {
    console.log("🔍 发现 ALT:", lookup.accountKey.toBase58());
    altAddresses.push(lookup.accountKey);
    const resp = await conn.getAddressLookupTable(lookup.accountKey);
    if (!resp.value)
      throw new Error(`ALT ${lookup.accountKey.toBase58()} 加载失败`);
    altAccs.push(resp.value);
  }

  // 获取所有账户
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
  accountKeys.forEach((k, i) => console.log(`  [${i}] ${k.toBase58()}`));

  // 解析指令
  console.log("\n📦 解析指令...\n");
  const decodedResults: {
    method: string;
    args: any;
    accounts: PublicKey[];
    remainingAccounts: PublicKey[];
    programId: PublicKey;
    idlIx: any;
  }[] = [];

  vtx.message.compiledInstructions.forEach((ix, idx) => {
    const data = Buffer.from(ix.data);
    const decoded = coder.instruction.decode(data);

    if (!decoded) {
      console.log(`❌ 第 ${idx} 条指令无法解码`);
      return;
    }

    const method = decoded.name;
    const args = decoded.data;
    const programId = accountKeys[ix.programIdIndex];
    const accounts = ix.accountKeyIndexes.map((i) => accountKeys[i]);

    console.log(`-- 指令 ${idx + 1}: ${method} --`);
    console.log("  Program ID:", programId.toBase58());

    // 查找 IDL
    const idlIx = (idl as Idl).instructions.find((ix) => ix.name === method);

    // 分离主要账户和 remaining accounts
    let mainAccounts: PublicKey[] = accounts;
    let remainingAccounts: PublicKey[] = [];

    if (idlIx) {
      mainAccounts = accounts.slice(0, idlIx.accounts.length);
      remainingAccounts = accounts.slice(idlIx.accounts.length);

      console.log("  主要账户:");
      idlIx.accounts.forEach((acct: any, i: number) => {
        if (i < mainAccounts.length) {
          console.log(`    ${acct.name}: ${mainAccounts[i].toBase58()}`);
        }
      });

      if (remainingAccounts.length > 0) {
        console.log("  Remaining accounts:");
        remainingAccounts.forEach((acc, i) => {
          console.log(`    [${i}] ${acc.toBase58()}`);
        });
      }
    }

    console.log("  参数:", JSON.stringify(serializeArgs(args), null, 2));
    console.log("");

    decodedResults.push({
      method,
      args,
      accounts: mainAccounts,
      remainingAccounts,
      programId,
      idlIx,
    });
  });

  // 生成 TypeScript 代码
  console.log("📝 生成 TypeScript 代码...\n");
  const generatedCode = generateTypeScriptCode(decodedResults, altAddresses);

  // 保存到文件
  const outputFile = "generated_transaction.ts";
  fs.writeFileSync(outputFile, generatedCode);
  console.log(`✅ 代码已保存到: ${outputFile}`);

  // 同时打印到控制台
  console.log("\n" + "=".repeat(80));
  console.log("生成的代码预览:");
  console.log("=".repeat(80));
  console.log(generatedCode);
}

main().catch((err) => {
  console.error("❌ 错误:", err);
  process.exit(1);
});
