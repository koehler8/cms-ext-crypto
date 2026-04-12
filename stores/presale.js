import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getTokenSymbol } from '../utils/tokenFormat.js';

const tokenSymbol = getTokenSymbol();
const DEFAULT_PRESALE_CAPTION = tokenSymbol
  ? `Limited supply. Secure your ${tokenSymbol} before the next price bump.`
  : 'Limited supply. Secure your spot before the next price bump.';

function createDefaultPresalePulse() {
  return {
    isLive: false,
    isHydrated: false,
    totalAllocation: 0,
    soldAmount: 0,
    uniqueBuyers: 0,
    enabled: false,
    title: 'Presale momentum',
    caption: DEFAULT_PRESALE_CAPTION,
    showFuse: true,
    animates: true,
    priceScheduleTitle: '',
    priceScheduleSubtitle: '',
    nextPhaseTimestamp: null,
    totalUsdRaised: 0,
    totalUsdRaisedFormatted: '$0.00',
    schedule: [],
    currentPhase: null,
    nextPhase: null,
    phaseIndex: null,
    totalPhases: null,
    fetchedAt: 0,
  };
}

function createDefaultPersonalSummary() {
  return {
    isHydrated: false,
    purchased: 0,
    purchasedFormatted: '0',
    staked: 0,
    stakedFormatted: '0',
    stakeable: 0,
    stakeableFormatted: '0',
    rewards: 0,
    rewardsFormatted: '0',
  };
}

export const usePresaleStore = defineStore('presale', () => {
  const presalePulse = ref(createDefaultPresalePulse());
  const personalPresaleSummary = ref(createDefaultPersonalSummary());

  function resetPresalePulse() {
    presalePulse.value = createDefaultPresalePulse();
  }

  function resetPersonalPresaleSummary() {
    personalPresaleSummary.value = createDefaultPersonalSummary();
  }

  return {
    presalePulse,
    personalPresaleSummary,
    resetPresalePulse,
    resetPersonalPresaleSummary,
  };
});

export { createDefaultPresalePulse, createDefaultPersonalSummary };
