import { publicKey } from "@coral-xyz/anchor/dist/cjs/utils";
import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction,
    createSyncNativeInstruction,
    getAssociatedTokenAddress,
    getAssociatedTokenAddressSync,
    NATIVE_MINT, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
    Connection,
    VersionedTransaction,
    Message,
    AddressLookupTableAccount,
    PublicKey
  } from "@solana/web3.js";

const output_mint = new PublicKey("GkELSMBRP8zksNNt7WLWDooo4u7uP2EjrykncFKtAEaz");
//4ASGZGq2yb1sRN7BSG2Q4ti8bSpsQe4aTjd4wM3gahSv
const owner = new PublicKey("F7KdYbQbKigC4VBtSWfGTxYmQUGJreAES1aRnT2ZK5xr");


// output 
const [output_address] = PublicKey.findProgramAddressSync(
        [owner.toBuffer(), TOKEN_2022_PROGRAM_ID.toBuffer(), output_mint.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID,
    );

console.log("output address", output_address.toBase58());


// input So11111111111111111111111111111111111111112
const input_mint = new PublicKey("So11111111111111111111111111111111111111112");
const [input_address] = PublicKey.findProgramAddressSync(
        [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), input_mint.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID,
    );


    

console.log("input address", input_address.toBase58());

const RaydiumLaunchLabProgram = new PublicKey(
    "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj"
);

 const [event_authority] = PublicKey.findProgramAddressSync(
            [Buffer.from("__event_authority")],
            RaydiumLaunchLabProgram
        )
        console.log("event_authority", event_authority);