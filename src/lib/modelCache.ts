// Cache is disabled globally to prevent blob URL issues
// Preloading is no longer used

export const preloadModelBuffers = async (urls: string[]) => {
  // No-op: Cache is disabled globally to prevent stale blob URL issues
  // Browser HTTP cache will handle this naturally
  console.log(`[modelCache] Skipping preload of ${urls.length} models (Cache disabled)`);
};
