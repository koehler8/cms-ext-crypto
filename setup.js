import { h, toRef } from 'vue';
import { usePresaleStore } from './stores/presale.js';
import { ensureAppKit } from './plugins/appKit.js';

/**
 * Extension setup hook — called by the CMS during app initialisation.
 *
 * Initializes AppKit wallet connection, registers the appkit-button web
 * component proxy, and provides presale state to the component tree.
 */
export async function setup({ app, pinia, siteData, isClient }) {
  if (!isClient) return;

  // Initialize AppKit so wallet modals work
  ensureAppKit({ siteData });

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
