import { Cache } from "three";

Cache.enabled = true;

export const preloadModelBuffers = async (urls: string[]) => {
  if (typeof window === "undefined") return;
  const uniqueUrls = Array.from(new Set(urls));

  for (const url of uniqueUrls) {
    if (Cache.get(url)) continue;
    try {
      const response = await fetch(url, { cache: "force-cache" });
      if (!response.ok) continue;
      const buffer = await response.arrayBuffer();
      Cache.add(url, buffer);
    } catch {
      // 预加载失败时静默跳过
    }
  }
};
