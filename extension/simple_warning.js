document.addEventListener("DOMContentLoaded", () => {
  const blockedUrlEl = document.getElementById("blockedUrl");
  const reasonEl     = document.getElementById("reasonText");
  const riskBar      = document.getElementById("riskBar");
  const riskLabel    = document.getElementById("riskLabel");
  const goBackBtn    = document.getElementById("goBackBtn");
  const detailsBtn   = document.getElementById("detailsBtn");
  const dashboardBtn = document.getElementById("dashboardBtn");
  const reportBtn    = document.getElementById("reportBtn");
  const trustBtn     = document.getElementById("trustBtn");
  const copyUrlBtn   = document.getElementById("copyUrlBtn");
  const countdownEl  = document.getElementById("countdown");

  chrome.storage.local.get(["lastDetection", "trustedDomains"], (data) => {
    const d      = data?.lastDetection || {};
    const url    = d.url      || "Unknown site";
    const reason = d.reason   || "Suspicious patterns detected";
    const prob   = Number(d.probability) || 0;

    // Populate URL
    if (blockedUrlEl) blockedUrlEl.textContent = url;

    // Populate reason
    if (reasonEl) reasonEl.textContent = reason;

    // Animate risk bar
    if (riskBar && riskLabel) {
      setTimeout(() => {
        riskBar.style.width      = prob + "%";
        riskBar.style.background = prob >= 70 ? "#c62828" : prob >= 40 ? "#f57c00" : "#388e3c";
        riskLabel.textContent    = prob + "% risk";
        riskLabel.style.color    = prob >= 70 ? "#c62828" : prob >= 40 ? "#f57c00" : "#388e3c";
      }, 100);
    }

    // ── Countdown timer ──────────────────────────────────
    let seconds = 15;
    const timer = setInterval(() => {
      seconds--;
      if (countdownEl) countdownEl.textContent = `Closing tab in ${seconds} second${seconds !== 1 ? "s" : ""}...`;
      if (seconds <= 0) {
        clearInterval(timer);
        chrome.runtime.sendMessage({ action: "closeTab" }, () => {
          if (chrome.runtime.lastError) window.history.back();
        });
      }
    }, 1000);

    // Stop countdown if user interacts
    const stopCountdown = () => {
      clearInterval(timer);
      if (countdownEl) countdownEl.textContent = "Stay safe — do not proceed.";
    };

    // ── Copy URL ─────────────────────────────────────────
    if (copyUrlBtn) {
      copyUrlBtn.addEventListener("click", () => {
        navigator.clipboard?.writeText(url).then(() => {
          copyUrlBtn.textContent = "✅ Copied!";
          setTimeout(() => { copyUrlBtn.textContent = "📋 Copy URL"; }, 1500);
        }).catch(() => {
          const ta = document.createElement("textarea");
          ta.value = url; document.body.appendChild(ta);
          ta.select(); document.execCommand("copy");
          document.body.removeChild(ta);
          copyUrlBtn.textContent = "✅ Copied!";
          setTimeout(() => { copyUrlBtn.textContent = "📋 Copy URL"; }, 1500);
        });
      });
    }

    // ── Go Back ──────────────────────────────────────────
    if (goBackBtn) {
      goBackBtn.addEventListener("click", () => {
        stopCountdown();
        chrome.runtime.sendMessage({ action: "closeTab" }, () => {
          if (chrome.runtime.lastError) window.history.back();
        });
      });
    }

    // ── View AI Analysis ─────────────────────────────────
    if (detailsBtn) {
      detailsBtn.addEventListener("click", () => {
        stopCountdown();
        window.location.href = chrome.runtime.getURL("details.html");
      });
    }

    // ── Open Dashboard ───────────────────────────────────
    if (dashboardBtn) {
      dashboardBtn.addEventListener("click", () => {
        stopCountdown();
        window.location.href = chrome.runtime.getURL("dashboard.html");
      });
    }

    // ── Trust This Site ──────────────────────────────────
    if (trustBtn) {
      trustBtn.addEventListener("click", () => {
        stopCountdown();
        try {
          const hostname = new URL(url).hostname;
          chrome.storage.local.get({ trustedDomains: [] }, (res) => {
            const trusted = res.trustedDomains;
            if (!trusted.includes(hostname)) trusted.push(hostname);
            chrome.storage.local.set({ trustedDomains: trusted }, () => {
              trustBtn.textContent = "✅ Trusted!";
              trustBtn.disabled = true;
              setTimeout(() => {
                // Navigate to the trusted site
                window.location.href = url;
              }, 800);
            });
          });
        } catch {
          alert("Could not trust this site.");
        }
      });
    }

    // ── Report ───────────────────────────────────────────
    if (reportBtn) {
      reportBtn.addEventListener("click", () => {
        stopCountdown();
        if (!url || url === "Unknown site") { alert("⚠️ No site to report."); return; }
        chrome.runtime.sendMessage({ action: "reportSite", url }, () => {
          reportBtn.textContent = "✅ Reported!";
          reportBtn.disabled = true;
        });
      });
    }
  });
});
