// simple_warning.js

document.addEventListener("DOMContentLoaded", () => {
  const backBtn = document.getElementById("goBackSimple");
  const detailsBtn = document.getElementById("detailsBtn");
  const reportBtn = document.getElementById("reportBtn");

  // Get the last detected phishing site from storage
  chrome.storage.local.get("lastDetection", (data) => {
    const detection = data?.lastDetection || {};
    const url = detection.url || null;

    // ===============================
    // Go Back → try to close tab, else history.back
    // ===============================
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        try {
          chrome.runtime.sendMessage({ action: "closeTab" }, (res) => {
            if (chrome.runtime.lastError) {
              // Fallback if background does not handle closeTab
              if (document.referrer && !document.referrer.startsWith("chrome-extension://")) {
                window.history.back();
              } else {
                window.close();
              }
            }
          });
        } catch {
          window.history.back();
        }
      });
    }

    // ===============================
    // More Details → open warning.html
    // ===============================
    if (detailsBtn) {
      detailsBtn.addEventListener("click", () => {
        chrome.storage.local.set({ showWarningFor: url || "" }, () => {
          window.location.href = chrome.runtime.getURL("warning.html");
        });
      });
    }

    // ===============================
    // Report This Site → send to backend
    // ===============================
    if (reportBtn) {
      reportBtn.addEventListener("click", () => {
        if (url) {
          chrome.runtime.sendMessage({ action: "reportSite", url }, (response) => {
            alert("✅ Site reported successfully.");
          });
        } else {
          alert("⚠️ No site detected to report.");
        }
      });
    }
  });
});
