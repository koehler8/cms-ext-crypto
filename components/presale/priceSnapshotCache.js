export function createPriceSnapshotCache({
  initialEthPrice = 0,
  initialTokenPrice = null,
  windowMs = 12_000,
  hasCustomRpc = true,
  fetchEthPrice,
  fetchTokenPrice,
  onEthPriceUpdate,
  onTokenPriceUpdate,
} = {}) {
  let ethPrice = initialEthPrice;
  let tokenPrice = initialTokenPrice;
  let lastEthAt = 0;
  let lastTokenAt = 0;

  async function ensurePriceSnapshot({ force = false } = {}) {
    const now = Date.now();

    if (hasCustomRpc && (force || !ethPrice || now - lastEthAt > windowMs)) {
      if (typeof fetchEthPrice === 'function') {
        const next = await fetchEthPrice();
        if (Number.isFinite(next) && next > 0) {
          ethPrice = next;
          lastEthAt = now;
          onEthPriceUpdate?.(ethPrice);
        }
      }
    } else if (!hasCustomRpc) {
      lastEthAt = now;
    }

    if (hasCustomRpc && (force || tokenPrice === null || now - lastTokenAt > windowMs)) {
      if (typeof fetchTokenPrice === 'function') {
        const next = await fetchTokenPrice();
        if (Number.isFinite(next) && next > 0) {
          tokenPrice = next;
          lastTokenAt = now;
          onTokenPriceUpdate?.(tokenPrice);
        }
      }
    } else if (!hasCustomRpc && tokenPrice === null) {
      tokenPrice = initialTokenPrice;
      lastTokenAt = now;
    }

    return {
      ethUsdPrice: ethPrice,
      tokenPrice,
    };
  }

  function primePrices({ ethUsdPrice, tokenPrice: tokenValue, timestamp = Date.now() } = {}) {
    if (Number.isFinite(ethUsdPrice) && ethUsdPrice > 0) {
      ethPrice = ethUsdPrice;
      lastEthAt = timestamp;
      onEthPriceUpdate?.(ethPrice);
    }
    if (Number.isFinite(tokenValue) && tokenValue > 0) {
      tokenPrice = tokenValue;
      lastTokenAt = timestamp;
      onTokenPriceUpdate?.(tokenPrice);
    }
  }

  return {
    ensurePriceSnapshot,
    primePrices,
    getEthUsdPrice: () => ethPrice,
    getTokenPrice: () => tokenPrice,
    getLastUpdateTimes: () => ({ lastEthAt, lastTokenAt }),
  };
}
