/**
 * Format large numbers into readable format with K, M, B suffixes
 * 
 * @param num - The number to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string (e.g., "1.2K", "3.4M", "1.5B")
 * 
 * @example
 * formatCount(999) // "999"
 * formatCount(1000) // "1K"
 * formatCount(1234) // "1.2K"
 * formatCount(1500) // "1.5K"
 * formatCount(12345) // "12.3K"
 * formatCount(1234567) // "1.2M"
 * formatCount(1234567890) // "1.2B"
 */
export function formatCount(num: number, decimals: number = 1): string {
  if (num < 1000) {
    return num.toString();
  }
  
  const units = ['K', 'M', 'B', 'T'];
  const order = Math.floor(Math.log10(num) / 3);
  const unitIndex = order - 1;
  
  if (unitIndex >= units.length) {
    // For numbers larger than trillions, just use T
    const value = num / Math.pow(1000, units.length);
    return value.toFixed(decimals) + 'T';
  }
  
  const value = num / Math.pow(1000, order);
  const formattedValue = value.toFixed(decimals);
  
  // Remove trailing zeros and decimal point if not needed
  const cleanedValue = parseFloat(formattedValue).toString();
  
  return cleanedValue + units[unitIndex];
}

/**
 * Format count with intelligent decimal handling
 * Shows more precision for smaller numbers in thousands
 * 
 * @example
 * formatCountSmart(999) // "999"
 * formatCountSmart(1234) // "1.2K"
 * formatCountSmart(12345) // "12K" (no decimals for 10K+)
 * formatCountSmart(1234567) // "1.2M"
 */
export function formatCountSmart(num: number): string {
  if (num < 1000) {
    return num.toString();
  }
  
  if (num < 10000) {
    // Show 1 decimal for 1K-10K
    return formatCount(num, 1);
  }
  
  if (num < 1000000) {
    // No decimals for 10K-1M
    return formatCount(num, 0);
  }
  
  // 1 decimal for millions and above
  return formatCount(num, 1);
}