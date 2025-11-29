// ===============================
// Helpers
// ===============================
function fillUI(features) {
  const tbody = document.getElementById("featuresBody");
  const ts = document.getElementById("timestamp");

  const feats = features && typeof features === "object" ? features : {};
  const keys = Object.keys(feats);

  if (tbody) {
    tbody.innerHTML = "";
    if (!keys.length) {
      tbody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:#888;">No AI features available</td></tr>`;
    } else {
      keys.forEach((k) => {
        let v = feats[k];
        let display;

        if (typeof v === "object") {
          try {
            display = JSON.stringify(v);
          } catch {
            display = "[object]";
          }
        } else {
          display = String(v);
        }

        if (display.length > 200) display = display.slice(0, 200) + "…";

        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${k}</td><td>${display}</td>`;
        tbody.appendChild(tr);
      });
    }
  }

  if (ts) ts.textContent = "Checked on: " + new Date().toLocaleString();
}

// ===============================
// DOM Ready
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  try {
    const backBtn = document.getElementById("backBtn");

    chrome.storage.local.get(["lastDetection"], (res) => {
      console.log("[PhishGuard] Details page - loaded data:", res);
      
      let features = {};
      if (res?.lastDetection?.features) {
        features = res.lastDetection.features;
        console.log("[PhishGuard] Features found:", Object.keys(features).length, "features");
      } else {
        console.warn("[PhishGuard] No features in lastDetection");
      }
      fillUI(features);
    });

    if (backBtn) {
      backBtn.addEventListener("click", () => {
        const warningUrl = chrome.runtime.getURL("warning.html");
        if (document.referrer && /warning\.html/.test(document.referrer)) {
          window.history.back();
        } else {
          window.location.href = warningUrl;
        }
      });
    }
  } catch (err) {
    console.error("[PhishGuard] details.js error:", err);
    const tbody = document.getElementById("featuresBody");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:red; font-weight:bold;">Unable to load features</td></tr>`;
    }
  }
});
