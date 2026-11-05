// Golden instruction data for the Go client (ave_swap_api swap/solFeeStep_test.go): encodes route_swap /
// fulfill_order_via_route_swap, with fee_step None and Some(1), using the program IDL and the Anchor coder.
// IDL 路径取第一个参数，或环境变量 IDL；都没有就用 ./ave_limit_order.json（要含 fee_step，即 anchor build 之后的 target/idl/ave_limit_order.json）。
// 用法：npx ts-node gen-fee-step-golden.ts /path/to/SolanaLimitContract/target/idl/ave_limit_order.json | python3 annotate_golden.py
//
import path from "node:path";
import { BN,BorshInstructionCoder  } from "@coral-xyz/anchor"


// sqrt 是 Orca 和 Raydium CLMM 这类集中流动性兑换步骤里 sqrt_price_limit（价格限制） 的测试值。
// 它是什么
// sqrt_price_limit 是一次兑换允许把池子价格推到的极限，用价格的平方根表示，格式是 Q64.64 定点数（u128，高 64 位整数、低 64 位小数）。兑换推价格走到这个极限就停，不再继续成交，相当于滑点之外的又一道价格保护。
// 在合约里，它是 SwapType::Orca { sqrt_price_limit } 和 SwapType::RaydiumClmm { sqrt_price_limit } 的字段。
// 这个脚本里为什么写成 2^96
// 注释已经写了：“exercises the u128 field”。这个脚本是给 Go 客户端生成“标准答案“字节（golden data）用的，要验证 Go 编码出来的字节和 Anchor 完全一致。
// 如果这个值只是个小数，就只用到 u128 的低 8 字节，高 8 字节全是 0，没法测出 Go 在 16 字节编码上有没有写错。2^96 = 79228162514264337593543950336 超过了 u64 的范围，高位非零，所以能检验整个 16 字节的 u128 都编对了。
// 同一个脚本里，第三步 Raydium 用的 4295048016 是 CLMM 的最小价格限制，放在 u64 范围内，正好和 2^96 形成对照。
// 要注意的
// 这只是编码测试用的数值，不是真实可用的价格限制。2^96 比 Orca 允许的最大值（79226673515401279992447579055）还大一点，真的拿去链上跑会被池子拒绝。
// 真实使用时，仓库的测试里是用 SwapUtils.getDefaultSqrtPriceLimit(aToB) 取默认值（按方向取最小或最大）；Raydium 系传 0 表示不限制。


async function main() {
  const idlPath = path.resolve(process.argv[2] ?? process.env.IDL ?? path.join(__dirname, "ave_limit_order.json"));
  const idl = require(idlPath);
  const coder = new BorshInstructionCoder(idl);
  const sqrt = new BN("79228162514264337593543950336"); // 2^96, exercises the u128 field
  const steps = [
    { min_amount_out: new BN(1000), swap_type: { Orca: { sqrt_price_limit: sqrt } }, remaining_accounts_count: 3 },
    { min_amount_out: new BN(0), swap_type: { MeteoraDlmm: {} }, remaining_accounts_count: 2 },
    { min_amount_out: new BN(123456789), swap_type: { RaydiumClmm: { sqrt_price_limit: new BN(4295048016) } }, remaining_accounts_count: 5 },
  ];
  const feeBps = 60, thirdFeeBps = 10;

  function enc(name: string, args: any): string {
    try { return coder.encode(name, args).toString("hex"); }
    catch (e: any) { throw new Error(name + ": " + e.message); }
  }
  const out: Record<string, string> = {};
  for (const [label, feeStep] of [["none", { index: null }], ["step1", { index: 1 }]]) {
    out["route_swap_" + label] = enc("route_swap", {
      args: { amount_in: new BN(5_000_000_000), steps }, wrap_and_unwrap_sol: true, is_fee_in: true,
      fee_bps: feeBps, third_fee_bps: thirdFeeBps, fee_step: feeStep,
    });
    out["fulfill_" + label] = enc("fulfill_order_via_route_swap", {
      steps, taking_amount: new BN(777_000), is_fee_in: false, fee_bps: feeBps, third_fee_bps: thirdFeeBps, fee_step: feeStep,
    });
  }
  console.log(JSON.stringify(out, null, 2));

}


main()
