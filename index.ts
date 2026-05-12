import base58, * as bs58 from 'bs58';

import {
    Transaction,
    VersionedTransaction,
    Message,
    VersionedMessage,
    AddressLookupTableAccount,
  } from '@solana/web3.js';

const BASE64_TX = 'AYuyisCqOXorT8vlx0TB/CtWQ1tJ95ijULhF+7XM++OY36uIEcK5Hli8dx5oAcQph06Zp8GRQc57Y6ZBTik5YQeAAQACDwhqwNreLQm/Zz59vkQ5Fe7pNn1s2lT69KxHUlr4+x0xO1ptmcYhNG8SIlt/tgAMHCDnDL+tKH3E53L9y378ehZq8RHzQu2BNJKLCDgoPP9wdj2ZCjyDEFlfBtlmtO6g/3LX/9IKAh7+fq0MdA7aCCjlnIsgI4m7MRVBMWdTKFLGvANps295QP3TO/8cHLicBVurghd7shp6TUnfpyb6+q1XCbbdOrKE2R47091krftxxZpuTsvZV3QtWWhJ/WeSa9wqw9HTqz5O+SxkTPQwEVj3M+ONip2AoxOOo5PBD2AvNIVBeM6zTIFVNc7ZLP14H11Sq63QW3U59jHqZrNGcT5SwUv0n7i79kUJDUU+R8m6KqxVZ44m5dFd7h/SAGwOY5Z870z9vanZXxecbHdy8g+L+zH2yXfUcOTGQoxsU4Iv2bg3UCfAiJOmlGgyk+zZPxChuMtQfgyO5xffnBCnvQNmewW+YHjsCbZysa+obxgcr5lJ5/evsUaa4ZkRkxSEmYjx/6Oi3+YXvcTjVzJRoyLj/K6B5aRXOQ5kdRwApGXiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADBkZv5SEXMv/srbpyw5vnvIzlu8X3EmssQ5s6QAAAAJyhyNiCiGPvS/E99/hF9BUTbv4q4B4NPWujrTWCu1WSBQ4ACQMAAAAAAAAAAA4ABQJAQg8ABB0AAQ8CEAMEBREGEhMWFxgZDRobFBUHCAkcBhEKCyUSOMYXzdKo6gEAAAABAAAAAAAAAAgAAAAAAalIgbwHAAAAATIABAQAAQIPCFpn0RwHP6gEDQIADAwCAAAAgIQeAAAAAAABN11o6XLUW5juApD9EKubZD6KDTr2cEX7mdjlbNR/XDYHGxwRBAcTFAcJCgwiJxIV';

const buffer = Buffer.from(BASE64_TX, 'base64');

let tx;

try {
  

  const versionByte = buffer[0];
  let isVersioned = (versionByte & 0x80) !== 0;

  console.log("isVersioned: ", isVersioned)


  isVersioned = true
  if (isVersioned) {
    // 处理 versioned transaction
    tx = VersionedTransaction.deserialize(buffer);
    console.log("✅ 解码 VersionedTransaction 成功");
    console.log("签名者:", tx.signatures.map(sig => sig.toString()));
    console.log("Instructions:", tx.message.compiledInstructions.length);

    const msg = tx.message;
    console.log("message: ", msg);
    

    console.log("id: ", base58.encode(tx.signatures[0])); 



// 解析 compiled instructions
// msg.compiledInstructions.forEach((ix, index) => {
//   const programId = staticAccountKeys[ix.programIdIndex];
//   console.log(`📦 指令 ${index + 1}`);
//   console.log('Program ID:', programId.toBase58());
//   console.log('Accounts:');
//   ix.accountKeyIndexes.forEach((keyIndex, i) => {
//     const pubkey = staticAccountKeys[keyIndex];
//     console.log(`  [${i}] ${pubkey.toBase58()}`);
//   });
//   console.log('Data (hex):', Buffer.from(ix.data).toString('hex'));
// });

  } else {
    // 处理 legacy transaction
    tx = Transaction.from(buffer);
    console.log("✅ 解码 Legacy Transaction 成功");
    console.log("签名者:", tx.signatures.map(sig => sig.publicKey.toBase58()));
    console.log("Instructions:", tx.instructions.length);
  }

  // 签名者


} catch (err) {
  console.error("❌ 解码失败：", err);
}