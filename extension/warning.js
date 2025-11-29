// ===============================
// Helpers
// ===============================
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

function updateRiskUI(probBar, probText, riskElem, pct) {
  const pctText = pct.toFixed(1) + "%";

  if (probBar) {
    probBar.style.width = pct + "%";
    probBar.textContent = pctText;
    probBar.style.background =
      pct >= 70 ? "#cc0000" : pct >= 40 ? "#ffcc00" : "#33cc33";
    probBar.style.color = pct >= 40 && pct < 70 ? "black" : "white";
  }

  if (probText) probText.textContent = pctText;

  if (riskElem) {
    riskElem.textContent =
      pct >= 70 ? "⚠️ High Risk" : pct >= 40 ? "⚠️ Medium Risk" : "Low Risk";
    riskElem.style.color =
      pct >= 70 ? "red" : pct >= 40 ? "orange" : "green";
    riskElem.style.fontWeight = "bold";
  }
}

// ===============================
// DOM Ready
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  try {
    const urlElem = document.getElementById("blockedUrl");
    const reasonElem = document.getElementById("reason");
    const probBar = document.getElementById("phishProbBar");
    const probText = document.getElementById("phishProbText");
    const riskElem = document.getElementById("riskLevel");
    const copyBtn = document.getElementById("copyBtn");
    const timestampElem = document.getElementById("timestamp");
    const detailsBtn = document.getElementById("detailsBtn");
    const backBtn = document.getElementById("backBtn");
    const proceedBtn = document.getElementById("proceedBtn");
    const dashboardBtn = document.getElementById("dashboardBtn");

    // ✅ Load detection data from storage
    chrome.storage.local.get(["lastDetection"], (res) => {
      console.log("[PhishGuard] Warning page - loaded data:", res);
      
      let blocked = "Unknown site";
      let reason = "Suspicious activity detected";
      let probability = 0;

      if (res?.lastDetection) {
        blocked = res.lastDetection.url || blocked;
        reason = res.lastDetection.reason || reason;
        probability = res.lastDetection.probability || 0;
        
        console.log("[PhishGuard] Parsed values:", { blocked, reason, probability });
      }

      // Probability is already 0-100 from backend, no need to normalize
      const pct = Number(probability) || 0;

      // ===============================
      // Populate UI
      // ===============================
      if (urlElem) {
        urlElem.textContent = blocked;
        urlElem.title = blocked;
      }

      if (copyBtn) {
        copyBtn.addEventListener("click", async () => {
          try {
            if (navigator.clipboard?.writeText) {
              await navigator.clipboard.writeText(blocked);
            } else {
              const ta = document.createElement("textarea");
              ta.value = blocked;
              document.body.appendChild(ta);
              ta.select();
              document.execCommand("copy");
              document.body.removeChild(ta);
            }
            copyBtn.textContent = "✅ Copied!";
            copyBtn.disabled = true;
            setTimeout(() => {
              copyBtn.textContent = "📋 Copy";
              copyBtn.disabled = false;
            }, 1500);
          } catch (err) {
            console.error("[PhishGuard] Copy failed:", err);
            alert("Unable to copy URL.");
          }
        });
      }

      if (reasonElem) {
        reasonElem.textContent = reason;
        const lower = reason.toLowerCase();
        if (lower.includes("phish") || lower.includes("malicious")) {
          reasonElem.style.color = "red";
          reasonElem.style.fontWeight = "bold";
        } else if (lower.includes("suspicious")) {
          reasonElem.style.color = "orange";
        } else {
          reasonElem.style.color = "black";
        }
      }

      updateRiskUI(probBar, probText, riskElem, pct);

      if (timestampElem) {
        timestampElem.textContent =
          "Checked on: " + new Date().toLocaleString();
      }

      // ===============================
      // Buttons
      // ===============================

      // Back → either go back, close tab, or fallback to simple_warning
      if (backBtn) {
        backBtn.addEventListener("click", () => {
          try {
            if (document.referrer) {
              window.history.back();
            } else {
              // Fallback: open simple warning page
              window.location.href = chrome.runtime.getURL("simple_warning.html");
            }
          } catch (err) {
            console.warn("[PhishGuard] backBtn error:", err);
            window.close();
          }
        });
      }

      // Proceed Anyway
      if (proceedBtn && blocked) {
        proceedBtn.addEventListener("click", () => {
          if (/^https?:/i.test(blocked)) {
            window.location.href = blocked;
          } else {
            alert("Invalid URL, cannot proceed.");
          }
        });
      }

      // More Details
      if (detailsBtn) {
        detailsBtn.addEventListener("click", () => {
          try {
            const detailsUrl = chrome.runtime.getURL("details.html");
            window.open(detailsUrl, "_blank", "noopener,noreferrer");
          } catch (err) {
            console.error("[PhishGuard] detailsBtn error:", err);
          }
        });
      }

      // Dashboard
      if (dashboardBtn) {
        dashboardBtn.addEventListener("click", () => {
          try {
            const dashUrl = chrome.runtime.getURL("dashboard.html");
            chrome.storage.local.set({ lastPage: "warning" }, () => {
              window.open(dashUrl, "_blank", "noopener,noreferrer");
            });
          } catch (err) {
            console.error("[PhishGuard] dashboardBtn error:", err);
          }
        });
      }
    });
  } catch (err) {
    console.error("[PhishGuard] warning.js error:", err);
    const reasonElem = document.getElementById("reason");
    if (reasonElem) {
      reasonElem.textContent = "Unable to load details.";
      reasonElem.style.color = "red";
      reasonElem.style.fontWeight = "bold";
    }
  }
});
