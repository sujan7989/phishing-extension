// ==============================
// Extension Started
// ==============================
console.log("🚀 [PhishGuard] Extension loaded and running!");

// ==============================
// Keep Render backend warm — ping every 14 minutes
// Prevents cold start delays on free tier
// ==============================
const RENDER_URL = "https://phishing-extension-tib4.onrender.com";

function pingBackend() {
  fetch(RENDER_URL + "/", { method: "GET", signal: AbortSignal.timeout(10000) })
    .then(() => {
      console.log("[PhishGuard] 🏓 Keep-alive ping sent");
      chrome.storage.local.set({ backendOnline: true });
    })
    .catch(() => {
      console.warn("[PhishGuard] ⚠️ Backend offline (keep-alive failed)");
      chrome.storage.local.set({ backendOnline: false });
    });
}

// Ping immediately on load, then every 14 minutes
pingBackend();
setInterval(pingBackend, 14 * 60 * 1000);

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
// Safe Domains (built-in whitelist)
// ==============================
const SAFE_DOMAINS = [
  "google.com", "youtube.com", "facebook.com", "twitter.com", "x.com",
  "instagram.com", "linkedin.com", "github.com", "microsoft.com",
  "apple.com", "amazon.com", "wikipedia.org", "reddit.com", "netflix.com",
  "stackoverflow.com", "openai.com", "chatgpt.com", "bing.com",
  "yahoo.com", "whatsapp.com", "telegram.org", "zoom.us", "dropbox.com",
  "paypal.com", "ebay.com", "walmart.com", "adobe.com", "salesforce.com",
  "wordpress.com", "shopify.com", "stripe.com", "twitch.tv", "discord.com",
  "spotify.com", "pinterest.com", "tumblr.com", "quora.com", "medium.com",
  "nytimes.com", "bbc.com", "cnn.com", "reuters.com", "theguardian.com",
  "office.com", "live.com", "outlook.com", "hotmail.com", "gmail.com",
  "cloudflare.com", "ilovepdf.com", "smallpdf.com", "canva.com", "figma.com",
  "notion.so", "trello.com", "slack.com", "vercel.com", "netlify.com",
  "npmjs.com", "pypi.org", "docker.com", "render.com", "supabase.com",
  "w3schools.com", "developer.mozilla.org", "reactjs.org", "nodejs.org",
  "flipkart.com", "paytm.com", "phonepe.com", "razorpay.com",
  "ndtv.com", "timesofindia.com", "thehindu.com", "techcrunch.com",
  "theverge.com", "icloud.com", "protonmail.com", "proton.me",
];

function isSafeDomain(url) {
  try {
    const { hostname } = new URL(url);
    // Check built-in whitelist
    if (SAFE_DOMAINS.some(d => hostname === d || hostname.endsWith("." + d))) return true;
    return false;
  } catch {
    return false;
  }
}

// Check user's trusted domains from storage (async)
async function isUserTrusted(url) {
  return new Promise((resolve) => {
    try {
      const hostname = new URL(url).hostname;
      chrome.storage.local.get({ trustedDomains: [] }, (res) => {
        resolve((res.trustedDomains || []).includes(hostname));
      });
    } catch { resolve(false); }
  });
}

// ==============================
// UI Helpers
// ==============================
function setPhishingBadge(tabId) {
  if (!tabId || isNaN(tabId)) return;
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab) return;
    safeChromeAction(chrome.action.setIcon, { tabId, path: ICONS }, "setIcon");
    safeChromeAction(chrome.action.setBadgeText, { tabId, text: "!" }, "setBadgeText");
    safeChromeAction(chrome.action.setBadgeBackgroundColor, { tabId, color: "#FF0000" }, "setBadgeBackgroundColor");
  });
}

function clearBadge(tabId) {
  if (!tabId || isNaN(tabId)) return;
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab) return;
    safeChromeAction(chrome.action.setIcon, { tabId, path: ICONS }, "clearBadge setIcon");
    safeChromeAction(chrome.action.setBadgeText, { tabId, text: "" }, "clearBadge setBadgeText");
    safeChromeAction(chrome.action.setBadgeBackgroundColor, { tabId, color: "#00000000" }, "clearBadge setBadgeBackgroundColor");
  });
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
// OS Notification on phishing block
// ==============================
function showPhishingNotification(url) {
  try {
    let displayUrl = url;
    try { displayUrl = new URL(url).hostname; } catch (_) {}
    chrome.notifications.create("phishguard_block_" + Date.now(), {
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "🛡️ PhishGuard Blocked a Threat",
      message: "Phishing site blocked: " + displayUrl,
      priority: 2,
    });
  } catch (err) {
    console.warn("[PhishGuard] Notification error:", err.message);
  }
}
// Mirrors the same signals as backend/app_simple.py
// ==============================
const SUSPICIOUS_TLDS = [".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".click", ".loan", ".work", ".date", ".racing", ".win", ".download", ".stream", ".gdn", ".accountant", ".science", ".faith", ".review", ".trade", ".party", ".men", ".bid", ".webcam", ".country", ".kim", ".cricket", ".space", ".ninja", ".link", ".site", ".online", ".tech", ".store", ".fun", ".icu", ".live", ".club", ".vip", ".monster", ".fake"];

// Only keywords that would NEVER appear in a legitimate domain name
const PHISHING_KEYWORDS = ["verify", "verification", "validate", "signin", "sign-in", "credential", "suspended", "unlock", "webscr", "dispatch"];

const BRAND_NAMES = ["paypal", "apple", "google", "microsoft", "amazon", "facebook", "instagram", "twitter", "netflix", "chase", "wellsfargo", "citibank", "ebay", "dropbox", "linkedin", "whatsapp", "telegram"];

function quickLocalCheck(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const hostname = parsed.hostname.toLowerCase();
    const fullUrl = rawUrl.toLowerCase();
    const parts = hostname.split(".");
    const tld = "." + parts.slice(-1)[0];
    const rootDomain = parts.slice(-2)[0];
    const subdomains = parts.slice(0, -2);
    const hyphenCount = (hostname.match(/-/g) || []).length;
    const encodedCount = (fullUrl.match(/%[0-9a-f]{2}/g) || []).length;
    const isHttps = parsed.protocol === "https:";
    const isBrandDomain = BRAND_NAMES.some(b => rootDomain === b || rootDomain.startsWith(b));

    // Build features for every URL regardless of verdict
    const buildFeatures = (reason, probability) => ({
      "URL Length":          rawUrl.length,
      "Uses HTTPS":          isHttps ? "Yes" : "No",
      "IP Address as Host":  /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) ? "Yes" : "No",
      "Has @ Symbol":        fullUrl.includes("@") ? "Yes" : "No",
      "Suspicious TLD":      SUSPICIOUS_TLDS.includes(tld) ? tld : "No",
      "Brand Spoofing":      subdomains.some(s => BRAND_NAMES.some(b => s.includes(b))) && !isBrandDomain ? "Yes" : "None",
      "Fake Domain Embed":   (subdomains.join(".").includes(".com") || subdomains.join(".").includes(".net")) ? "Yes" : "None",
      "Hyphens in Domain":   String(hyphenCount),
      "Subdomain Depth":     String(subdomains.filter(Boolean).length),
      "Encoded Chars (%xx)": String(encodedCount),
      "Phishing Keywords":   (!isBrandDomain && PHISHING_KEYWORDS.some(k => hostname.replace(/\./g,"").includes(k))) ? "Yes" : "None",
      "Risk Score":          probability + "/100",
      "Verdict":             "PHISHING",
    });

    // 1. IP address URL
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
      const p = 95;
      return { isPhishing: true, reason: "IP address used as URL", probability: p, features: buildFeatures("IP address used as URL", p) };
    }
    // 2. Suspicious TLD
    if (SUSPICIOUS_TLDS.includes(tld)) {
      const p = 90;
      return { isPhishing: true, reason: "Suspicious top-level domain: " + tld, probability: p, features: buildFeatures("Suspicious TLD: " + tld, p) };
    }
    // 3. Brand name in subdomain only (e.g. paypal.evil.com) — NOT in root domain
    if (subdomains.some(s => BRAND_NAMES.some(b => s.includes(b))) && !isBrandDomain) {
      const p = 92;
      return { isPhishing: true, reason: "Brand name used in subdomain", probability: p, features: buildFeatures("Brand name in subdomain", p) };
    }
    // 4. Fake domain embed (e.g. paypal.com.evil.com)
    if (subdomains.join(".").includes(".com") || subdomains.join(".").includes(".net")) {
      const p = 93;
      return { isPhishing: true, reason: "Fake domain embedded in subdomain", probability: p, features: buildFeatures("Fake domain embed", p) };
    }
    // 5. @ symbol in URL
    if (fullUrl.includes("@")) {
      const p = 88;
      return { isPhishing: true, reason: "@ symbol in URL", probability: p, features: buildFeatures("@ symbol in URL", p) };
    }
    // 6. Phishing keywords in domain
    if (!isBrandDomain && PHISHING_KEYWORDS.some(k => hostname.replace(/\./g,"").includes(k))) {
      const p = 85;
      return { isPhishing: true, reason: "Phishing keyword in domain", probability: p, features: buildFeatures("Phishing keyword in domain", p) };
    }
    // 7. Excessive hyphens (4+)
    if (hyphenCount >= 4) {
      const p = 80;
      return { isPhishing: true, reason: "Excessive hyphens in domain", probability: p, features: buildFeatures("Excessive hyphens", p) };
    }
    // 8. Very long URL (raised threshold)
    if (rawUrl.length > 250) {
      const p = 75;
      return { isPhishing: true, reason: "Unusually long URL", probability: p, features: buildFeatures("Unusually long URL", p) };
    }
    // 9. Encoded characters (raised threshold)
    if (encodedCount > 8) {
      const p = 82;
      return { isPhishing: true, reason: "Excessive URL encoding", probability: p, features: buildFeatures("Excessive URL encoding", p) };
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

  // Check user's personal trusted list — also skip local check for trusted domains
  isUserTrusted(tab.url).then((trusted) => {
    if (trusted) {
      console.log("[PhishGuard] ✅ User-trusted domain — skipping:", tab.url);
      clearBadge(tabId);
      return;
    }
    runDetection(tabId, tab.url, simpleWarningUrlPrefix);
  });
});

function runDetection(tabId, tabUrl, simpleWarningUrlPrefix) {
  // ── STEP 1: Instant local check ──
  // Re-check trusted domains synchronously before local signals fire
  chrome.storage.local.get({ trustedDomains: [] }, (res) => {
    try {
      const hostname = new URL(tabUrl).hostname;
      if ((res.trustedDomains || []).includes(hostname)) {
        clearBadge(tabId);
        return;
      }
    } catch (_) {}
    _runDetectionCore(tabId, tabUrl, simpleWarningUrlPrefix);
  });
}

function _runDetectionCore(tabId, tabUrl, simpleWarningUrlPrefix) {
  // ── STEP 1: Instant local check ──
  const localResult = quickLocalCheck(tabUrl);
  if (localResult.isPhishing) {
    console.log("[PhishGuard] ⚡ LOCAL CHECK: Phishing detected instantly:", tabUrl);
    const localFeatures = localResult.features || {};
    const detectionData = { url: tabUrl, reason: localResult.reason, probability: localResult.probability, features: localFeatures };
    redirectedTabs.add(tabId);
    chrome.storage.local.set({ lastDetection: detectionData }, () => {
      chrome.tabs.update(tabId, { url: simpleWarningUrlPrefix });
    });
    setPhishingBadge(tabId);
    showPhishingNotification(tabUrl);

    // Try API in background to enrich features — update storage if API responds
    fetchWithFallback(
      [RENDER_URL + "/predict", "http://127.0.0.1:5000/predict"],
      { url: tabUrl }
    ).then((data) => {
      const apiFeatures = (data?.features && typeof data.features === "object" && Object.keys(data.features).length > 0)
        ? data.features : localFeatures;
      const enriched = {
        url: tabUrl,
        reason: data?.reason || localResult.reason,
        probability: data?.probability || localResult.probability,
        features: apiFeatures,
      };
      logPhishingDetection(tabUrl, enriched.reason, enriched.probability, enriched.features);
      chrome.storage.local.set({ lastDetection: enriched });
    }).catch(() => {
      logPhishingDetection(tabUrl, localResult.reason, localResult.probability, localFeatures);
    });
    return;
  }

  // ── STEP 2: Ask API ──
  console.log("[PhishGuard] 🔍 Sending to API:", tabUrl);
  fetchWithFallback(
    [RENDER_URL + "/predict", "http://127.0.0.1:5000/predict", "http://localhost:5000/predict"],
    { url: tabUrl }
  ).then((data) => {
    const prediction = (data?.prediction || "").toLowerCase();
    if (prediction === "phishing") {
      const reason      = data.reason || "Suspicious patterns detected";
      const probability = data.probability || 0;
      const features    = data.features && typeof data.features === "object" ? data.features : {};
      console.log("[PhishGuard] ⚠️ API: PHISHING DETECTED:", tabUrl);
      redirectedTabs.add(tabId);
      chrome.storage.local.set({ lastDetection: { url: tabUrl, reason, probability, features } }, () => {
        chrome.tabs.update(tabId, { url: simpleWarningUrlPrefix });
      });
      logPhishingDetection(tabUrl, reason, probability, features);
      setPhishingBadge(tabId);
      showPhishingNotification(tabUrl);
    } else {
      console.log("[PhishGuard] ✅ API: LEGITIMATE");
      // Track total scans including legitimate
      chrome.storage.local.get({ totalScanned: 0 }, (r) => {
        chrome.storage.local.set({ totalScanned: r.totalScanned + 1 });
      });
      clearBadge(tabId);
    }
  }).catch((err) => {
    console.error("[PhishGuard] Backend error:", err.message);
    clearBadge(tabId);
  });
}

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
    const detailsUrl = chrome.runtime.getURL("details.html");
    if (sender.tab?.id) {
      chrome.tabs.update(sender.tab.id, { url: detailsUrl });
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) chrome.tabs.update(tabs[0].id, { url: detailsUrl });
      });
    }
  }

  if (message.action === "openDashboard") {
    const dashboardUrl = chrome.runtime.getURL("dashboard.html");
    // Navigate in the sender's tab (same tab), not a new tab
    if (sender.tab?.id) {
      chrome.tabs.update(sender.tab.id, { url: dashboardUrl });
    } else {
      // Fallback: from popup, find active tab and navigate it
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.update(tabs[0].id, { url: dashboardUrl });
        }
      });
    }
  }

  // ==============================
  // 📄 Content Script Signals
  // ==============================
  if (message.action === "contentSignals" && message.url) {
    const { url, signals, riskScore } = message;
    chrome.storage.local.get(["lastDetection"], (res) => {
      const d = res?.lastDetection || {};
      // Only merge if this is for the same URL that was last detected
      if (!d.url || !url.startsWith(d.url.split("?")[0])) return;

      const updatedFeatures = Object.assign({}, d.features || {});
      if (signals.hasPasswordField)    updatedFeatures["Password Field"]       = "Yes";
      if (signals.formActionMismatch)  updatedFeatures["Form Action Mismatch"] = signals.formActionMismatch;
      if (signals.hiddenIframes)       updatedFeatures["Hidden Iframes"]       = String(signals.hiddenIframes);
      if (signals.suspiciousScripts)   updatedFeatures["Suspicious Scripts"]   = String(signals.suspiciousScripts);
      if (signals.titleSpoofing)       updatedFeatures["Title Spoofing"]       = signals.titleSpoofing;

      // Boost risk score if content signals found on a flagged page
      const newProb = Math.min((d.probability || 0) + riskScore, 100);

      chrome.storage.local.set({
        lastDetection: {
          ...d,
          features:    updatedFeatures,
          probability: newProb,
          contentRisk: riskScore,
        }
      });
      console.log("[PhishGuard] 📄 Content signals merged:", signals);
    });
    return;
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
