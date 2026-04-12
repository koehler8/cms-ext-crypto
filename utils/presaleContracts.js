import { ethers } from 'ethers';

export const CONTRACT_REGISTRY_ABI = Object.freeze([
  'function getContractAddress(string name) view returns (address)',
]);

export const PRESALE_ABI = Object.freeze([
  'function getTotalUsdRaised() view returns (uint256)',
  'function getTotalTokensPurchased(address investor) view returns (uint256)',
  'function getTotalStakedTokens(address investor) view returns (uint256)',
  'function getPurchasedTokens(address owner) view returns (uint256)',
  'function getStakedTokenYield(address investor) view returns (uint256)',
  'function getAPY() view returns (uint256)',
  'function getPresaleFlag() view returns (bool)',
  'function getClaimFlag() view returns (bool)',
  'function getStakedClaimFlag() view returns (bool)',
  'function getCurrentTime() view returns (uint256)',
  'function getNextPriceIncreaseTime() view returns (uint256)',
  'function buyTokens() payable',
  'function buyAndStakeTokens() payable',
  'function buyWithStable(address token, uint256 amount)',
  'function buyAndStakeWithStable(address token, uint256 amount)',
  'function getEthUsdPrice() view returns (uint256)',
  'function getCurrentTokenPrice() view returns (uint256)',
  'function getTotalTokensSold() view returns (uint256)',
  'function getUniqueBuyerCount() view returns (uint256)',
  'function getTotalBuyerCount() view returns (uint256)',
  'function getBuyerCount() view returns (uint256)',
  'function getTotalStakedTokensGlobal() view returns (uint256)',
  'function stakePurchasedTokens()',
  'function claimTokens()',
  'function claimAllTokens()',
]);

const registryContractCache = new WeakMap();
const presaleContractCache = new WeakMap();

function getOrCreateContract(cache, scope, address, abi) {
  if (!scope || !address) return null;
  let scopeMap = cache.get(scope);
  if (!scopeMap) {
    scopeMap = new Map();
    cache.set(scope, scopeMap);
  }
  if (scopeMap.has(address)) {
    return scopeMap.get(address);
  }
  const contract = new ethers.Contract(address, abi, scope);
  scopeMap.set(address, contract);
  return contract;
}

export function getRegistryContract(address, providerOrSigner) {
  return getOrCreateContract(registryContractCache, providerOrSigner, address, CONTRACT_REGISTRY_ABI);
}

export function getPresaleReadContract(address, provider) {
  return getOrCreateContract(presaleContractCache, provider, address, PRESALE_ABI);
}

export function getPresaleWriteContract(address, signerOrProvider) {
  return getOrCreateContract(presaleContractCache, signerOrProvider, address, PRESALE_ABI);
}

export function clearPresaleContractCache(scope) {
  if (scope && presaleContractCache.has(scope)) {
    presaleContractCache.delete(scope);
  }
}
