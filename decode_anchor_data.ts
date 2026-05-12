import fs from 'fs';
import { Buffer } from 'buffer';
import * as borsh from 'borsh';
import bs58 from 'bs58';
import { sha256 } from 'js-sha256';

// 1. 读取 IDL
const idl = JSON.parse(fs.readFileSync('./ave_limit_order.json', 'utf-8'));

// 2. 输入 base64 data（指令 data 字段）
const base64Data = 'gAEABBBT1iaGDdAvXFMqkcXwqt6qF69r4X39yrTjiNyi5A0kuqvPSNMxwlQvgqwnpbEKzlXwdf42R4/OwQhNftmyBSReg1ZZlLe+z+76MulSudzjiVr3CogdfQ1eyEUx0iHP6R9Uaibx8CKbhkrK9rKuKthgSdSwhbzBsOg6M4xbRXpnvEU6YlJhp7vv13CMxiaWR2hV42bBjYqdgZ/gu9OK5RXVD6CLtWJxOk9+5caAsOPipypDZVISWc+vKSqBYNmatDETsSy0JxutOsq0RcCcavNCHP/U529nJLh4w+JKU10ScpKiwvXhoo/1oACMEHcorOL30oUHP4xjbhHXc20DzTNxKHMJhT3XWK4U95/5TX7gNmu9vkOe8IkUShi/ESIf/oUx6wC+A53lZVU/c6btzs/wHSe3tYbM6pwlamDB3BdPa0T8H3j5SjPQkJxea1+wIVcK2Nutjej9s9IO0c2Z645OXXDYDqrHthiamzqDvEKaXjrapHnLrskomsJWL/OOMisAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJ0BpqhP29DfEmL0BKdXZBX9gvQ/qn0xomht4jUYdVIRAwZGb+UhFzL/7K26csOb57yM5bvF9xJrLEObOkAAAAC8A2mzb3lA/dM7/xwcuJwFW6uCF3uyGnpNSd+nJvr6rTaauoq+V2f/N0jCXmZeuExgrmA/KpiByPE/DYctDYw9BA4ACQNADQMAAAAAAA4ABQIgoQcADyAAAQIDEAQFBAUUFRYXDBgZERIGBwgaAhABAxMJGxwNCidylg3AjPzdH9zF7VcBAAAAAQAAAPvvCgAAAAAACAAAAAABAFAAAAAMAgALDAIAAADgkwQAAAAAAAE3XWjpctRbmO4CkP0Qq5tkPooNOvZwRfuZ2OVs1H9cNgQRExQ3CQkKDCInEhVCQQ==';
const data = Buffer.from(base64Data, 'base64');

// 3. 根据 IDL 识别方法（前8字节为方法 hash）
const discriminator = data.slice(0, 8);
const remaining = data.slice(8);

function getMethodByDiscriminator(idl: any, disc: Buffer) {
  for (const ix of idl.instructions) {
    const preimage = `global:${ix.name}`;
    const hash = Buffer.from(sha256.digest(preimage)).slice(0, 8);
    if (hash.equals(disc)) {
      return ix;
    }
  }
  return null;
}

// 4. 生成 Borsh schema
function buildBorshSchema(ix: any) {
  const fields = ix.args.map((arg: any) => [arg.name, mapAnchorType(arg.type)]);
  class DynamicArgs {
    constructor(props: any) {
      Object.assign(this, props);
    }
  }
  const schema = new Map([[DynamicArgs, { kind: 'struct', fields }]]);
  return { schema, clazz: DynamicArgs };
}

// 简化版类型映射（支持常见类型）
function mapAnchorType(type: any): any {
  if (typeof type === 'string') return type;
  if (type.vec) return ['array', mapAnchorType(type.vec)];
  if (type.option) return ['option', mapAnchorType(type.option)];
  if (type.defined) return type.defined;
  throw new Error(`Unknown type: ${JSON.stringify(type)}`);
}

// 5. 主逻辑
const ix = getMethodByDiscriminator(idl, discriminator);

if (!ix) {
  console.error('❌ 无法识别此方法指令（discriminator 不匹配）');
  process.exit(1);
}

console.log(`✅ 方法名: ${ix.name}`);

// 6. 解析参数
const { schema, clazz } = buildBorshSchema(ix);
const decoded = borsh.deserialize(schema, clazz, remaining);

console.log(`📦 参数解析结果:`);
console.dir(decoded, { depth: null });

// 7. 输出账户（如果有）
if (ix.accounts?.length) {
  console.log(`🔐 账户列表:`);
  ix.accounts.forEach((acc: any, i: number) => {
    console.log(` - ${acc.name}`);
  });
}