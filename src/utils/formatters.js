/** Formatting utilities */

export function formatPct(value) {
  return `${Math.round(value)}%`;
}

export function formatCount(inspected, total) {
  return `${inspected}/${total}`;
}

export function truncate(str, maxLen = 40) {
  if (!str || str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}
