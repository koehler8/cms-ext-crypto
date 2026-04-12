<template>
  <main class="admin-dashboard">
    <header class="admin-header">
      <h1 class="admin-title">Presale Admin</h1>
      <p class="admin-subtitle">
        Manage live pricing, status flags, and balances for the active token.
      </p>
    </header>

    <section class="admin-section">
      <h2 class="section-heading">Pricing Controls</h2>
      <div class="admin-grid">
        <article class="admin-card">
          <label class="admin-label" for="tokenPriceInput">Base Token Price (USD)</label>
          <div class="admin-input-row">
            <input
              type="number"
              id="tokenPriceInput"
              class="admin-input"
              placeholder="Enter new price"
            >
            <button class="admin-button" @click="updateTokenPrice">Update Base Price</button>
          </div>
        </article>

        <article class="admin-card">
          <label class="admin-label" for="priceIncrementInput">Price Increment (USD)</label>
          <div class="admin-input-row">
            <input
              type="number"
              id="priceIncrementInput"
              class="admin-input"
              placeholder="Enter increment"
            >
            <button class="admin-button" @click="updatePriceIncrement">Set Increment</button>
          </div>
        </article>

        <article class="admin-card">
          <label class="admin-label" for="priceIncrementPeriodInput">Price Increment Period (minutes)</label>
          <div class="admin-input-row">
            <input
              type="number"
              id="priceIncrementPeriodInput"
              class="admin-input"
              placeholder="Enter period in minutes"
            >
            <button class="admin-button" @click="updatePriceIncrementPeriod">Set Period</button>
          </div>
        </article>

        <article class="admin-card admin-card--readonly">
          <p class="admin-label">Last Price Update</p>
          <span id="priceLastUpdatedDisplay" class="admin-value">Loading...</span>
        </article>

        <article class="admin-card admin-card--readonly">
          <p class="admin-label">Current Blockchain Time</p>
          <span id="currentTimeDisplay" class="admin-value">Loading...</span>
        </article>

        <article class="admin-card admin-card--readonly">
          <p class="admin-label">Next Price Increase Time</p>
          <span id="nextPriceIncreaseDisplay" class="admin-value">Loading...</span>
        </article>

        <article class="admin-card admin-card--readonly">
          <p class="admin-label">Current Token Price (USD)</p>
          <span id="currentTokenPriceDisplay" class="admin-value">Loading...</span>
        </article>

        <article class="admin-card">
          <label class="admin-label" for="priceFeedInput">Chainlink Price Feed Address</label>
          <div class="admin-input-row">
            <input
              type="text"
              id="priceFeedInput"
              class="admin-input"
              placeholder="Enter new address"
            >
            <button class="admin-button" @click="updatePriceFeed">Update Price Feed</button>
          </div>
        </article>
      </div>
    </section>

    <section class="admin-section">
      <h2 class="section-heading">Status Flags</h2>
      <div class="admin-grid admin-grid--compact">
        <article class="admin-card admin-card--toggle">
          <label class="admin-toggle" for="presaleCheckbox">
            <input type="checkbox" id="presaleCheckbox" @change="updatePresaleStatus">
            <span>Presale Active</span>
          </label>
        </article>

        <article class="admin-card admin-card--toggle">
          <label class="admin-toggle" for="claimingCheckbox">
            <input type="checkbox" id="claimingCheckbox" @change="updateClaimingStatus">
            <span>Claiming Enabled</span>
          </label>
        </article>

        <article class="admin-card admin-card--toggle">
          <label class="admin-toggle" for="stakedClaimingCheckbox">
            <input type="checkbox" id="stakedClaimingCheckbox" @change="updateStakedClaimingStatus">
            <span>Staked Claim Enabled</span>
          </label>
        </article>
      </div>
    </section>

    <section class="admin-section">
      <h2 class="section-heading">Balances & Totals</h2>
      <div class="admin-grid">
        <article class="admin-card admin-card--readonly">
          <p class="admin-label">ETH Raised</p>
          <span id="totalEthRaisedDisplay" class="admin-value">Loading...</span>
        </article>

        <article class="admin-card">
          <p class="admin-label">Presale Contract ETH Balance</p>
          <span id="presaleEthBalanceDisplay" class="admin-value">Loading...</span>
          <div class="admin-actions">
            <button class="admin-button admin-button--secondary" @click="withdrawEth">Withdraw ETH</button>
          </div>
        </article>

        <article class="admin-card">
          <label class="admin-label" for="totalUsdRaisedInput">Total USD Raised</label>
          <div class="admin-input-row">
            <input
              type="number"
              id="totalUsdRaisedInput"
              class="admin-input"
              placeholder="Enter new amount"
            >
            <button class="admin-button" @click="updateTotalUsdRaised">Set USD Raised</button>
          </div>
          <div class="admin-meta">
            Current:
            <span id="totalUsdRaisedDisplay" class="admin-value">Loading...</span>
          </div>
        </article>

        <article class="admin-card admin-card--readonly">
          <p class="admin-label">Tokens Sold</p>
          <span id="totalTokensSoldDisplay" class="admin-value">Loading...</span>
        </article>
      </div>
    </section>

    <section class="admin-section">
      <h2 class="section-heading">Token Treasury</h2>
      <div class="admin-grid admin-grid--single">
        <article class="admin-card">
          <p class="admin-label">Token Balance</p>
          <span id="tokenBalanceDisplay" class="admin-value">Loading...</span>
          <div class="admin-actions">
            <button class="admin-button admin-button--secondary" @click="withdrawTokens">Withdraw Tokens</button>
            <button class="admin-button admin-button--secondary" @click="depositTokens">Deposit Tokens</button>
          </div>
        </article>
      </div>
    </section>

    <section class="admin-section">
      <h2 class="section-heading">ERC-20 Treasury</h2>
      <div class="admin-grid">
        <article
          v-for="asset in erc20Assets"
          :key="asset.symbol"
          class="admin-card"
        >
          <div class="admin-card__header">
            <p class="admin-label">{{ asset.name }} Balance</p>
            <span class="admin-asset-tag">{{ asset.symbol }}</span>
          </div>

          <span class="admin-value">
            <template v-if="erc20Loading[asset.symbol]">
              Loading...
            </template>
            <template v-else>
              {{ erc20Balances[asset.symbol] }} {{ asset.symbol }}
            </template>
          </span>

          <div class="admin-input-row">
            <input
              type="number"
              min="0"
              step="any"
              class="admin-input"
              :placeholder="`Withdraw ${asset.symbol}`"
              v-model="erc20WithdrawInputs[asset.symbol]"
            >
            <button
              type="button"
              class="admin-button admin-button--secondary"
              @click="withdrawErc20(asset.symbol)"
              :disabled="erc20Loading[asset.symbol] || !erc20WithdrawInputs[asset.symbol] || Number(erc20WithdrawInputs[asset.symbol]) <= 0"
            >
              Withdraw Amount
            </button>
          </div>

          <div class="admin-actions">
            <button
              type="button"
              class="admin-button admin-button--secondary"
              @click="withdrawAllErc20(asset.symbol)"
              :disabled="erc20Loading[asset.symbol]"
            >
              Withdraw All
            </button>
          </div>
        </article>
      </div>
      <div class="admin-actions admin-actions--section">
        <button
          type="button"
          class="admin-button admin-button--secondary"
          @click="getErc20Balances"
          :disabled="erc20Assets.some(asset => erc20Loading[asset.symbol])"
        >
          Refresh Balances
        </button>
      </div>
    </section>

    <section class="admin-section">
      <h2 class="section-heading">Staking Settings</h2>
      <div class="admin-grid">
        <article class="admin-card">
          <label class="admin-label" for="apyInput">APY (%)</label>
          <div class="admin-input-row">
            <input
              type="number"
              id="apyInput"
              class="admin-input"
              placeholder="Enter new APY"
            >
            <button class="admin-button" @click="updateAPY">Update APY</button>
          </div>
        </article>

        <article class="admin-card">
          <label class="admin-label" for="globalStakedTokensInput">Global Staked Tokens</label>
          <div class="admin-input-row">
            <input
              type="number"
              id="globalStakedTokensInput"
              class="admin-input"
              placeholder="Enter total staked tokens"
            >
            <button class="admin-button" @click="updateGlobalStakedTokensAdmin">Set Total</button>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>

<script setup>
// Contract Registry configuration
import { onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ethers } from 'ethers';
let TOKEN_TICKER = import.meta.env.VITE_TOKEN;
let CONTRACT_REGISTRY_ADDRESS = import.meta.env.VITE_REGISTRY_ADDRESS;
const CONTRACT_REGISTRY_ABI = [
  "function getContractAddress(string name) view returns (address)"
];
let PRESALE_CONTRACT_ADDRESS;
const erc20Assets = Object.freeze([
  { symbol: 'WETH', address: ethers.getAddress('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'), name: 'Wrapped Ether', decimals: 18 },
  { symbol: 'USDC', address: ethers.getAddress('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'), name: 'USD Coin', decimals: 6 },
  { symbol: 'USDT', address: ethers.getAddress('0xdac17f958d2ee523a2206206994597c13d831ec7'), name: 'Tether USD', decimals: 6 },
  { symbol: 'DAI', address: ethers.getAddress('0x6b175474e89094c44da98b954eedeac495271d0f'), name: 'Dai', decimals: 18 },
  { symbol: 'USDP', address: ethers.getAddress('0x1456688345527be1f37e9e627da0837d6f08c925'), name: 'Pax Dollar', decimals: 18 },
  { symbol: 'GUSD', address: ethers.getAddress('0x056fd409e1d7a124bd7017459dfea2f387b6d5cd'), name: 'Gemini Dollar', decimals: 2 },
  { symbol: 'FRAX', address: ethers.getAddress('0x853d955acef822db058eb8505911ed77f175b99e'), name: 'Frax', decimals: 18 },
  { symbol: 'LUSD', address: ethers.getAddress('0x5f98805a4e8be255a32880fdec7f6728c6568ba0'), name: 'Liquity USD', decimals: 18 }
]);
const erc20Balances = reactive({});
const erc20Loading = reactive({});
const erc20WithdrawInputs = reactive({});

erc20Assets.forEach(({ symbol }) => {
  erc20Balances[symbol] = '0.00';
  erc20Loading[symbol] = true;
  erc20WithdrawInputs[symbol] = '';
});
async function onNetworkChange() {
  var network = 'mainnet';
  if (!window.ethereum) {
    console.error('Metamask not detected');
    return;
  }
  try {
    // Switch to Ethereum Mainnet (chainId 0x1)
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x1' }],
    });
    await refreshUI();


  } catch (error) {
    console.error('Error switching network:', error);
    alert('Failed to switch network: ' + error.message);
  }
}

function onTokenChange() {
  const token = document.getElementById('tokenSelect').value;
  TOKEN_TICKER = token;
  // Optionally, refresh the UI to load data for the selected token
  refreshUI();
}

async function fetchPresaleContractAddress() {
  let provider;
  if (window.ethereum) {
    provider = new ethers.BrowserProvider(window.ethereum);
  } else {
    provider = new ethers.JsonRpcProvider("https://ethereum-rpc.publicnode.com");
  }
  const registryContract = new ethers.Contract(CONTRACT_REGISTRY_ADDRESS, CONTRACT_REGISTRY_ABI, provider);
  PRESALE_CONTRACT_ADDRESS = await registryContract.getContractAddress(`${TOKEN_TICKER}-PRESALE`);
}

let TOKEN_ADDRESS;

async function fetchTokenAddress() {
  let provider;
  if (window.ethereum) {
    provider = new ethers.BrowserProvider(window.ethereum);
  } else {
    provider = new ethers.JsonRpcProvider("https://ethereum-rpc.publicnode.com");
  }
  const registryContract = new ethers.Contract(CONTRACT_REGISTRY_ADDRESS, CONTRACT_REGISTRY_ABI, provider);
  TOKEN_ADDRESS = await registryContract.getContractAddress(TOKEN_TICKER);
}

const PRESALE_ABI = [
  "function getTotalUsdRaised() view returns (uint256)",
  "function setTotalUsdRaised(uint256 _totalUsdRaised) external",
  "function getCurrentTokenPrice() view returns (uint256)",
  "function getPriceLastUpdatedDate() view returns (uint256)",
  "function getBaseTokenPrice() view returns (uint256)",
  "function getCurrentTime() view returns (uint256)",
  "function getNextPriceIncreaseTime() view returns (uint256)",
  "function getPriceIncrement() view returns (uint256)",
  "function setPriceIncrement(uint256 _increment) external",
  "function getPriceIncrementPeriodMinutes() view returns (uint256)",
  "function setPriceIncrementPeriodMinutes(uint256 _minutes) external",
  "function setBaseTokenPrice(uint256 _newPrice) external",
  "function getPriceFeed() view returns (address)",
  "function setPriceFeed(address _newPriceFeed) external",
  "function getPresaleFlag() view returns (bool)",
  "function setPresaleFlag(bool _status) external",
  "function getClaimFlag() view returns (bool)",
  "function setClaimFlag(bool _status) external",
  "function withdrawEth() external",
  "function withdrawTokens() external",
  "function withdrawERC20(address asset, uint256 amount) external",
  "function withdrawAllERC20(address asset) external",
  "function getTotalEthRaised() view returns (uint256)",
  "function getTotalTokensSold() view returns (uint256)",
  "function getAPY() view returns (uint256)",
  "function setAPY(uint256 _apy) external",
  "function setTotalStakedGlobal(uint256 newTotal) external",
  "function getTotalStakedTokensGlobal() view returns (uint256)",
  "function setStakedClaimFlag(bool _flag) external",
  "function getStakedClaimFlag() view returns (bool)"
];

const TOKEN_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

function formatErc20Display(value, decimals) {
  try {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return value;
    }
    const maximumFractionDigits = Math.min(decimals, 6);
    return numeric.toLocaleString('en-US', {
      minimumFractionDigits: Math.min(2, maximumFractionDigits),
      maximumFractionDigits
    });
  } catch (error) {
    console.error('Error formatting ERC-20 balance:', error);
    return value;
  }
}

async function getErc20Balances() {
  try {
    if (!PRESALE_CONTRACT_ADDRESS) {
      await fetchPresaleContractAddress();
    }
    let provider;
    if (window.ethereum) {
      provider = new ethers.BrowserProvider(window.ethereum);
    } else {
      provider = new ethers.JsonRpcProvider("https://ethereum-rpc.publicnode.com");
    }

    await Promise.all(
      erc20Assets.map(async (asset) => {
        erc20Loading[asset.symbol] = true;
        try {
          const tokenContract = new ethers.Contract(asset.address, TOKEN_ABI, provider);
          const balance = await tokenContract.balanceOf(PRESALE_CONTRACT_ADDRESS);
          const normalized = ethers.formatUnits(balance, asset.decimals);
          erc20Balances[asset.symbol] = formatErc20Display(normalized, asset.decimals);
        } catch (error) {
          console.error(`Error fetching ${asset.symbol} balance:`, error);
          erc20Balances[asset.symbol] = 'Error';
        } finally {
          erc20Loading[asset.symbol] = false;
        }
      })
    );
  } catch (error) {
    console.error('Error refreshing ERC-20 balances:', error);
    erc20Assets.forEach(({ symbol }) => {
      erc20Loading[symbol] = false;
      erc20Balances[symbol] = 'Error';
    });
  }
}

async function withdrawErc20(symbol) {
  const asset = erc20Assets.find((entry) => entry.symbol === symbol);
  if (!asset) {
    alert('Unsupported asset');
    return;
  }
  const rawAmount = (erc20WithdrawInputs[symbol] || '').trim();
  if (!rawAmount || Number(rawAmount) <= 0) {
    alert(`Enter a valid ${symbol} amount`);
    return;
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(PRESALE_CONTRACT_ADDRESS, PRESALE_ABI, signer);
    const parsedAmount = ethers.parseUnits(rawAmount, asset.decimals);
    const tx = await contract.withdrawERC20(asset.address, parsedAmount);
    await tx.wait();
    alert(`${symbol} withdrawn!`);
    erc20WithdrawInputs[symbol] = '';
    await getErc20Balances();
  } catch (error) {
    console.error(`Error withdrawing ${symbol}:`, error);
    alert(`Error withdrawing ${symbol}.`);
  }
}

async function withdrawAllErc20(symbol) {
  const asset = erc20Assets.find((entry) => entry.symbol === symbol);
  if (!asset) {
    alert('Unsupported asset');
    return;
  }
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(PRESALE_CONTRACT_ADDRESS, PRESALE_ABI, signer);
    const tx = await contract.withdrawAllERC20(asset.address);
    await tx.wait();
    alert(`All ${symbol} withdrawn!`);
    await getErc20Balances();
  } catch (error) {
    console.error(`Error withdrawing all ${symbol}:`, error);
    alert(`Error withdrawing all ${symbol}.`);
  }
}

async function updateGlobalStakedTokensAdmin() {
  const newGlobal = document.getElementById("globalStakedTokensInput").value;
  if (!newGlobal || newGlobal < 0) {
    alert("Enter a valid amount");
    return;
  }
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(PRESALE_CONTRACT_ADDRESS, PRESALE_ABI, signer);
    // Assuming tokens have 18 decimals, convert the input accordingly
    const tx = await contract.setTotalStakedGlobal(ethers.parseUnits(newGlobal, 18));
    await tx.wait();
    alert("Global Staked Tokens updated!");
  } catch (error) {
    console.error("Error updating global staked tokens:", error);
    alert("Error updating global staked tokens.");
  }
}

async function getCurrentAPY() {
  try {
    // Ensure PRESALE_CONTRACT_ADDRESS is available
    if (!PRESALE_CONTRACT_ADDRESS) {
      await fetchPresaleContractAddress();
    }
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(PRESALE_CONTRACT_ADDRESS, PRESALE_ABI, provider);
    const currentAPY = await contract.getAPY();
    document.getElementById("apyInput").value = currentAPY.toString();
  } catch (error) {
    console.error("Error fetching current APY:", error);
  }
}

// document.addEventListener("DOMContentLoaded", getCurrentAPY);

async function updateAPY() {
  const newAPY = document.getElementById("apyInput").value;
  if (!newAPY || newAPY < 0) return alert("Enter a valid APY value");
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(PRESALE_CONTRACT_ADDRESS, PRESALE_ABI, signer);
    const tx = await contract.setAPY(parseInt(newAPY));
    await tx.wait();
    alert("APY updated!");
    await getCurrentAPY();
  } catch (error) {
    console.error("Error updating APY:", error);
    alert("Error updating APY.");
  }
}

async function getPresaleEthBalance() {
  try {
    // Ensure PRESALE_CONTRACT_ADDRESS is available
    if (!PRESALE_CONTRACT_ADDRESS) {
      await fetchPresaleContractAddress();
    }
    const provider = new ethers.BrowserProvider(window.ethereum);
    const balance = await provider.getBalance(PRESALE_CONTRACT_ADDRESS);
    const formattedBalance = ethers.formatUnits(balance, 18); // Convert from Wei to ETH

    document.getElementById("presaleEthBalanceDisplay").textContent = `${formattedBalance} ETH`;
  } catch (error) {
    console.error("Error fetching presale contract ETH balance:", error);
    document.getElementById("presaleEthBalanceDisplay").textContent = "Error loading";
  }
}

// Fetch presale contract ETH balance when the page loads
// document.addEventListener("DOMContentLoaded", getPresaleEthBalance);

async function withdrawEth() {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(PRESALE_CONTRACT_ADDRESS, PRESALE_ABI, signer);

    const tx = await contract.withdrawEth();
    await tx.wait();
    alert("Funds withdrawn!");

    // ✅ Refresh ETH balance after withdrawal
    await getPresaleEthBalance();
  } catch (error) {
    console.error(error);
    alert("Error withdrawing funds.");
  }
}

async function getBaseTokenPrice() {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(PRESALE_CONTRACT_ADDRESS, PRESALE_ABI, provider);

    const baseTokenPrice = await contract.getBaseTokenPrice(); // ✅ Fetch base token price
    const formattedPrice = ethers.formatUnits(baseTokenPrice, 18); // WAD (1e18)

    document.getElementById("tokenPriceInput").value = formattedPrice; // ✅ Populate the input field
  } catch (error) {
    console.error("Error fetching base token price:", error);
    document.getElementById("tokenPriceInput").value = "Error";
  }
}

async function getPriceIncrementPeriod() {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(PRESALE_CONTRACT_ADDRESS, PRESALE_ABI, provider);

    const periodMins = await contract.getPriceIncrementPeriodMinutes();

    document.getElementById("priceIncrementPeriodInput").value = Number(periodMins);
  } catch (error) {
    console.error("Error fetching price increment period:", error);
    document.getElementById("priceIncrementPeriodInput").value = "Error";
  }
}

async function updatePriceIncrementPeriod() {
  const newPeriod = document.getElementById("priceIncrementPeriodInput").value;
  if (!newPeriod || newPeriod <= 0) return alert("Enter a valid period in days");

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(PRESALE_CONTRACT_ADDRESS, PRESALE_ABI, signer);

    const tx = await contract.setPriceIncrementPeriodMinutes(parseInt(newPeriod));
    await tx.wait();
    alert("Price increment period updated!");

    // ✅ Refresh displayed price increment period
    await getPriceIncrementPeriod();
  } catch (error) {
    console.error(error);
    alert("Error updating price increment period.");
  }
}

async function getPriceIncrement() {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(PRESALE_CONTRACT_ADDRESS, PRESALE_ABI, provider);

    const increment = await contract.getPriceIncrement(); // ✅ Use the getter function
    const formattedIncrement = ethers.formatUnits(increment, 18); // WAD (1e18)

    document.getElementById("priceIncrementInput").value = formattedIncrement;
  } catch (error) {
    console.error("Error fetching price increment:", error);
    document.getElementById("priceIncrementInput").value = "Error";
  }
}

async function updatePriceIncrement() {
  const newIncrement = document.getElementById("priceIncrementInput").value;
  if (!newIncrement || newIncrement <= 0) return alert("Enter a valid increment");

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(PRESALE_CONTRACT_ADDRESS, PRESALE_ABI, signer);

    const tx = await contract.setPriceIncrement(ethers.parseUnits(newIncrement, 18)); // WAD (1e18)
    await tx.wait();
    alert("Price increment updated!");

    // ✅ Refresh displayed price increment
    await getPriceIncrement();
  } catch (error) {
    console.error(error);
    alert("Error updating price increment.");
  }
}

async function getPriceLastUpdated() {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(PRESALE_CONTRACT_ADDRESS, PRESALE_ABI, provider);

    const timestamp = await contract.getPriceLastUpdatedDate(); // ✅ Use the correct getter function
    const formattedDate = new Date(Number(timestamp) * 1000).toLocaleString(); // Convert UNIX timestamp to readable date

    document.getElementById("priceLastUpdatedDisplay").textContent = formattedDate;
  } catch (error) {
    console.error("Error fetching last price update timestamp:", error);
    document.getElementById("priceLastUpdatedDisplay").textContent = "Error loading";
  }
}

async function getCurrentPresaleStatus() {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const contract = new ethers.Contract(PRESALE_CONTRACT_ADDRESS, PRESALE_ABI, provider);
  const status = await contract.getPresaleFlag();
  document.getElementById("presaleCheckbox").checked = status;
}

async function getCurrentClaimingStatus() {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const contract = new ethers.Contract(PRESALE_CONTRACT_ADDRESS, PRESALE_ABI, provider);
  const status = await contract.getClaimFlag();
  document.getElementById("claimingCheckbox").checked = status;
}

async function getCurrentTokenPrice() {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(PRESALE_CONTRACT_ADDRESS, PRESALE_ABI, provider);

    const tokenPriceInUsd = await contract.getCurrentTokenPrice();
    const formattedPrice = ethers.formatUnits(tokenPriceInUsd, 18); // WAD (1e18)

    document.getElementById("currentTokenPriceDisplay").textContent = `$${formattedPrice}`;
  } catch (error) {
    console.error("Error fetching current token price:", error);
    document.getElementById("currentTokenPriceDisplay").textContent = "Error loading";
  }
}

async function getCurrentPriceFeedAddress() {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(PRESALE_CONTRACT_ADDRESS, PRESALE_ABI, provider);

    const priceFeedAddress = await contract.getPriceFeed(); // ✅ Use the correct getter function

    const feedInput = document.getElementById("priceFeedInput");
    if (feedInput) {
      feedInput.value = priceFeedAddress; // Pre-fill input with the price feed address
    }
  } catch (error) {
    console.error("Error fetching current price feed address:", error);
  }
}

async function updateTokenPrice() {
  const newPrice = document.getElementById("tokenPriceInput").value;
  if (!newPrice) return alert("Enter a valid price");

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(PRESALE_CONTRACT_ADDRESS, PRESALE_ABI, signer);

    const tx = await contract.setBaseTokenPrice(ethers.parseUnits(newPrice, 18)); // WAD (1e18)
    await tx.wait();
    alert("Token price updated!");
  } catch (error) {
    console.error(error);
    alert("Error updating token price.");
  }
}

async function updatePriceFeed() {
  const newAddress = document.getElementById("priceFeedInput").value;
  if (!ethers.isAddress(newAddress)) return alert("Enter a valid address");

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(PRESALE_CONTRACT_ADDRESS, PRESALE_ABI, signer);

    const tx = await contract.setPriceFeed(newAddress);
    await tx.wait();
    alert("Price feed updated!");
  } catch (error) {
    console.error(error);
    alert("Error updating price feed.");
  }
}

async function updatePresaleStatus() {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(PRESALE_CONTRACT_ADDRESS, PRESALE_ABI, signer);

    const isChecked = document.getElementById("presaleCheckbox").checked;

    const tx = await contract.setPresaleFlag(isChecked); // ✅ Use the correct function
    await tx.wait();
    alert(`Presale status updated: ${isChecked ? "Active" : "Inactive"}`);
  } catch (error) {
    console.error("Error updating presale status:", error);
    alert("Error updating presale status.");
  }
}

async function updateClaimingStatus() {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(PRESALE_CONTRACT_ADDRESS, PRESALE_ABI, signer);

    const isChecked = document.getElementById("claimingCheckbox").checked;

    const tx = await contract.setClaimFlag(isChecked); // ✅ Use the correct function
    await tx.wait();
    alert(`Claiming status updated: ${isChecked ? "Enabled" : "Disabled"}`);
  } catch (error) {
    console.error("Error updating claiming status:", error);
    alert("Error updating claiming status.");
  }
}

async function updateStakedClaimingStatus() {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(PRESALE_CONTRACT_ADDRESS, PRESALE_ABI, signer);
    const isChecked = document.getElementById("stakedClaimingCheckbox").checked;
    const tx = await contract.setStakedClaimFlag(isChecked);
    await tx.wait();
    alert(`Staked Claiming status updated: ${isChecked ? "Enabled" : "Disabled"}`);
  } catch (error) {
    console.error("Error updating staked claiming status:", error);
    alert("Error updating staked claiming status.");
  }
}

async function getTotalEthRaised() {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(PRESALE_CONTRACT_ADDRESS, PRESALE_ABI, provider);

    const totalEthRaised = await contract.getTotalEthRaised();
    const formattedEth = ethers.formatUnits(totalEthRaised, 18); // Convert from Wei to ETH

    document.getElementById("totalEthRaisedDisplay").textContent = `${formattedEth} ETH`;
  } catch (error) {
    console.error("Error fetching total ETH raised:", error);
    document.getElementById("totalEthRaisedDisplay").textContent = "Error loading";
  }
}

// Fetch balance at presale contract when the page loads
async function getTokenBalanceAtPresale() {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider);

    const balance = await tokenContract.balanceOf(PRESALE_CONTRACT_ADDRESS);
    const formattedBalance = ethers.formatUnits(balance, 18); // Convert from smallest unit to readable tokens

    document.getElementById("tokenBalanceDisplay").textContent = `${formattedBalance}`;
  } catch (error) {
    console.error("Error fetching balance at presale contract:", error);
    document.getElementById("tokenBalanceDisplay").textContent = "Error loading";
  }
}

async function withdrawTokens() {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(PRESALE_CONTRACT_ADDRESS, PRESALE_ABI, signer);

    const tx = await contract.withdrawTokens();
    await tx.wait();
    alert("Unsold tokens withdrawn!");
    await getTokenBalanceAtPresale();
  } catch (error) {
    console.error(error);
    alert("Error withdrawing unsold tokens.");
  }
}

async function depositTokens() {
  const depositAmount = prompt("Enter the amount of tokens to deposit:");
  if (!depositAmount || depositAmount <= 0) {
    alert("Enter a valid token amount");
    return;
  }
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);
    const amount = ethers.parseUnits(depositAmount, 18);
    const tx = await tokenContract.transfer(PRESALE_CONTRACT_ADDRESS, amount);
    await tx.wait();
    alert("Tokens deposited successfully!");
    await getTokenBalanceAtPresale();
  } catch (error) {
    console.error("Error depositing tokens:", error);
    alert("Error depositing tokens.");
  }
}

async function getTotalTokensSold() {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(PRESALE_CONTRACT_ADDRESS, PRESALE_ABI, provider);

    const totalTokensSold = await contract.getTotalTokensSold();
    const formattedTokens = Number(ethers.formatUnits(totalTokensSold, 18)).toFixed(6);
    const parts = formattedTokens.split(".");
    const formattedWithCommas = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + parts[1];

    document.getElementById("totalTokensSoldDisplay").textContent = `${formattedWithCommas}`;
  } catch (error) {
    console.error("Error fetching total tokens sold:", error);
    document.getElementById("totalTokensSoldDisplay").textContent = "Error loading";
  }
}




async function getCurrentBlockchainTime() {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(PRESALE_CONTRACT_ADDRESS, PRESALE_ABI, provider);

    const timestamp = await contract.getCurrentTime();
    const formattedDate = new Date(Number(timestamp) * 1000).toLocaleString(); // Convert UNIX timestamp to readable date

    document.getElementById("currentTimeDisplay").textContent = formattedDate;
  } catch (error) {
    console.error("Error fetching current blockchain time:", error);
    document.getElementById("currentTimeDisplay").textContent = "Error loading";
  }
}

async function getNextPriceIncreaseTime() {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(PRESALE_CONTRACT_ADDRESS, PRESALE_ABI, provider);
    const timestamp = await contract.getNextPriceIncreaseTime();
    const formattedDate = new Date(Number(timestamp) * 1000).toLocaleString();
    document.getElementById("nextPriceIncreaseDisplay").textContent = formattedDate;
  } catch (error) {
    console.error("Error fetching next price increase time:", error);
    document.getElementById("nextPriceIncreaseDisplay").textContent = "Error loading";
  }
}

async function getTotalUsdRaised() {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(PRESALE_CONTRACT_ADDRESS, PRESALE_ABI, provider);

    const totalUsdRaised = await contract.getTotalUsdRaised();
    const formattedUsd = Number(ethers.formatUnits(totalUsdRaised, 18)).toFixed(2); // WAD (1e18)

    // ✅ Add comma separator for every 3 digits before the decimal
    const parts = formattedUsd.split(".");
    const formattedWithCommas = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + parts[1];

    document.getElementById("totalUsdRaisedInput").value = formattedUsd; // ✅ Raw numeric value
    const displayElement = document.getElementById("totalUsdRaisedDisplay");
    if (displayElement) {
      displayElement.textContent = formattedWithCommas; // ✅ Comma-separated display value
    }
  } catch (error) {
    console.error("Error fetching total USD raised:", error);
    document.getElementById("totalUsdRaisedInput").value = "Error";
  }
}

async function updateTotalUsdRaised() {
  const newUsdRaised = document.getElementById("totalUsdRaisedInput").value;
  if (!newUsdRaised || newUsdRaised < 0) return alert("Enter a valid amount");

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(PRESALE_CONTRACT_ADDRESS, PRESALE_ABI, signer);

    const tx = await contract.setTotalUsdRaised(ethers.parseUnits(newUsdRaised, 18)); // WAD (1e18)
    await tx.wait();
    alert("Total USD Raised updated!");

    // ✅ Refresh displayed total USD raised
    await getTotalUsdRaised();
  } catch (error) {
    console.error("Error updating total USD raised:", error);
    alert("Error updating total USD raised.");
  }
}

async function getGlobalStakedTokens() {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(PRESALE_CONTRACT_ADDRESS, PRESALE_ABI, provider);
    const globalStaked = await contract.getTotalStakedTokensGlobal();
    // Assuming tokens have 18 decimals
    const formattedGlobal = ethers.formatUnits(globalStaked, 18);
    document.getElementById("globalStakedTokensInput").value = formattedGlobal;
  } catch (error) {
    console.error("Error fetching global staked tokens:", error);
  }
}

async function getCurrentStakedClaimingStatus() {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(PRESALE_CONTRACT_ADDRESS, PRESALE_ABI, provider);
    const status = await contract.getStakedClaimFlag();
    document.getElementById("stakedClaimingCheckbox").checked = status;
  } catch (error) {
    console.error("Error fetching staked claiming status:", error);
  }
}

async function refreshUI() {
  // First, ensure the presale contract address is fetched and set.
  await fetchPresaleContractAddress();
  await fetchTokenAddress();

  // Then call all other initialization functions.
  getCurrentAPY();
  getPresaleEthBalance();
  getBaseTokenPrice();
  getPriceIncrementPeriod();
  getPriceIncrement();
  getPriceLastUpdated();
  getCurrentPresaleStatus();
  getCurrentClaimingStatus();
  getCurrentTokenPrice();
  getCurrentPriceFeedAddress();
  getTotalEthRaised();
  getTokenBalanceAtPresale();
  getTotalTokensSold();
  getCurrentBlockchainTime();
  getNextPriceIncreaseTime();
  getTotalUsdRaised();
  getGlobalStakedTokens();
  getCurrentStakedClaimingStatus();
  getErc20Balances();
}

const router = useRouter();

async function enforceOwnerOrRedirect() {
  try {
    if (!window.ethereum) return router.replace('/');
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const user = accounts?.[0]?.toLowerCase();
    if (!user) return router.replace('/');

    const provider = new ethers.BrowserProvider(window.ethereum);
    const registry = new ethers.Contract(CONTRACT_REGISTRY_ADDRESS, ["function owner() view returns (address)"], provider);
    const owner = (await registry.owner()).toLowerCase();

    if (owner !== user) router.replace('/');
  } catch {
    router.replace('/');
  }
}

onMounted(async () => {
  await enforceOwnerOrRedirect();
  await onNetworkChange();
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Roboto+Mono:wght@400;600&display=swap');

.admin-dashboard {
  font-family: 'Inter', 'Roboto', sans-serif;
  max-width: 960px;
  margin: clamp(24px, 5vw, 56px) auto;
  padding: clamp(28px, 5vw, 60px);
  color: #111827;
  background: #f5f7fb;
  border-radius: 28px;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
}

.admin-header {
  text-align: center;
  margin-bottom: clamp(24px, 4vw, 40px);
}

.admin-title {
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 700;
  margin-bottom: 8px;
}

.admin-subtitle {
  font-size: 1rem;
  color: #4b5563;
  margin: 0 auto;
  max-width: 560px;
}

.admin-section + .admin-section {
  margin-top: clamp(32px, 5vw, 48px);
}

.section-heading {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16px;
}

.admin-grid {
  display: grid;
  gap: 20px;
}

.admin-grid--compact {
  gap: 16px;
}

.admin-grid--single {
  grid-template-columns: 1fr;
}

@media (min-width: 720px) {
  .admin-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .admin-grid--compact {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.admin-card {
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.admin-card--readonly {
  background-color: #f9fafb;
}

.admin-card--toggle {
  align-items: center;
  justify-content: center;
}

.admin-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.admin-asset-tag {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: #eef2ff;
  color: #312e81;
  padding: 4px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.admin-label {
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #6b7280;
}

.admin-input-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.admin-input {
  flex: 1 1 160px;
  min-width: 0;
  padding: 0.65rem 0.85rem;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  font-size: 1rem;
  color: #111827;
  background-color: #ffffff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.admin-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.admin-value {
  font-family: 'Roboto Mono', monospace;
  font-size: 1rem;
  color: #1f2937;
  word-break: break-word;
}

.admin-meta {
  font-size: 0.85rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 6px;
}

.admin-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.admin-actions--section {
  justify-content: flex-end;
  margin-top: 12px;
}

.admin-button {
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  border: none;
  border-radius: 10px;
  padding: 0.65rem 1rem;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #ffffff;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.2s ease;
}

.admin-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 16px rgba(37, 99, 235, 0.2);
}

.admin-button:active {
  transform: translateY(0);
  box-shadow: 0 4px 8px rgba(37, 99, 235, 0.16);
}

.admin-button--secondary {
  background: #ffffff;
  color: #1f2937;
  border: 1px solid #d1d5db;
}

.admin-button--secondary:hover {
  filter: brightness(0.97);
  box-shadow: 0 4px 10px rgba(17, 24, 39, 0.08);
  transform: translateY(-1px);
}

.admin-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  color: #1f2937;
  cursor: pointer;
}

.admin-toggle input {
  width: 20px;
  height: 20px;
  accent-color: #2563eb;
}
</style>
