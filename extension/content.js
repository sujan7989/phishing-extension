// ==============================
// PhishGuard Content Script
// Runs on every page after load
// Checks page content for phishing signals
// ==============================

(function () {
  // Don't run on extension pages
  if (location.protocol === "chrome-extension:") return;

  const signals = {};
  let riskScore = 0;

  try {
    const hostname = location.hostname.toLowerCase();
    const pageUrl  = location.href.toLowerCase();

    // ── 1. Password field present ──────────────────────────
    const passwordFields = document.querySelectorAll("input[type='password']");
    if (passwordFields.length > 0) {
      signals.hasPasswordField = true;
      riskScore += 10;
    }

    // ── 2. Login form with action pointing to different domain ──
    const forms = document.querySelectorAll("form");
    let formMismatch = false;
    forms.forEach((form) => {
      const action = (form.getAttribute("action") || "").toLowerCase().trim();
      if (!action || action.startsWith("#") || action.startsWith("/") || action.startsWith("?")) return;
      try {
        const actionHost = new URL(action, location.href).hostname.toLowerCase();
        if (actionHost && actionHost !== hostname) {
          formMismatch = true;
          signals.formActionMismatch = actionHost;
          riskScore += 40; // Very strong signal
        }
      } catch (_) {}
    });

    // ── 3. Hidden iframes (common in phishing kits) ────────
    const iframes = document.querySelectorAll("iframe");
    let hiddenIframes = 0;
    iframes.forEach((f) => {
      const style  = window.getComputedStyle(f);
      const width  = parseInt(style.width)  || 0;
      const height = parseInt(style.height) || 0;
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.opacity === "0" ||
        (width <= 2 && height <= 2)
      ) {
        hiddenIframes++;
      }
    });
    if (hiddenIframes > 0) {
      signals.hiddenIframes = hiddenIframes;
      riskScore += 20;
    }

    // ── 4. External scripts from suspicious domains ─────────
    const scripts = document.querySelectorAll("script[src]");
    let suspiciousScripts = 0;
    const SUSPICIOUS_SCRIPT_TLDS = [".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top"];
    scripts.forEach((s) => {
      const src = (s.getAttribute("src") || "").toLowerCase();
      if (SUSPICIOUS_SCRIPT_TLDS.some(t => src.includes(t))) {
        suspiciousScripts++;
      }
    });
    if (suspiciousScripts > 0) {
      signals.suspiciousScripts = suspiciousScripts;
      riskScore += 15;
    }

    // ── 5. Page title spoofing (brand name in title but domain doesn't match) ──
    const BRANDS = ["paypal", "amazon", "apple", "microsoft", "google",
                    "facebook", "instagram", "netflix", "bank", "chase"];
    const title = document.title.toLowerCase();
    const rootDomain = hostname.split(".").slice(-2)[0] || "";
    BRANDS.forEach((brand) => {
      if (title.includes(brand) && !rootDomain.includes(brand)) {
        signals.titleSpoofing = brand;
        riskScore += 25;
      }
    });

    // ── Only report if we found something meaningful ────────
    if (riskScore > 0 || Object.keys(signals).length > 0) {
      chrome.runtime.sendMessage({
        action:   "contentSignals",
        url:      location.href,
        signals,
        riskScore,
      });
    }

  } catch (err) {
    // Silent fail — never break the page
  }
})();
