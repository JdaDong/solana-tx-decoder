#!/usr/bin/env bash
# Decode a Solana transaction (legacy / v0 / v1) with decode_tx.ts.
#
# Usage:
#   ./decode.sh <tx signature>       fetch from RPC, then decode
#   ./decode.sh <base64 tx>          decode a raw transaction
#   ./decode.sh < tx.txt             read signature or base64 from stdin
#
# Env:
#   SOLANA_RPC_URL   RPC used to fetch by signature (default: mainnet-beta)
set -euo pipefail

cd "$(dirname "$0")"
RPC_URL="${SOLANA_RPC_URL:-https://api.mainnet-beta.solana.com}"

if [[ $# -gt 0 && "$1" != "-" ]]; then
  INPUT="$1"
else
  INPUT="$(cat)"
fi
INPUT="$(printf '%s' "$INPUT" | tr -d '[:space:]')"

if [[ -z "$INPUT" ]]; then
  sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
fi

if [[ ${#INPUT} -le 90 && "$INPUT" =~ ^[1-9A-HJ-NP-Za-km-z]+$ ]]; then
  echo "🔎 Fetching $INPUT from $RPC_URL" >&2
  INPUT="$(SIG="$INPUT" RPC_URL="$RPC_URL" node -e '
    fetch(process.env.RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "getTransaction",
        params: [process.env.SIG, { encoding: "base64", maxSupportedTransactionVersion: 1, commitment: "confirmed" }],
      }),
    })
      .then((r) => r.json())
      .then((r) => {
        if (r.error) throw new Error(r.error.message);
        if (!r.result) throw new Error("transaction not found");
        process.stdout.write(r.result.transaction[0]);
      })
      .catch((e) => { console.error("❌ " + e.message); process.exit(1); });
  ')"
fi

exec npx ts-node decode_tx.ts "$INPUT"
