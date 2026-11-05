#!/usr/bin/env python3
"""把 gen-fee-step-golden.ts 生成的 golden 指令数据（十六进制）逐字段拆开，方便对照 Go 客户端的编码结果。

用法：
  npx ts-node gen-fee-step-golden.ts <idl.json> | python3 annotate_golden.py              # 4 个用例全部拆开
  npx ts-node gen-fee-step-golden.ts <idl.json> | python3 annotate_golden.py route_swap_step1 fulfill_none
  python3 annotate_golden.py --file golden.json                                      # 从文件读

输入是 {"用例名": "十六进制字符串"} 的 JSON，用例名以 route_swap 开头按 route_swap 的布局拆，其余按
fulfill_order_via_route_swap 的布局拆。每个用例必须被完整解析（没有多余、也没有缺少的字节），否则报错退出。

字段布局写死在这个脚本里，要和 programs/ave-limit-order/src/instructions/swap.rs 保持一致：
  SwapStep { min_amount_out: u64, swap_type: SwapType, remaining_accounts_count: u32 }
  SwapType 是 1 字节标记 + 参数；SwapType 的变体顺序只能往后加，加了新变体要同步 SWAP / U128 / U64。
  fee_step 是 Option<u8>：00 = None，01 k = Some(k)。所有整数都是小端。
"""
import argparse
import json
import sys

# SwapType 的变体序号（对应 swap.rs 里 SwapType 枚举的顺序），以及带参数的变体
SWAP = {0: 'RaydiumAmm', 1: 'RaydiumClmm', 2: 'RaydiumCpSwap', 3: 'Orca', 4: 'MeteoraDlmm', 5: 'MeteoraDynamicAmm',
        6: 'PumpFunAmm', 7: 'RaydiumLaunchLab', 8: 'PumpfunBondingCurve', 9: 'MeteoraDynamicAmmv2', 10: 'MeteoraDBC',
        11: 'HeavenAmm', 12: 'Pinpet', 13: 'Rise', 14: 'ByrealClmm', 15: 'RaydiumAmmV2', 16: 'PancakeClmm'}
U128 = {1, 3, 14, 16}  # 带 sqrt_price_limit: u128 的变体
U64 = {7}              # 带 share_fee_rate: u64 的变体


class Reader:
    def __init__(self, data):
        self.b = data
        self.i = 0
        self.rows = []  # (偏移, 长度, 原始十六进制, 字段名, 解析值)

    def take(self, n, label, fmt):
        if self.i + n > len(self.b):
            raise ValueError(f'{label}: 需要 {n} 字节，只剩 {len(self.b) - self.i} 字节')
        raw = self.b[self.i:self.i + n]
        self.i += n
        self.rows.append((self.i - n, n, raw.hex(), label, fmt(raw)))
        return raw

    def uint(self, n, label):
        return int.from_bytes(self.take(n, label, lambda r: str(int.from_bytes(r, 'little'))), 'little')

    def boolean(self, label):
        return self.take(1, label, lambda r: 'true' if r[0] else 'false')[0]

    def relabel_last(self, value):
        off, n, raw, label, _ = self.rows[-1]
        self.rows[-1] = (off, n, raw, label, value)


def read_steps(r):
    count = r.uint(4, 'steps.len (u32)')
    for k in range(count):
        r.uint(8, f'step[{k}].min_amount_out (u64)')
        tag = r.uint(1, f'step[{k}].swap_type tag')
        r.relabel_last(f'{tag} = {SWAP.get(tag, "未知变体（脚本里的 SWAP 表要补）")}')
        if tag in U128:
            r.uint(16, f'step[{k}].swap_type.sqrt_price_limit (u128)')
        if tag in U64:
            r.uint(8, f'step[{k}].swap_type.share_fee_rate (u64)')
        r.uint(4, f'step[{k}].remaining_accounts_count (u32)')


def read_option_tag(r, label):
    tag = r.uint(1, f'{label} tag')
    r.relabel_last('0 = None' if tag == 0 else '1 = Some')
    return tag == 1


def parse(name, hex_data):
    r = Reader(bytes.fromhex(hex_data))
    r.take(8, 'discriminator', lambda x: x.hex())
    if name.startswith('route_swap'):
        r.uint(8, 'args.amount_in (u64)')
        read_steps(r)
        r.boolean('wrap_and_unwrap_sol (bool)')
        r.boolean('is_fee_in (bool)')
    else:  # fulfill_order_via_route_swap
        read_steps(r)
        if read_option_tag(r, 'taking_amount (Option<u64>)'):
            r.uint(8, 'taking_amount (u64)')
        r.boolean('is_fee_in (bool)')
    r.uint(2, 'fee_bps (u16)')
    r.uint(2, 'third_fee_bps (u16)')
    if read_option_tag(r, 'fee_step (Option<u8>)'):
        r.uint(1, 'fee_step.index (u8)')
    if r.i != len(r.b):
        raise ValueError(f'{name}: 还有 {len(r.b) - r.i} 字节没有被解析')
    return r.rows


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--file', help='golden JSON 文件；不给就从标准输入读')
    ap.add_argument('cases', nargs='*', help='要拆开的用例名，不给就全部')
    args = ap.parse_args()

    data = json.load(open(args.file) if args.file else sys.stdin)
    names = args.cases or list(data)
    missing = [n for n in names if n not in data]
    if missing:
        sys.exit(f'没有这些用例：{missing}；可选：{list(data)}')

    for name in names:
        rows = parse(name, data[name])
        print(f'== {name}  ({len(data[name]) // 2} 字节，已完整解析)')
        for off, n, raw, label, value in rows:
            print(f'  {off:>3} +{n:<2} {raw:<34} {label:<46} {value}')
        print()


if __name__ == '__main__':
    try:
        main()
    except ValueError as e:
        sys.exit(f'解析失败：{e}')
