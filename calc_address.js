"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var spl_token_1 = require("@solana/spl-token");
var web3_js_1 = require("@solana/web3.js");
var output_mint = new web3_js_1.PublicKey("GkELSMBRP8zksNNt7WLWDooo4u7uP2EjrykncFKtAEaz");
//4ASGZGq2yb1sRN7BSG2Q4ti8bSpsQe4aTjd4wM3gahSv
var owner = new web3_js_1.PublicKey("F7KdYbQbKigC4VBtSWfGTxYmQUGJreAES1aRnT2ZK5xr");
// output 
var output_address = web3_js_1.PublicKey.findProgramAddressSync([owner.toBuffer(), spl_token_1.TOKEN_2022_PROGRAM_ID.toBuffer(), output_mint.toBuffer()], spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID)[0];
console.log("output address", output_address.toBase58());
// input So11111111111111111111111111111111111111112
var input_mint = new web3_js_1.PublicKey("So11111111111111111111111111111111111111112");
var input_address = web3_js_1.PublicKey.findProgramAddressSync([owner.toBuffer(), spl_token_1.TOKEN_PROGRAM_ID.toBuffer(), input_mint.toBuffer()], spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID)[0];
console.log("input address", input_address.toBase58());
var RaydiumLaunchLabProgram = new web3_js_1.PublicKey("LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj");
var event_authority = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("__event_authority")], RaydiumLaunchLabProgram)[0];
console.log("event_authority", event_authority);
