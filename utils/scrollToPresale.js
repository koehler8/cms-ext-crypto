export function requestScrollToPresale(options = {}) {
  if (typeof window === 'undefined') return false;

  const detail = {};
  if (typeof options.source === 'string' && options.source.trim()) {
    detail.source = options.source.trim();
  }
  if (typeof options.target === 'string' && options.target.trim()) {
    detail.target = options.target.trim();
  }
  if (typeof options.trigger === 'string' && options.trigger.trim()) {
    detail.trigger = options.trigger.trim();
  }

  const event = new CustomEvent('site:scroll-to-presale', {
    detail,
    cancelable: true,
  });
  window.dispatchEvent(event);
  return event.defaultPrevented === true;
}
