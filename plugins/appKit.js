import { createAppKit } from '@reown/appkit/vue';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { mainnet } from '@reown/appkit/networks';

let appKitInstance;
const FEATURED_WALLET_IDS = Object.freeze([
  'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
  'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Base (Coinbase Wallet)
  '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
]);

function buildMetadata(siteData) {
  const hasWindow = typeof window !== 'undefined';
  const fallbackUrl = hasWindow ? window.location.origin : '';
  const site = siteData?.site ?? {};

  let configuredUrl = typeof site.url === 'string' ? site.url.trim() : '';
  if (!configuredUrl) {
    configuredUrl = fallbackUrl;
  }

  if (hasWindow && configuredUrl) {
    try {
      const configuredOrigin = new URL(configuredUrl).origin;
      const currentOrigin = new URL(fallbackUrl || configuredUrl).origin;
      if (configuredOrigin !== currentOrigin) {
        configuredUrl = currentOrigin;
      }
    } catch {
      configuredUrl = fallbackUrl || configuredUrl;
    }
  }

  return {
    name: site.title ?? 'Product Site',
    description: site.description ?? '',
    url: configuredUrl,
    icons: Array.isArray(site.icons) ? site.icons : [],
  };
}

export function ensureAppKit({ siteData, projectId: overrideProjectId } = {}) {
  if (appKitInstance) return appKitInstance;

  const projectId = overrideProjectId || import.meta.env.VITE_REOWN_PROJECT_ID;
  if (!projectId) {
    console.warn('ensureAppKit: VITE_REOWN_PROJECT_ID is missing; wallet UI not initialised.');
    return undefined;
  }

  if (typeof globalThis !== 'undefined') {
    const issuedWarnings =
      globalThis.litIssuedWarnings instanceof Set
        ? globalThis.litIssuedWarnings
        : (globalThis.litIssuedWarnings = new Set());
    issuedWarnings.add('dev-mode');
    issuedWarnings.add('change-in-update');

    if (!globalThis.__appkitPatchedSvgAttributes) {
      const svgProto = typeof SVGElement !== 'undefined' ? SVGElement.prototype : null;
      if (svgProto) {
        const originalSetAttribute = svgProto.setAttribute;
        const originalSetAttributeNS = svgProto.setAttributeNS;
        const originalRemoveAttribute = svgProto.removeAttribute;
        const originalRemoveAttributeNS = svgProto.removeAttributeNS;

        const shouldNullify = (name, value) =>
          (name === 'height' || name === 'width') &&
          (value === '' || value === null || value === undefined);

        svgProto.setAttribute = function patchedSetAttribute(name, value) {
          if (shouldNullify(name, value)) {
            if (originalRemoveAttribute) {
              originalRemoveAttribute.call(this, name);
              return;
            }
            return;
          }
          return originalSetAttribute.call(this, name, value);
        };

        svgProto.setAttributeNS = function patchedSetAttributeNS(ns, name, value) {
          if (shouldNullify(name, value)) {
            if (originalRemoveAttributeNS) {
              originalRemoveAttributeNS.call(this, ns, name);
              return;
            }
            return;
          }
          return originalSetAttributeNS.call(this, ns, name, value);
        };

        globalThis.__appkitPatchedSvgAttributes = true;
      }
    }
  }

  const metadata = buildMetadata(siteData);

  const neutralizeFontPreload = () => {
    if (typeof document === 'undefined') return;

    const BLOCKED_PREFIX = 'https://fonts.reown.com/';

    const isBlockedLink = (node) => {
      if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
      const tag = node.tagName?.toLowerCase();
      if (tag !== 'link') return false;
      const rel = (node.rel || node.getAttribute('rel') || '').toLowerCase();
      if (rel !== 'preload') return false;
      const href = node.href || node.getAttribute('href') || '';
      return href.startsWith(BLOCKED_PREFIX);
    };

    const pruneNode = (node) => {
      if (!node) return false;
      if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        let removed = false;
        Array.from(node.childNodes).forEach((child) => {
          if (isBlockedLink(child)) {
            node.removeChild(child);
            removed = true;
          }
        });
        return removed;
      }

      if (isBlockedLink(node)) {
        node.remove();
        return true;
      }
      return false;
    };

    const patchHeadInsertion = () => {
      const head = document.head;
      if (!head || head.__reownPreloadBlocked) return;
      Object.defineProperty(head, '__reownPreloadBlocked', {
        value: true,
        configurable: false,
        enumerable: false,
        writable: false,
      });

      const wrapMethod = (proto, method) => {
        const original = proto?.[method];
        if (!original) return;
        proto[method] = function wrappedMethod(...args) {
          if (this !== head) {
            return original.apply(this, args);
          }

          if (!args.length) {
            return original.apply(this, args);
          }

          if (method === 'append' || method === 'prepend') {
            const filteredArgs = [];
            let mutated = false;
            for (const arg of args) {
              if (arg instanceof Node) {
                const wasPruned = pruneNode(arg);
                if (arg.nodeType === Node.DOCUMENT_FRAGMENT_NODE && !arg.childNodes.length) {
                  mutated = true;
                  continue;
                }
                if (isBlockedLink(arg)) {
                  mutated = true;
                  continue;
                }
                mutated = mutated || wasPruned;
              }
              filteredArgs.push(arg);
            }

            if (!filteredArgs.length && mutated) {
              return undefined;
            }
            return original.apply(this, filteredArgs);
          }

          const targetNode = args[0];
          if (targetNode instanceof Node && pruneNode(targetNode)) {
            if (method === 'replaceChild') {
              return args[1];
            }
            return targetNode;
          }

          return original.apply(this, args);
        };
      };

      wrapMethod(Element.prototype, 'append');
      wrapMethod(Element.prototype, 'prepend');
      wrapMethod(Node.prototype, 'appendChild');
      wrapMethod(Node.prototype, 'insertBefore');
      wrapMethod(Node.prototype, 'replaceChild');
    };

    const transformLinks = () => {
      let removed = false;
      document
        .querySelectorAll('link[rel="preload"][href^="https://fonts.reown.com/"]')
        .forEach((link) => {
          if (pruneNode(link)) {
            removed = true;
          }
        });
      return removed;
    };

    patchHeadInsertion();
    transformLinks();

    if (typeof MutationObserver === 'undefined') {
      return;
    }

    const observer = new MutationObserver(() => {
      transformLinks();
    });

    observer.observe(document.head || document.documentElement, {
      childList: true,
      subtree: true,
    });
  };

  appKitInstance = createAppKit({
    adapters: [new EthersAdapter()],
    networks: [mainnet],
    metadata,
    projectId,
    featuredWalletIds: FEATURED_WALLET_IDS,
    features: {
      analytics: true,
      connectMethodsOrder: ['wallet'],
      connectorTypeOrder: [
        'injected',
        'walletConnect',
        'recent',
        'featured',
        'custom',
        'external',
        'recommended',
      ],
      onramp: {
        providers: ['meld'],
        requireEmail: false,
      },
      swap: {
        providers: ['1inch'],
      },
    },
  });

  neutralizeFontPreload();

  return appKitInstance;
}
