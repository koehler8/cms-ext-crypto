export async function buildPurchaseAnalyticsPayload({
  flow,
  spendAmount,
  tokenAmount,
  asset,
  tokenTicker = 'unknown',
  getEthUsdPrice,
}) {
  const assetSymbol =
    (typeof asset === 'object' && asset?.symbol) || (typeof asset === 'string' && asset) || 'ETH';
  const assetDecimals =
    typeof asset === 'object' && Number.isFinite(asset?.decimals) ? asset.decimals : 6;
  const assetType =
    (typeof asset === 'object' && asset?.type) || (assetSymbol === 'ETH' ? 'native' : 'stable');

  const normalizedSpend = Number.isFinite(spendAmount)
    ? Number(spendAmount.toFixed(Math.min(assetDecimals || 6, 6)))
    : null;
  const normalizedToken =
    typeof tokenAmount === 'number' && !Number.isNaN(tokenAmount)
      ? Number(tokenAmount.toFixed(4))
      : null;

  const stakeIncluded = flow === 'buy_and_stake';
  const payload = {
    flow,
    token_symbol: tokenTicker || 'unknown',
    buy_mode: stakeIncluded ? 'buy_stake' : 'buy_only',
    stake_included: stakeIncluded,
  };

  if (normalizedSpend !== null) {
    payload.value = normalizedSpend;
    payload.currency = assetSymbol;
    payload.purchase_amount_asset = normalizedSpend;
    if (assetType === 'native' || assetType === 'wrapped') {
      payload.purchase_amount_eth = Number(normalizedSpend.toFixed(6));
      if (typeof getEthUsdPrice === 'function') {
        const price = await getEthUsdPrice();
        if (price && Number.isFinite(price)) {
          payload.purchase_amount_usd = Number((normalizedSpend * price).toFixed(2));
        }
      }
    } else {
      payload.purchase_amount_usd = Number((normalizedSpend * 1).toFixed(2));
    }
  }

  if (normalizedToken !== null) {
    payload.purchase_amount_token = normalizedToken;
    payload.tokens_bought = normalizedToken;
    if (stakeIncluded) {
      payload.stake_amount_token = normalizedToken;
    }
  }

  return payload;
}
