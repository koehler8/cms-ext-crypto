import { h, toRef } from 'vue';
import { usePresaleStore } from './stores/presale.js';

/**
 * Extension setup hook — called by the CMS during app initialisation.
 *
 * Registers the appkit-button web component proxy, provides presale state
 * to the component tree, and wires up the scroll-to-presale event listener.
 */
export async function setup({ app, pinia, siteData, isClient }) {
  if (!isClient) return;

  // Register the appkit-button web component proxy so Vue doesn't warn
  app.component('appkit-button', {
    name: 'AppKitButtonProxy',
    render() {
      return h('appkit-button');
    },
  });

  // Provide presale state to the component tree via provide/inject
  const store = usePresaleStore(pinia);
  app.provide('presalePulse', toRef(store, 'presalePulse'));
  app.provide('personalPresaleSummary', toRef(store, 'personalPresaleSummary'));
}
