import * as borsh from "@project-serum/borsh";
import bs58 from "bs58";
import { Buffer } from "buffer";

// ======== 1. 定义 SwapType 枚举结构 ========
const SwapTypeLayout = borsh.rustEnum([
  borsh.struct([], "raydiumAmm"),                                         // 0
  borsh.struct([borsh.u128("sqrtPriceLimit")], "raydiumClmm"),           // 1
  borsh.struct([], "raydiumCpSwap"),                                     // 2
  borsh.struct([borsh.u128("sqrtPriceLimit")], "orca"),                  // 3
  borsh.struct([], "meteoraDlmm"),                                       // 4
  borsh.struct([], "meteoraDynamicAmm"),                                 // 5
  borsh.struct([], "pumpFunAmm"),                                        // 6
  borsh.struct([borsh.u64("shareFeeRate")], "raydiumLaunchLab"),         // 7
  borsh.struct([], "pumpfunBondingCurve"),                               // 8
  borsh.struct([], "meteoraDynamicAmmv2"),                               // 9
]);

// ======== 2. 定义 SwapStep 结构 ========
const SwapStepLayout = borsh.struct([
  borsh.u64("minAmountOut"),
  SwapTypeLayout.replicate("swapType"),
  borsh.u32("remainingAccountsCount"),
]);

// ======== 3. 定义 RouteSwapArguments 结构 ========
const RouteSwapArgumentsLayout = borsh.struct([
  borsh.u64("amountIn"),
  borsh.vec(SwapStepLayout, "steps"),
]);

// ======== 4. 顶层参数结构 ========
const CloseOrderInstructionLayout = borsh.struct([
  RouteSwapArgumentsLayout.replicate("args"),
  borsh.bool("fulfiller"),
  borsh.bool("order"),
  borsh.u16("feeBps"),
]);

// ======== 5. 输入你的 base58 编码指令数据（带 discriminator 的完整 data） ========
const base58Data = "RKt2eoLeuDr2GcyNQBq28SZyfs7w3ScqTFGzHgJpe5TmtHsWJMcqJtBfnvHir5N3YWanHsTpzZAQBnSV7qxRdUr9ozDJTcdRRJF43EcVCkGmyaUX"; // ⚠️ 替换成你的真实 data

try {
  const decodedBuffer =  Buffer.from(bs58.decode(base58Data));
  const argsBuffer = decodedBuffer.slice(8); // 去掉前8字节 discriminator
  const result = FullInstructionLayout.decode(argsBuffer);

  console.dir(result, { depth: null });
} catch (err) {
  console.error("❌ 解析失败:", err);
}