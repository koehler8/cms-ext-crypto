import { ethers } from 'ethers';

export const SUPPORTED_STABLECOINS = Object.freeze([
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: ethers.getAddress('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'),
    decimals: 6,
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    address: ethers.getAddress('0xdac17f958d2ee523a2206206994597c13d831ec7'),
    decimals: 6,
  },
  {
    symbol: 'DAI',
    name: 'Dai',
    address: ethers.getAddress('0x6b175474e89094c44da98b954eedeac495271d0f'),
    decimals: 18,
  },
  {
    symbol: 'USDP',
    name: 'Pax Dollar',
    address: ethers.getAddress('0x1456688345527be1f37e9e627da0837d6f08c925'),
    decimals: 18,
  },
  {
    symbol: 'GUSD',
    name: 'Gemini Dollar',
    address: ethers.getAddress('0x056fd409e1d7a124bd7017459dfea2f387b6d5cd'),
    decimals: 2,
  },
  {
    symbol: 'FRAX',
    name: 'Frax',
    address: ethers.getAddress('0x853d955acef822db058eb8505911ed77f175b99e'),
    decimals: 18,
  },
  {
    symbol: 'LUSD',
    name: 'Liquity USD',
    address: ethers.getAddress('0x5f98805a4e8be255a32880fdec7f6728c6568ba0'),
    decimals: 18,
  },
]);

export const SUPPORTED_WRAPPED_ASSETS = Object.freeze([
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: ethers.getAddress('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'),
    decimals: 18,
  },
]);

export const PAYMENT_ASSETS = Object.freeze([
  { symbol: 'ETH', name: 'Ethereum', address: null, decimals: 18, type: 'native' },
  ...SUPPORTED_STABLECOINS.map((stable) => ({ ...stable, type: 'stable' })),
  ...SUPPORTED_WRAPPED_ASSETS.map((asset) => ({ ...asset, type: 'wrapped' })),
]);

export function createPaymentAssetMap(assets = PAYMENT_ASSETS) {
  return new Map(assets.map((asset) => [asset.symbol.toUpperCase(), asset]));
}

export function resolvePaymentAssetMeta(candidate, assetMap = createPaymentAssetMap()) {
  if (candidate && typeof candidate === 'object' && candidate.symbol) {
    return candidate;
  }
  if (typeof candidate === 'string' && candidate.trim()) {
    return assetMap.get(candidate.trim().toUpperCase()) || null;
  }
  return null;
}
