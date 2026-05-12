import * as borsh from "@project-serum/borsh";
import bs58 from "bs58";
import { Buffer } from "buffer";

// ======== 1. 定义 SwapType 枚举结构 ========


// ======== 2. 定义 SwapStep 结构 ========
const SwapStepLayout = borsh.struct([
  borsh.u64("minAmountOut"),
  borsh.u32("remainingAccountsCount"),
]);

// ======== 3. 定义 RouteSwapArguments 结构 ========
const RouteSwapArgumentsLayout = borsh.struct([
  borsh.u64("amountIn"),
  borsh.vec(SwapStepLayout, "steps"),
]);

// ======== 4. 顶层参数结构 ========
const BuyParamsLayout = borsh.struct([
  borsh.u64("max_sol_spend"),
   borsh.u64("minimum_amount_out"),
    borsh.str("encoded_user_defined_event_data"),
]);

const SellParamsLayout = borsh.struct([
  borsh.u64("amount_in"),
  borsh.u64("minimum_amount_out"),
   borsh.str("encoded_user_defined_event_data"),
]);

// ======== 5. 输入你的 base58 编码指令数据（带 discriminator 的完整 data） ========
const base58Data = "23s1EunhJwrvPnSdGdnJxRkJNQ2XRF15Meb7H7u"; // ⚠️ 替换成你的真实 data

try {
  const decodedBuffer =  Buffer.from(bs58.decode(base58Data));
  console.log(decodedBuffer.slice(0, 8))
  const argsBuffer = decodedBuffer.slice(8); // 去掉前8字节 discriminator
  const result = BuyParamsLayout.decode(argsBuffer);

  console.dir(result, { depth: null });
  console.log(result.max_sol_spend.toNumber());
  console.log(result.minimum_amount_out.toNumber());
} catch (err) {
  console.error("❌ 解析失败:", err);
}