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
// URL Checking Logic
// ==============================
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab?.url) return;
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
  )
    return;

  if (isSafeDomain(tab.url)) {
    console.log("[PhishGuard] ✅ Whitelisted domain - Skipping check:", tab.url);
    clearBadge(tabId);
    return;
  }

  console.log("[PhishGuard] 🔍 Checking URL:", tab.url);

  fetch("https://phishing-extension-6qs8.onrender.com/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: tab.url }),
  })
    .then((response) => {
      if (!response.ok) throw new Error("Backend returned " + response.status);
      return response.json();
    })
    .then((data) => {
      const prediction = (data?.prediction || "").toLowerCase();
      const probability = data.probability || 0;

      console.log("[PhishGuard] Prediction result:", {
        url: tab.url,
        prediction: prediction,
        probability: probability + "%",
        isPhishing: prediction === "phishing"
      });

      if (prediction === "phishing") {
        // PHISHING DETECTED - Show warning page
        const reason = data.reason || "Suspicious patterns detected";
        const features =
          data.features && typeof data.features === "object" ? data.features : {};

        console.log("[PhishGuard] ⚠️ PHISHING DETECTED - Blocking site");

        // Store detection data
        chrome.storage.local.set(
          { lastDetection: { url: tab.url, reason, probability, features } },
          () => {
            console.log("[PhishGuard] Detection data saved, redirecting to warning page");
            // Redirect to warning page
            chrome.tabs.update(tabId, { url: simpleWarningUrlPrefix });
          }
        );

        // Log to history
        logPhishingDetection(tab.url, reason, probability, features);

        setPhishingBadge(tabId);
      } else if (prediction === "legitimate") {
        // LEGITIMATE - Allow access
        console.log("[PhishGuard] ✅ LEGITIMATE - Allowing access");
        clearBadge(tabId);
      } else {
        // Unknown prediction - Allow access but log warning
        console.warn("[PhishGuard] ⚠️ Unknown prediction:", prediction, "- Allowing access");
        clearBadge(tabId);
      }
    })
    .catch((err) => {
      console.error("[PhishGuard] Backend error:", err.message);
      // Don't block sites when backend is offline - just clear badge
      clearBadge(tabId);
    });
});

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
        const res = await fetch("https://phishing-extension-6qs8.onrender.com/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: message.url }),
        });

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
