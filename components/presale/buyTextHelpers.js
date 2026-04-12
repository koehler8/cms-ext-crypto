import { formatDecimal } from '@d2sg/cms/utils/formatNumber';
import { CoreHelperUtil } from '@reown/appkit-controllers';

// ─── Text sanitization ──────────────────────────────────────────────

function sanitizeText(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function replaceAssetTokens(base, symbol) {
  if (!base) return '';
  const assetSymbol = symbol || 'ETH';
  let output = base.replace(/\{asset\}/gi, assetSymbol);
  if (assetSymbol !== 'ETH') {
    output = output.replace(/\bETH\b/g, assetSymbol).replace(/\beth\b/g, assetSymbol.toLowerCase());
  }
  return output;
}

function resolveAssetLabel(raw, fallback, symbol) {
  const sanitized = sanitizeText(raw);
  const base = sanitized || fallback || '';
  return replaceAssetTokens(base, symbol);
}

function formatFromConfig(value, replacements = {}) {
  const base = sanitizeText(value);
  if (!base) return '';
  return base.replace(/\{(\w+)\}/g, (_, key) => (key in replacements ? replacements[key] : ''));
}

function sanitizeBenefitText(value) {
  const text = sanitizeText(value);
  if (!text) return '';
  const words = text.split(/\s+/);
  if (words.length <= 12) return text;
  return `${words.slice(0, 12).join(' ')}…`;
}

function sanitizeIcon(value) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim().slice(0, 2);
  }
  return '✨';
}

function sanitizeUrl(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('#')) return trimmed;
  return '';
}

function toBadgeText(value) {
  const text = sanitizeText(value);
  if (!text) return '';
  return text.toUpperCase();
}

// ─── Onboarding sanitization ────────────────────────────────────────

function sanitizeOnboardingStepEntry(entry, index) {
  if (!entry) return null;
  if (typeof entry === 'string') {
    const text = sanitizeText(entry);
    if (!text) return null;
    return {
      id: `step-${index}`,
      text,
      title: '',
    };
  }
  if (entry && typeof entry === 'object') {
    const text = sanitizeText(entry.text || entry.description || entry.copy || '');
    if (!text) return null;
    const title = sanitizeText(entry.title || entry.heading || '');
    return {
      id: entry.id || `step-${index}`,
      text,
      title,
    };
  }
  return null;
}

// ─── Connector options ──────────────────────────────────────────────

const defaultConnectorOptions = Object.freeze([
  { id: 'metamask', label: 'MetaMask' },
  { id: 'walletconnect', label: 'WalletConnect' },
  { id: 'coinbase', label: 'Coinbase Wallet' },
]);

function normalizeConnectorOptions(raw) {
  const fallback = defaultConnectorOptions.map((option) => ({ ...option }));
  if (raw === undefined || raw === null) {
    return fallback;
  }

  if (typeof raw === 'object' && !Array.isArray(raw)) {
    if (raw.enabled === false) {
      return [];
    }
    if (Array.isArray(raw.options)) {
      raw = raw.options;
    } else if (Array.isArray(raw.wallets)) {
      raw = raw.wallets;
    } else if (Array.isArray(raw.items)) {
      raw = raw.items;
    } else if (Array.isArray(raw.list)) {
      raw = raw.list;
    }
  }

  if (!Array.isArray(raw)) {
    return fallback;
  }

  const normalized = raw
    .map((entry) => {
      if (!entry) return null;
      if (typeof entry === 'string') {
        const label = sanitizeText(entry);
        if (!label) return null;
        const key = label.toLowerCase().replace(/\s+/g, '');
        const known = defaultConnectorOptions.find((option) => option.id === key);
        if (known) return { ...known };
        const id = key.replace(/[^a-z0-9_-]/g, '');
        if (!id) return null;
        return { id, label };
      }
      if (typeof entry === 'object') {
        const labelSource =
          typeof entry.label === 'string'
            ? entry.label
            : typeof entry.name === 'string'
              ? entry.name
              : '';
        const label = sanitizeText(labelSource);
        const idSource =
          typeof entry.id === 'string'
            ? entry.id
            : typeof entry.key === 'string'
              ? entry.key
              : label;
        const id = (idSource || '')
          .toString()
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '')
          .replace(/[^a-z0-9_-]/g, '');
        const known = defaultConnectorOptions.find((option) => option.id === id);
        if (known) return { ...known };
        if (!id && !label) return null;
        return {
          id: id || label.toLowerCase().replace(/\s+/g, ''),
          label: label || entry.id || entry.key || 'Wallet',
        };
      }
      return null;
    })
    .filter((option) => option && option.id && option.label)
    .filter(
      (option, index, self) =>
        self.findIndex((candidate) => candidate.id === option.id) === index
    );

  const prioritized = [];
  const seen = new Set();
  const addOption = (option) => {
    if (!option || !option.id) return;
    if (seen.has(option.id)) return;
    seen.add(option.id);
    const sanitizedLabel = sanitizeText(option.label);
    prioritized.push({
      id: option.id,
      label: sanitizedLabel || option.label || defaultConnectorOptions.find((base) => base.id === option.id)?.label || 'Wallet',
    });
  };

  const overrides = new Map(normalized.map((option) => [option.id, option]));

  defaultConnectorOptions.forEach((base) => {
    const override = overrides.get(base.id);
    if (override) {
      addOption({
        ...override,
        id: base.id,
        label: override.label || base.label,
      });
    } else {
      addOption({ ...base });
    }
  });

  normalized.forEach((option) => {
    addOption({ ...option });
  });

  if (!prioritized.length) {
    return fallback;
  }

  return prioritized.slice(0, 4);

}

// ─── Link helpers ───────────────────────────────────────────────────

function linkTarget(link) {
  return link.openInNewTab ? '_blank' : '_self';
}

function linkRel(link) {
  return link.rel || (link.openInNewTab ? 'noopener noreferrer' : undefined);
}

// ─── Address formatting ─────────────────────────────────────────────

function shortAddress(value) {
  if (!value) return '';
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function normalizeWalletAddress(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  try {
    if (CoreHelperUtil && typeof CoreHelperUtil.getPlainAddress === 'function') {
      const plain = CoreHelperUtil.getPlainAddress(trimmed);
      if (plain && typeof plain === 'string' && plain.trim()) {
        return plain.trim();
      }
    }
  } catch {
    // ignore parsing errors and fall back to the raw value
  }

  return trimmed;
}

function normalizeChainId(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'bigint') {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }
  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }
  return undefined;
}

// ─── Schedule formatting ────────────────────────────────────────────

function toSafeInteger(value) {
  if (typeof value === 'bigint') {
    const converted = Number(value);
    return Number.isFinite(converted) ? converted : null;
  }
  if (value && typeof value === 'object' && typeof value.toString === 'function') {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatSchedulePrice(value) {
  if (!Number.isFinite(value) || value <= 0) return '';
  const digits = value >= 1 ? 2 : 5;
  return `${formatDecimal(value, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} ETH`;
}

function formatScheduleTimestamp(timestamp) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return '';
  const date = new Date(timestamp * 1000);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function normalizePriceSchedule(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null;
      const label =
        typeof entry.label === 'string' && entry.label.trim()
          ? entry.label.trim()
          : `Phase ${index + 1}`;

      const priceDisplay =
        typeof entry.priceDisplay === 'string' && entry.priceDisplay.trim()
          ? entry.priceDisplay.trim()
          : typeof entry.price === 'string' && entry.price.trim()
          ? entry.price.trim()
          : '';

      const rawPriceValue =
        entry.priceValue ?? (typeof entry.price === 'number' ? entry.price : Number.parseFloat(entry.price));
      const priceValue = Number.isFinite(rawPriceValue) && rawPriceValue > 0 ? Number(rawPriceValue) : null;

      const timestampSource =
        entry.timestamp ?? entry.effectiveAt ?? entry.opensAt ?? entry.startsAt ?? entry.time;
      const timestampParsed = Number.parseInt(timestampSource, 10);
      const timestamp =
        Number.isFinite(timestampParsed) && timestampParsed > 0 ? timestampParsed : null;

      const timeDisplay =
        typeof entry.timeDisplay === 'string' && entry.timeDisplay.trim()
          ? entry.timeDisplay.trim()
          : '';

      const note =
        typeof entry.note === 'string' && entry.note.trim() ? entry.note.trim() : '';

      return {
        id: entry.id || `phase-${index}`,
        label,
        priceDisplay,
        priceValue,
        timestamp,
        timeDisplay,
        note,
        isCurrent: entry.isCurrent === true,
      };
    })
    .filter(Boolean);
}

function decorateScheduleWithState(schedule, nextPhaseTimestamp) {
  if (!Array.isArray(schedule) || !schedule.length) {
    return { list: [], current: null, next: null, phaseIndex: null, totalPhases: 0 };
  }

  const now = Math.floor(Date.now() / 1000);
  const annotated = schedule.map((entry, index) => ({
    ...entry,
    index,
    timestamp: Number.isFinite(entry.timestamp) ? entry.timestamp : null,
  }));

  const sorted = annotated
    .slice()
    .sort((a, b) => {
      const aTs = a.timestamp ?? Number.MAX_SAFE_INTEGER;
      const bTs = b.timestamp ?? Number.MAX_SAFE_INTEGER;
      if (aTs === bTs) return a.index - b.index;
      return aTs - bTs;
    });

  let currentItem =
    sorted.find((entry) => entry.isCurrent) ||
    [...sorted]
      .reverse()
      .find((entry) => entry.timestamp !== null && entry.timestamp <= now) ||
    sorted[0];

  const candidateNextTimestamp =
    Number.isFinite(nextPhaseTimestamp) && nextPhaseTimestamp > 0 ? nextPhaseTimestamp : null;

  let nextItem = null;
  if (candidateNextTimestamp) {
    nextItem = sorted.find(
      (entry) => entry.timestamp === candidateNextTimestamp && entry.index !== currentItem.index
    );
  }
  if (!nextItem) {
    nextItem = sorted.find(
      (entry) =>
        entry.index !== currentItem.index &&
        entry.timestamp !== null &&
        entry.timestamp > now
    );
  }
  if (!nextItem) {
    nextItem = sorted.find((entry) => entry.index !== currentItem.index) || null;
  }

  const phaseIndex = sorted.findIndex((entry) => entry.index === currentItem.index);
  const totalPhases = sorted.length;

  const decorated = annotated.map((entry) => {
    let status = 'upcoming';
    if (entry.index === currentItem.index) {
      status = 'current';
    } else if (
      entry.timestamp !== null &&
      entry.timestamp <= now &&
      entry.index !== currentItem.index
    ) {
      status = 'past';
    } else if (entry.index < currentItem.index) {
      status = 'past';
    }
    const isNext = Boolean(nextItem && entry.index === nextItem.index);
    return {
      ...entry,
      status,
      isNext,
    };
  });

  const list = decorated
    .slice()
    .sort((a, b) => a.index - b.index)
    .map(({ index, ...rest }) => rest);

  const current = list[currentItem.index] || null;
  const next = nextItem ? list[nextItem.index] : null;

  return {
    list,
    current,
    next,
    phaseIndex: phaseIndex >= 0 ? phaseIndex : null,
    totalPhases,
  };
}

// ─── Error handling ─────────────────────────────────────────────────

function isUserRejected(error) {
  const code = error?.code || error?.data?.code;
  return (
    code === 4001 ||
    code === 'ACTION_REJECTED' ||
    code === 'userRejectedRequest' ||
    (typeof error?.message === 'string' && error.message.toLowerCase().includes('user rejected'))
  );
}

function extractRevertReason(error) {
  const candidates = [
    error?.data?.message,
    error?.data?.reason,
    error?.error?.message,
    error?.shortMessage,
    error?.message,
  ];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'string') continue;
    const text = candidate.trim();
    const match = text.match(/execution reverted(?: with reason string)?[: ]+"?([^"\n]+)"?/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    if (text.toLowerCase().startsWith('execution reverted')) {
      const parts = text.split(':');
      if (parts.length > 1) {
        return parts.slice(1).join(':').trim();
      }
    }
  }

  if (typeof error?.data === 'string') {
    const match = error.data.match(/execution reverted(?: with reason string)?[: ]+"?([^"\n]+)"?/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return '';
}

function resolveError(error, { fallbackMessage } = {}) {
  const defaultMessage =
    fallbackMessage || 'Something fizzled before liftoff. Check your wallet and try again.';

  if (!error) {
    return { message: defaultMessage, code: 'unknown' };
  }

  if (isUserRejected(error)) {
    return {
      message: 'Transaction cancelled — nothing left the launch pad.',
      code: 'tx_rejected',
    };
  }

  const rawMessage = (error?.message || error?.shortMessage || '').toLowerCase();
  const code = error?.code || error?.data?.code;

  if (rawMessage.includes('insufficient funds') || code === 'INSUFFICIENT_FUNDS') {
    return {
      message:
        "Insufficient ETH — your wallet's feeling a bit empty. Top up or lower the amount (we keep a little extra for gas).",
      code: 'insufficient_funds',
    };
  }

  if (rawMessage.includes('chain id') || rawMessage.includes('wrong network')) {
    return {
      message: 'Wrong network — hop over to Ethereum Mainnet to ignite this buy.',
      code: 'wrong_network',
    };
  }

  if (code === -32002) {
    return {
      message: 'You already have a wallet request open. Complete or dismiss it, then try again.',
      code: 'wallet_request_pending',
    };
  }

  if (rawMessage.includes('allowance')) {
    return {
      message: 'Allowance is missing or too small. Reset approvals and try again.',
      code: 'allowance',
    };
  }

  const revertReason = extractRevertReason(error);
  if (revertReason) {
    return {
      message: `Transaction failed: ${revertReason}`,
      code: 'tx_revert',
    };
  }

  if (code === 'CALL_EXCEPTION') {
    return {
      message: 'The contract rejected this call. Double-check your amount and try again.',
      code: 'tx_revert',
    };
  }

  if (rawMessage.includes('replacement transaction underpriced') || rawMessage.includes('fee too low')) {
    return {
      message: 'Gas fee too low. Increase the gas in your wallet and give it another go.',
      code: 'gas_too_low',
    };
  }

  return {
    message: defaultMessage,
    code: 'unknown',
  };
}

export {
  sanitizeText,
  replaceAssetTokens,
  resolveAssetLabel,
  formatFromConfig,
  sanitizeBenefitText,
  sanitizeIcon,
  sanitizeUrl,
  toBadgeText,
  sanitizeOnboardingStepEntry,
  defaultConnectorOptions,
  normalizeConnectorOptions,
  linkTarget,
  linkRel,
  shortAddress,
  normalizeWalletAddress,
  normalizeChainId,
  toSafeInteger,
  formatSchedulePrice,
  formatScheduleTimestamp,
  normalizePriceSchedule,
  decorateScheduleWithState,
  isUserRejected,
  extractRevertReason,
  resolveError,
};
