// utils/storage.ts or lib/storage.ts

/**
 * Clears localStorage and sessionStorage while preserving theme
 */
export const clearStorage = () => {
  // Keys to preserve
  const preserveKeys = ['theme'];
  
  // Save values
  const preserved: Record<string, string> = {};
  preserveKeys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) preserved[key] = value;
  });
  
  // Clear everything
  sessionStorage.clear();
  localStorage.clear();
  
  // Restore preserved values
  Object.entries(preserved).forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });
};