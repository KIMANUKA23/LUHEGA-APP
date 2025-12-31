// Currency formatting utility for Tanzanian Shillings (TZS)
export function formatTZS(amount: number): string {
  // Format number with thousand separators
  const formatted = amount.toLocaleString("en-TZ", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `TZS ${formatted}`;
}

// Format TZS for display in charts (shortened version)
export function formatTZSShort(amount: number): string {
  if (amount >= 1000000) {
    return `TZS ${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `TZS ${(amount / 1000).toFixed(0)}k`;
  }
  return formatTZS(amount);
}

