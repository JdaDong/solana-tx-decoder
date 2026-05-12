import {
    Connection,
    VersionedTransaction,
    Message,
    AddressLookupTableAccount,
    PublicKey
  } from "@solana/web3.js";
  import bs58 from "bs58";
  import { BN, BorshCoder, Idl } from "@coral-xyz/anchor";
import idl from "./jupiter.json"; // 👈 你的 IDL
import base58 from "bs58";
  
  // 你粘贴的 Base64 编码交易
  // const BASE64_TX = `AYuyisCqOXorT8vlx0TB/CtWQ1tJ95ijULhF+7XM++OY36uIEcK5Hli8dx5oAcQph06Zp8GRQc57Y6ZBTik5YQeAAQACDwhqwNreLQm/Zz59vkQ5Fe7pNn1s2lT69KxHUlr4+x0xO1ptmcYhNG8SIlt/tgAMHCDnDL+tKH3E53L9y378ehZq8RHzQu2BNJKLCDgoPP9wdj2ZCjyDEFlfBtlmtO6g/3LX/9IKAh7+fq0MdA7aCCjlnIsgI4m7MRVBMWdTKFLGvANps295QP3TO/8cHLicBVurghd7shp6TUnfpyb6+q1XCbbdOrKE2R47091krftxxZpuTsvZV3QtWWhJ/WeSa9wqw9HTqz5O+SxkTPQwEVj3M+ONip2AoxOOo5PBD2AvNIVBeM6zTIFVNc7ZLP14H11Sq63QW3U59jHqZrNGcT5SwUv0n7i79kUJDUU+R8m6KqxVZ44m5dFd7h/SAGwOY5Z870z9vanZXxecbHdy8g+L+zH2yXfUcOTGQoxsU4Iv2bg3UCfAiJOmlGgyk+zZPxChuMtQfgyO5xffnBCnvQNmewW+YHjsCbZysa+obxgcr5lJ5/evsUaa4ZkRkxSEmYjx/6Oi3+YXvcTjVzJRoyLj/K6B5aRXOQ5kdRwApGXiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADBkZv5SEXMv/srbpyw5vnvIzlu8X3EmssQ5s6QAAAAJyhyNiCiGPvS/E99/hF9BUTbv4q4B4NPWujrTWCu1WSBQ4ACQMAAAAAAAAAAA4ABQJAQg8ABB0AAQ8CEAMEBREGEhMWFxgZDRobFBUHCAkcBhEKCyUSOMYXzdKo6gEAAAABAAAAAAAAAAgAAAAAAalIgbwHAAAAATIABAQAAQIPCFpn0RwHP6gEDQIADAwCAAAAgIQeAAAAAAABN11o6XLUW5juApD9EKubZD6KDTr2cEX7mdjlbNR/XDYHGxwRBAcTFAcJCgwiJxIV";

  const BASE64_TX= `AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAHFNGiKrt9gR7fBjT021WcGxd+Wvw1i4YGQWEO/eQ/iXSnC0gHT3W46jBpye0/BrwyGXgq5M2OXJ03SYJWsZhLnVAZp6VFpcPooR2mBMwNRTekzkUvU7xln2UwBMIberdjXC4kY6mAxO7LtSi80vmeoLkygX9rMNxf/kH75erwBXL8MZPvZ5tmKtYc2jCVscD1+kCnIaDLHriGUzf/U0xwoRs2127Kv/2T8QygowvRPWOonuQw23zo2hmQk3xWx+EM/DqbTIc9ehFMYRwd3P6haMMSc7W/Y9sRL81+rO9LFqlrWO9nf7VjXmRzcktw4WtkBVQDTqR6HHs/zYiFPEFdMlRgUpixIVPEc+V18jssXEzK4RU4GtSznsFVPlQgEzKPqGMoJSESjHe/3VNzUsMSMIzVYlCeHRfQrCS+OiUADQANckgcXDTpbmin3JABdQDw57ffKNCdH+APNPr3HsVSfxJ5F8BzaVowFWJSaMELtc/Y5cwkXdfmpDsGhthjwbga0cZ1oBR/5cfGjS9i2HgN24nK+3/uatMlxvqBaLczMT7bAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADBkZv5SEXMv/srbpyw5vnvIzlu8X3EmssQ5s6QAAAAAR51VvyMcBu7nTFbs5oFQf9sbLeo/SOUQKxzaJWvBOPBt324ddloZPZy+FGzut5rBy0he1fWzeROoz1hX7/AKk6uJA/tzXKscZ8Wa9IV+32Gwr4MqUKfFnjIZGeDsipvIyXJY9OJInxuz0QKRSODYMLWhOZ2v8QhASOe9jb6fhZtD/6J/XX9kp0wJsfKVh53ksJqzbfyd1RSzIap7OM5egUgwolJWeP7oRx98vB9Xa6qybYZuMY33r/JhQ6fntdiwUOAAUCwFwVAA4ACQO0UwAAAAAAABIGAAgAJQ0QAQEPQhARAAIMBwstJQ8PEw8pESwhDAYeHSAQJiQtJyIfDygmECQRFycrBhYBFQkKBBQjGyMYGgEHKyUcIxEQECojGQMFDy7BIJszQdacgQQDAAAAKGQAAS8BAGQBAiZkAgMFaAIAAAAAAFOPFAAAAAAA6AMAEAMIAAABCQMF7ocTBua36sQrEptwcWBz2bJWYVeNKfUbEcbK6R/jjgQ2MjMtCQA6ERQhOBMCN6C5ROCdIHDGDZ7j57MH3DB/msNTjNhvTApJPwGvnv4yBQwCBAcKAFaO7ZdoovwXWAPhOtNDo9HrKAjJf0WhghnHnNsy08mfBpGXmJKOkwKPlQ==`;
  


  (async () => {
    const conn = new Connection("https://solana-mainnet.g.alchemy.com/v2/Qfdr68Zn1sVkbTNMukVf6BT7vPLuvLjq");
    const coder = new BorshCoder(idl as Idl);
    const buf = Buffer.from(BASE64_TX, "base64");
    console.log("start decode");
    const vtx = VersionedTransaction.deserialize(buf);

    console.log("start decode end");
  
    console.log("✅ 签名列表:", vtx.signatures.map(s => bs58.encode(s)));
  
    const altAccs: AddressLookupTableAccount[] = [];
  
    for (const lookup of vtx.message.addressTableLookups) {
      console.log("🔍 发现 ALT:", lookup.accountKey.toBase58());
      const resp = await conn.getAddressLookupTable(lookup.accountKey);
      if (!resp.value) throw new Error(`ALT ${lookup.accountKey.toBase58()} 加载失败`);
      altAccs.push(resp.value);
    }
  
    const msg_accountKeys = vtx.message.getAccountKeys({
      addressLookupTableAccounts: altAccs
    });

    let accountKeys: Array<PublicKey> = []

    for(let i = 0; i < msg_accountKeys.length; i ++ ) {
        const accountKEY = msg_accountKeys.get(i);
        if (accountKEY != null) {
            accountKeys.push(accountKEY);
        }
       
    }

    console.log(`signed ${vtx.message.header.numRequiredSignatures}`)


    
  
    console.log("\n📄 所有账户:");
    accountKeys.forEach((k, i) => console.log(i, k.toBase58()));
  
    console.log("\n📦 指令详情:");
    vtx.message.compiledInstructions.forEach((ix, idx) => {


        const data = Buffer.from(ix.data);
        console.log("instruction data: ", data)
        const data58 = base58.encode(data);
        console.log("instruction data58: ", data58)
        const decoded = coder.instruction.decode(data);
        if (!decoded) {
          console.log(`❌ 第 ${idx} 条指令无法解码`);
          return;
        }


        const method = decoded.name;
        const args = decoded.data;

      const programId = accountKeys[ix.programIdIndex];
    //   const accounts = ix.accountKeyIndexes.map(i => accountKeys[i]).filter( i => i != null);

    // 获取完整的账户 key 数组
  
  // 获取该指令用到的所有账户（按 index）

      const accounts = ix.accountKeyIndexes.map(i => accountKeys[i]);
      console.log(`\n-- 指令 ${idx + 1} --`);
      console.log("  ✅ 方法名:", method);
      console.log("  📥 参数:", args);
      console.log("  📥 账户:", accounts);
      if ("steps" in args && Array.isArray(args.steps)) {
        const step = args.steps[0];
        console.log(step)
        if ("swap_type" in step) {
            console.log(step.swap_type)
        }
      }
      if ("taking_amount" in args ) {
    
        console.log(args.taking_amount )
      }
      console.log("Program ID:", programId.toBase58());
      console.log("Data (hex):", Buffer.from(ix.data).toString("hex"));
      console.log("Data (base58):", bs58.encode(ix.data));


      const idlIx = (idl as Idl).instructions.find((ix) => ix.name === method);
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
    pubkey: pubkey.toBase58()
  }));

  remainingAccounts.forEach((acct, i) => {
    console.log(`  📌 ${acct.name}: ${remainingAccounts[i]?.pubkey}`);
  });

    });
  })().catch(err => console.error("❌ 解析失败:", err));