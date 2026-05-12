it("RouteSwap (Pump AMM, SOL -> SWIMSUIT)", async () => {
  const makerInputTokenAccount = await SplToken.getAssociatedTokenAddressSync(
    SOL.mint,
    wallets.maker.publicKey,
  );

  const makerOutputTokenAccount = SplToken.getAssociatedTokenAddressSync(
    SWIMSUIT.mint,
    wallets.maker.publicKey,
  );

  const fulfillerInputTokenAccount = SplToken.getAssociatedTokenAddressSync(
    SOL.mint,
    wallets.maker.publicKey,
  );
  const [userVolumeAccumulator] = AmmUserVolumeAccumulatorPda(
    wallets.maker.publicKey,
  );

  const remainingAccounts = [];

  remainingAccounts.push(readOnly(PumpFunAmmProgram));

  remainingAccounts.push(writable(PumpFunAmmSwimsuitToSOLPool));
  remainingAccounts.push(writable(PumpFunAmmGlobalConfig));
  remainingAccounts.push(writable(SWIMSUIT.mint));
  remainingAccounts.push(writable(SOL.mint));
  remainingAccounts.push(writable(PumpFunAmmPoolBaseTokenAccount));
  remainingAccounts.push(writable(PumpFunAmmPoolQuoteTokenAccount));
  remainingAccounts.push(writable(PumpFunAmmProtocolFeeRecipient));
  remainingAccounts.push(writable(PumpFunAmmProtocolFeeTokenAccount));
  remainingAccounts.push(writable(PumpFunAmmEventAuthority));
  remainingAccounts.push(writable(coinCreatorVaultAta));
  remainingAccounts.push(readOnly(coinVaultAuthority));
  remainingAccounts.push(writable(fulfillerInputTokenAccount));
  remainingAccounts.push(writable(AmmGlobalVolumeAccumulator));
  remainingAccounts.push(writable(userVolumeAccumulator));
  remainingAccounts.push(readOnly(pumpfun_amm_fee_config));
  remainingAccounts.push(readOnly(feeProgram));

  const [userVolumeAccumulatorAta] = PublicKey.findProgramAddressSync(
    [
      userVolumeAccumulator.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      SOL.mint.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const [pool_v2] = PumpAmmPoolv2Pda(SWIMSUIT.mint);
  console.log("pool_v2: ", pool_v2);
  remainingAccounts.push(readOnly(pool_v2));
  remainingAccounts.push(writable(userVolumeAccumulatorAta));

  const feeRecipientTokenAccount = await getAssociatedTokenAddress(
    SOL.mint,
    aveFeeRecipient,
  );

  const thirdfeeRecipientTokenAccount = await getAssociatedTokenAddress(
    SOL.mint,
    thirdFeeRecipient,
  );

  const lookupTableAccount = await buildLookupTable(
    provider.connection,
    wallets.fulfiller,
    [
      USDC.mint,
      SOL.mint,
      MEMO_PROGRAM,
      SplToken.TOKEN_PROGRAM_ID,
      SplToken.TOKEN_2022_PROGRAM_ID,
      feeRecipientTokenAccount,
      marketAddress,
    ],
  );

  const instructions = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
  ];
  const swapIx = await program.methods
    .routeSwap(
      {
        amountIn: new anchor.BN("100000000"),
        steps: [
          {
            minAmountOut: new anchor.BN("1"), //new anchor.BN("300145000000"),
            swapType: { pumpFunAmm: {} },
            remainingAccountsCount: 0,
          },
        ],
      },
      true,
      true,
      new anchor.BN("100"),
      new anchor.BN("100"),
    )
    .accounts({
      authority: wallets.maker.publicKey,
      inputTokenAccount: makerInputTokenAccount,
      outputTokenAccount: makerOutputTokenAccount,
      inputTokenMint: SOL.mint,
      outputTokenMint: SWIMSUIT.mint,
      feeRecipientAuthority: aveFeeRecipient,
      feeRecipientTokenAccount,
      thirdFeeRecipientAuthority: thirdFeeRecipient,
      thirdFeeRecipientTokenAccount: thirdfeeRecipientTokenAccount,
      memoProgram: MEMO_PROGRAM,
    })
    .remainingAccounts(remainingAccounts)
    .instruction();
  instructions.push(swapIx);

  let blockhash = await provider.connection
    .getLatestBlockhash()
    .then((res) => res.blockhash);

  const messageV0 = new TransactionMessage({
    payerKey: wallets.maker.publicKey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message([lookupTableAccount]);

  const transaction = new VersionedTransaction(messageV0);
  transaction.sign([wallets.maker.payer]);

  const signature = await provider.connection.sendTransaction(transaction, {
    skipPreflight: true,
  });
  console.log("route swap (Pump AMM, SOL -> SWIMSUIT): ", signature);
  await provider.connection.confirmTransaction(signature);

  const thrid_ata = await SplToken.getAccount(
    provider.connection,
    thirdfeeRecipientTokenAccount,
  );
  console.log("input third_ata: ", thrid_ata.amount);
  const expect_amount = (BigInt(100000000) * BigInt(100)) / BigInt(10000);
  expect(thrid_ata.amount).eq(expect_amount);
  console.log("expect input fee", expect_amount);
});
