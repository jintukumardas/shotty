/**
 * Format large numbers with K, M, B suffixes for better readability
 * @param value - The number to format
 * @param decimals - Number of decimal places to show (default: 2)
 * @returns Formatted string (e.g., "1.5K", "2.3M", "1.2B")
 */
export function formatLargeNumber(value: number | string, decimals: number = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return '0';

  // Handle negative numbers
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  let formatted: string;

  if (absNum >= 1_000_000_000) {
    // Billions
    formatted = (absNum / 1_000_000_000).toFixed(decimals) + 'B';
  } else if (absNum >= 1_000_000) {
    // Millions
    formatted = (absNum / 1_000_000).toFixed(decimals) + 'M';
  } else if (absNum >= 1_000) {
    // Thousands
    formatted = (absNum / 1_000).toFixed(decimals) + 'K';
  } else if (absNum >= 1) {
    // Regular numbers >= 1
    formatted = absNum.toFixed(decimals);
  } else if (absNum >= 0.01) {
    // Small numbers
    formatted = absNum.toFixed(4);
  } else if (absNum > 0) {
    // Very small numbers
    formatted = absNum.toFixed(6);
  } else {
    formatted = '0';
  }

  return isNegative ? '-' + formatted : formatted;
}

/**
 * Format balance with appropriate precision
 * Shows full precision for small amounts, abbreviated for large amounts
 * @param balance - The balance to format
 * @returns Formatted balance string
 */
export function formatBalance(balance: number | string): string {
  const num = typeof balance === 'string' ? parseFloat(balance) : balance;

  if (isNaN(num)) return '0';

  const absNum = Math.abs(num);

  // For large amounts, use K/M/B notation
  if (absNum >= 1_000) {
    return formatLargeNumber(num, 2);
  }

  // For medium amounts (1-1000), show 2 decimals
  if (absNum >= 1) {
    return num.toFixed(2);
  }

  // For small amounts (0.01-1), show 4 decimals
  if (absNum >= 0.01) {
    return num.toFixed(4);
  }

  // For very small amounts, show 6 decimals
  if (absNum > 0) {
    return num.toFixed(6);
  }

  return '0';
}
