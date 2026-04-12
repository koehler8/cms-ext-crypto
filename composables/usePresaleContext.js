import { storeToRefs } from 'pinia';
import { usePresaleStore } from '../stores/presale.js';

export function usePresaleContext() {
  const store = usePresaleStore();
  const { presalePulse, personalPresaleSummary } = storeToRefs(store);

  return {
    presalePulse,
    personalPresaleSummary,
    resetPresalePulse: store.resetPresalePulse,
    resetPersonalPresaleSummary: store.resetPersonalPresaleSummary,
  };
}

export function getPresalePulseSnapshot() {
  const store = usePresaleStore();
  return store.presalePulse;
}

export function getPersonalPresaleSummarySnapshot() {
  const store = usePresaleStore();
  return store.personalPresaleSummary;
}
