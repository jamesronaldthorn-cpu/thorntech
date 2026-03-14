import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function proxyImageUrl(url: string): string {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === window.location.hostname) return url;
    return `/api/img-proxy?url=${encodeURIComponent(url)}`;
  } catch {
    return url;
  }
}
