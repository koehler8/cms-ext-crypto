const ZERO = 0;

export async function collectWalletBalanceSnapshot({
  paymentAssets = [],
  minGasBuffer = 0,
  readNativeBalance,
  readTokenBalance,
  onTokenBalanceError,
}) {
  if (typeof readNativeBalance !== 'function') {
    throw new Error('readNativeBalance function is required');
  }
  if (typeof readTokenBalance !== 'function') {
    throw new Error('readTokenBalance function is required');
  }

  const walletStableBalances = {};
  const suggestedSpendMap = {};

  const nativeBalance = await readNativeBalance();
  const safeNative = Number.isFinite(nativeBalance) && nativeBalance > 0 ? nativeBalance : ZERO;
  const spendableEth = Math.max(safeNative - (minGasBuffer || ZERO), ZERO);
  suggestedSpendMap.ETH = spendableEth;

  await Promise.all(
    paymentAssets
      .filter((asset) => asset && asset.symbol && asset.symbol !== 'ETH')
      .map(async (asset) => {
        try {
          const balance = await readTokenBalance(asset);
          const safeBalance = Number.isFinite(balance) && balance > 0 ? balance : ZERO;
          walletStableBalances[asset.symbol] = safeBalance;
          suggestedSpendMap[asset.symbol] = safeBalance;
        } catch (error) {
          walletStableBalances[asset.symbol] = ZERO;
          suggestedSpendMap[asset.symbol] = ZERO;
          onTokenBalanceError?.(asset, error);
        }
      })
  );

  return {
    walletBalanceEth: safeNative,
    walletStableBalances,
    suggestedSpendMap,
  };
}
