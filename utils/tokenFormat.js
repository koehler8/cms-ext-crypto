const rawToken = (import.meta.env.VITE_TOKEN || '').trim();
const tokenTicker = rawToken ? rawToken.toUpperCase() : '';
const tokenSymbol = tokenTicker ? `$${tokenTicker}` : '';

function fallbackValue(defaultValue) {
  return defaultValue || 'tokens';
}

export function getTokenTicker(defaultValue = '') {
  return tokenTicker || defaultValue;
}

export function getTokenSymbol(defaultValue = '') {
  return tokenSymbol || defaultValue;
}

export function getReadableToken(defaultValue = 'your tokens') {
  if (tokenSymbol) return tokenSymbol;
  if (tokenTicker) return tokenTicker;
  return fallbackValue(defaultValue);
}
