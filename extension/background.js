// ==============================
// Extension Started
// ==============================
console.log("🚀 [PhishGuard] Extension loaded and running!");

// ==============================
// Safe Chrome API Wrapper
// Handles both callback and promise APIs correctly
// ==============================
async function safeChromeAction(fn, args, context = "") {
  try {
    if (!fn) {
      console.warn(`[PhishGuard] ${context} failed: API not available`);
      return;
    }

    const result = fn(args);
    if (result && typeof result.then === "function") {
      return await result.catch((err) => {
        console.warn(`[PhishGuard] ${context} promise failed:`, err.message);
      });
    }

    fn(args, () => {
      if (chrome.runtime.lastError) {
        console.warn(
          `[PhishGuard] ${context} callback failed: ${chrome.runtime.lastError.message}`
        );
      }
    });
  } catch (err) {
    console.error(`[PhishGuard] ${context} threw error:`, err.message);
  }
}

// ==============================
// Icons
// ==============================
const ICONS = {
  16: "icons/icon16.png",
  32: "icons/icon32.png",
  48: "icons/icon48.png",
  128: "icons/icon128.png",
};

// ==============================
// Safe Domains
// ==============================
const SAFE_DOMAINS = ["google.com", "chatgpt.com", "openai.com", "github.com"];

function isSafeDomain(url) {
  try {
    const { hostname } = new URL(url);
    return SAFE_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith("." + domain)
    );
  } catch {
    return false;
  }
}

// ==============================
// UI Helpers
// ==============================
function setPhishingBadge(tabId) {
  if (!tabId || isNaN(tabId)) return;
  safeChromeAction(chrome.action.setIcon, { tabId, path: ICONS }, "setIcon");
  safeChromeAction(
    chrome.action.setBadgeText,
    { tabId, text: "!" },
    "setBadgeText"
  );
  safeChromeAction(
    chrome.action.setBadgeBackgroundColor,
    { tabId, color: "#FF0000" },
    "setBadgeBackgroundColor"
  );
}

function clearBadge(tabId) {
  if (!tabId || isNaN(tabId)) return;
  safeChromeAction(
    chrome.action.setIcon,
    { tabId, path: ICONS },
    "clearBadge setIcon"
  );
  safeChromeAction(
    chrome.action.setBadgeText,
    { tabId, text: "" },
    "clearBadge setBadgeText"
  );
  safeChromeAction(
    chrome.action.setBadgeBackgroundColor,
    { tabId, color: "#00000000" },
    "clearBadge setBadgeBackgroundColor"
  );
}

// ==============================
// Normalization
// ==============================
function clampPct(n) {
  n = Number(n);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function normalizeProbability(p) {
  if (typeof p === "string" && p.endsWith("%")) return clampPct(parseFloat(p));
  if (!Number.isFinite(+p)) return 0;
  const n = +p;
  if (n <= 1 && n >= 0) return clampPct(n * 100);
  return clampPct(n);
}

function computeRiskScore(probability, features = {}) {
  let score = probability;
  if (features.hasSuspiciousJS) score += 10;
  if (features.numRedirects && features.numRedirects > 2) score += 15;
  if (features.shortenedURL) score += 5;
  return clampPct(score);
}

// ==============================
// Save phishing detection
// ==============================
function logPhishingDetection(url, reason, probability, features = {}) {
  try {
    const normProb = normalizeProbability(probability);
    const riskScore = computeRiskScore(normProb, features);

    chrome.storage.local.get({ phishingHistory: [] }, (data) => {
      const history = Array.isArray(data.phishingHistory)
        ? data.phishingHistory
        : [];
      history.push({
        url,
        reason,
        probability: normProb,
        riskScore,
        prediction: "phishing",
        features: features || {},
        time: new Date().toISOString(),
      });

      if (history.length > 50) history.shift();

      chrome.storage.local.set({
        phishingHistory: history,
        lastDetection: {
          url,
          reason,
          probability: normProb,
          riskScore,
          features: features || {},
        },
      });
    });
  } catch (err) {
    console.error("[PhishGuard] logPhishingDetection error:", err.message);
  }
}

// ==============================
// Instant Local Pre-Check (runs before API, zero network delay)
// Mirrors the same signals as backend/app_simple.py
// ==============================
const SUSPICIOUS_TLDS = [".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".click", ".loan", ".work", ".date", ".racing", ".win", ".download", ".stream", ".gdn", ".accountant", ".science", ".faith", ".review", ".trade", ".party", ".men", ".bid", ".webcam", ".country", ".kim", ".cricket", ".space", ".ninja", ".link", ".site", ".online", ".tech", ".store", ".fun", ".icu", ".live", ".club", ".vip", ".monster", ".fake"];
const PHISHING_KEYWORDS = ["verify", "secure", "account", "update", "login", "signin", "banking", "confirm", "password", "credential", "wallet", "alert", "suspended", "unusual", "activity", "validate", "authenticate", "recover", "unlock", "limited"];
const BRAND_NAMES = ["paypal", "apple", "google", "microsoft", "amazon", "facebook", "instagram", "twitter", "netflix", "bank", "chase", "wellsfargo", "citibank", "ebay", "dropbox", "linkedin", "whatsapp", "telegram"];

function quickLocalCheck(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const hostname = parsed.hostname.toLowerCase();
    const fullUrl = rawUrl.toLowerCase();
    const parts = hostname.split(".");
    const tld = "." + parts.slice(-1)[0];
    const domain = parts.slice(-2).join(".");
    const subdomains = parts.slice(0, -2);

    // 1. IP address URL
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
      return { isPhishing: true, reason: "IP address used as URL", probability: 95 };
    }
    // 2. Suspicious TLD
    if (SUSPICIOUS_TLDS.includes(tld)) {
      return { isPhishing: true, reason: "Suspicious top-level domain: " + tld, probability: 90 };
    }
    // 3. Brand name in subdomain (e.g. paypal.evil.com)
    if (subdomains.some(s => BRAND_NAMES.some(b => s.includes(b)))) {
      return { isPhishing: true, reason: "Brand name used in subdomain", probability: 92 };
    }
    // 4. Fake domain embed (e.g. paypal.com.evil.com)
    if (subdomains.join(".").includes(".com") || subdomains.join(".").includes(".net")) {
      return { isPhishing: true, reason: "Fake domain embedded in subdomain", probability: 93 };
    }
    // 5. @ symbol in URL
    if (fullUrl.includes("@")) {
      return { isPhishing: true, reason: "@ symbol in URL", probability: 88 };
    }
    // 6. No HTTPS
    if (parsed.protocol !== "https:") {
      // Only flag if also has other signals — don't block all HTTP
    }
    // 7. Phishing keywords in domain
    const domainPart = hostname.replace(/\./g, "");
    if (PHISHING_KEYWORDS.some(k => domainPart.includes(k))) {
      return { isPhishing: true, reason: "Phishing keyword in domain", probability: 85 };
    }
    // 8. Excessive hyphens
    if ((hostname.match(/-/g) || []).length >= 4) {
      return { isPhishing: true, reason: "Excessive hyphens in domain", probability: 80 };
    }
    // 9. Very long URL
    if (rawUrl.length > 150) {
      return { isPhishing: true, reason: "Unusually long URL", probability: 75 };
    }
    // 10. Encoded characters
    if ((fullUrl.match(/%[0-9a-f]{2}/g) || []).length > 3) {
      return { isPhishing: true, reason: "Excessive URL encoding", probability: 82 };
    }
  } catch {
    return { isPhishing: false };
  }
  return { isPhishing: false };
}

// ==============================
// URL Checking Logic
// ==============================
console.log("🔧 [PhishGuard] Setting up tab listener...");

// Track tabs already redirected to avoid double-redirect loops
const redirectedTabs = new Set();

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Intercept at "loading" to redirect before page content is shown
  if (changeInfo.status !== "loading" || !tab?.url) return;
  if (!/^https?:/i.test(tab.url)) return;

  const warningUrlPrefix = chrome.runtime.getURL("warning.html");
  const simpleWarningUrlPrefix = chrome.runtime.getURL("simple_warning.html");
  const detailsUrlPrefix = chrome.runtime.getURL("details.html");
  const dashboardUrlPrefix = chrome.runtime.getURL("dashboard.html");

  if (
    tab.url.startsWith(warningUrlPrefix) ||
    tab.url.startsWith(simpleWarningUrlPrefix) ||
    tab.url.startsWith(detailsUrlPrefix) ||
    tab.url.startsWith(dashboardUrlPrefix)
  ) {
    redirectedTabs.delete(tabId); // clean up when warning page loads
    return;
  }

  // Avoid re-checking a tab we already redirected
  if (redirectedTabs.has(tabId)) {
    redirectedTabs.delete(tabId);
    return;
  }

  if (isSafeDomain(tab.url)) {
    clearBadge(tabId);
    return;
  }

  // ── STEP 1: Instant local check — redirect immediately if obviously phishing ──
  const localResult = quickLocalCheck(tab.url);
  if (localResult.isPhishing) {
    console.log("[PhishGuard] ⚡ LOCAL CHECK: Phishing detected instantly:", tab.url);
    const detectionData = {
      url: tab.url,
      reason: localResult.reason,
      probability: localResult.probability,
      features: {},
    };
    redirectedTabs.add(tabId);
    chrome.storage.local.set({ lastDetection: detectionData }, () => {
      chrome.tabs.update(tabId, { url: simpleWarningUrlPrefix });
    });
    setPhishingBadge(tabId);

    // Still call API in background to get full features (for details page)
    fetchWithFallback(
      ["https://phishing-extension-tib4.onrender.com/predict", "http://127.0.0.1:5000/predict"],
      { url: tab.url }
    ).then((data) => {
      if (data?.prediction?.toLowerCase() === "phishing") {
        logPhishingDetection(tab.url, data.reason || localResult.reason, data.probability || localResult.probability, data.features || {});
        // Update storage with richer data from API
        chrome.storage.local.set({
          lastDetection: {
            url: tab.url,
            reason: data.reason || localResult.reason,
            probability: data.probability || localResult.probability,
            features: data.features || {},
          }
        });
      }
    }).catch(() => {
      // API offline — log with local data
      logPhishingDetection(tab.url, localResult.reason, localResult.probability, {});
    });
    return;
  }

  // ── STEP 2: Not obviously phishing — ask API ──
  console.log("[PhishGuard] 🔍 Sending to API:", tab.url);

  fetchWithFallback(
    ["https://phishing-extension-tib4.onrender.com/predict", "http://127.0.0.1:5000/predict", "http://localhost:5000/predict"],
    { url: tab.url }
  ).then((data) => {
    const prediction = (data?.prediction || "").toLowerCase();

    if (prediction === "phishing") {
      const reason = data.reason || "Suspicious patterns detected";
      const probability = data.probability || 0;
      const features = data.features && typeof data.features === "object" ? data.features : {};

      console.log("[PhishGuard] ⚠️ API: PHISHING DETECTED:", tab.url);
      redirectedTabs.add(tabId);
      const detectionData = { url: tab.url, reason, probability, features };
      chrome.storage.local.set({ lastDetection: detectionData }, () => {
        chrome.tabs.update(tabId, { url: simpleWarningUrlPrefix });
      });
      logPhishingDetection(tab.url, reason, probability, features);
      setPhishingBadge(tabId);
    } else {
      console.log("[PhishGuard] ✅ API: LEGITIMATE - Allowing access");
      clearBadge(tabId);
    }
  }).catch((err) => {
    console.error("[PhishGuard] Backend error:", err.message);
    clearBadge(tabId);
  });
});

async function fetchWithFallback(urls, body) {
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) return res.json();
    } catch (_) { /* try next */ }
  }
  throw new Error("All API endpoints unreachable");
}

// ==============================
// Messages from pages
// ==============================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message) return;

  if (message.action === "closeTab" && sender.tab?.id) {
    chrome.tabs.remove(sender.tab.id);
  }

  if (message.action === "openDetails") {
    safeChromeAction(
      chrome.tabs.create,
      { url: chrome.runtime.getURL("details.html") },
      "openDetails"
    );
  }

  if (message.action === "openDashboard") {
    const dashboardUrl = chrome.runtime.getURL("dashboard.html");
    chrome.tabs.query({}, (tabs) => {
      const existingTab = tabs.find(
        (t) => t.url && t.url.startsWith(dashboardUrl)
      );
      if (existingTab) {
        chrome.tabs.update(existingTab.id, { active: true });
        chrome.windows.update(existingTab.windowId, { focused: true });
      } else {
        safeChromeAction(
          chrome.tabs.create,
          { url: dashboardUrl },
          "openDashboard"
        );
      }
    });
  }

  // ==============================
  // 🚨 Report Site Handler
  // ==============================
  if (message.action === "reportSite" && message.url) {
    (async () => {
      try {
        console.log("[PhishGuard] 🚨 Report requested for:", message.url);

        // Save report locally
        chrome.storage.local.get({ reportedSites: [] }, (data) => {
          const reports = Array.isArray(data.reportedSites)
            ? data.reportedSites
            : [];
          reports.push({
            url: message.url,
            time: new Date().toISOString(),
          });
          chrome.storage.local.set({ reportedSites: reports }, () => {
            console.log("[PhishGuard] ✅ Report stored locally:", message.url);
          });
        });

        // Send to backend
        const res = await fetch("https://phishing-extension-tib4.onrender.com/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: message.url }),
        }).catch(() =>
          fetch("http://127.0.0.1:5000/report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: message.url }),
          })
        );

        if (!res.ok) throw new Error("Backend /report failed " + res.status);

        const data = await res.json();
        console.log("[PhishGuard] ✅ Report saved on backend:", data);

        if (sendResponse) sendResponse({ success: true, data });
      } catch (err) {
        console.error("[PhishGuard] ❌ Report error:", err.message);
        if (sendResponse) sendResponse({ success: false, error: err.message });
      }
    })();

    return true; // keep channel open
  }
});
