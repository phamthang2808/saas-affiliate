/**
 * Utility functions for browser and device environment detection
 * specifically for handling in-app browsers like Zalo, Facebook, etc.
 */

export function isZaloBrowser() {
  if (typeof window === "undefined" || !window.navigator) return false;
  const ua = (window.navigator.userAgent || window.navigator.vendor || "").toLowerCase();
  return (
    ua.includes("zalo") ||
    ua.includes("zalotheme") ||
    ua.includes("zaloapp") ||
    ua.includes("zaloweb") ||
    ua.includes(";zalo")
  );
}

export function isAndroidDevice() {
  if (typeof window === "undefined" || !window.navigator) return false;
  const ua = (window.navigator.userAgent || window.navigator.vendor || "").toLowerCase();
  return ua.includes("android");
}

export function isIOSDevice() {
  if (typeof window === "undefined" || !window.navigator) return false;
  const ua = (window.navigator.userAgent || window.navigator.vendor || "").toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

/**
 * Returns current URL with `auth=1` query parameter so that upon opening
 * in external browser, the login modal will automatically pop up.
 */
export function getExternalAuthUrl(customUrl) {
  if (typeof window === "undefined") return "";
  try {
    const u = new URL(customUrl || window.location.href);
    u.searchParams.set("auth", "1");
    return u.toString();
  } catch {
    const base = customUrl || window.location.href;
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}auth=1`;
  }
}

/**
 * Jump to external browser.
 * - Android: Chrome Intent (guaranteed breakout from Zalo WebView into real Chrome app)
 * - iOS: Attempts Google Chrome scheme if installed; otherwise user uses Zalo's native '...' menu
 */
export function openExternalBrowser(auth = true) {
  if (typeof window === "undefined") return false;
  const targetUrl = auth ? getExternalAuthUrl() : window.location.href;
  const cleanTargetUrl = targetUrl.replace(/^https?:\/\//, "");

  if (isAndroidDevice()) {
    const chromeIntent = `intent://${cleanTargetUrl}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(targetUrl)};end`;
    window.location.href = chromeIntent;
    return true;
  }

  if (isIOSDevice()) {
    // Attempt Chrome iOS scheme if installed
    try {
      window.location.href = `googlechromes://${cleanTargetUrl}`;
      return true;
    } catch {
      return false;
    }
  }

  try {
    window.open(targetUrl, "_blank");
    return true;
  } catch {
    return false;
  }
}
