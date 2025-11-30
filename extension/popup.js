document.addEventListener("DOMContentLoaded", () => {
  const resultDiv = document.getElementById("result");
  const dashboardBtn = document.getElementById("openDashboard");
  const reportBtn = document.getElementById("reportBtn");

  // ===============================
  // Handle Open Dashboard button
  // ===============================
  if (dashboardBtn) {
    dashboardBtn.addEventListener("click", () => {
      console.log("[PhishGuard] 📊 Open Dashboard button clicked.");
      chrome.storage.local.set({ lastPage: "popup" }, () => {
        chrome.runtime.sendMessage({ action: "openDashboard" });
      });
    });
  }

  // ===============================
  // Handle Report button
  // ===============================
  if (reportBtn) {
    reportBtn.addEventListener("click", async () => {
      try {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.url) {
          alert("No active tab URL found.");
          return;
        }

        chrome.runtime.sendMessage({
          action: "reportSite",
          url: tab.url
        });

        alert("🚨 Report submitted for: " + tab.url);
      } catch (err) {
        console.error("[PhishGuard] Report button error:", err);
      }
    });
  }

  // ===============================
  // Run phishing prediction
  // ===============================
  if (resultDiv) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) {
        resultDiv.textContent = "No active tab found.";
        return;
      }

      const url = tabs[0].url;

      fetch("http://localhost:5000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      })
        .then(response => {
          if (!response.ok) throw new Error("Server returned " + response.status);
          return response.json();
        })
        .then(data => {
          const prediction = (data.prediction || "Unknown").toString();
          const probability = data.probability ? parseFloat(data.probability) : null;

          // Reset result box class
          resultDiv.className = "result-box";

          if (probability !== null && !isNaN(probability)) {
            const percentage = probability.toFixed(1);

            // 🟢 Clean formatted UI
            resultDiv.innerHTML = `
              <p><b>Status:</b> ${prediction}</p>
              <p><b>Risk Probability:</b> ${percentage}%</p>
            `;

            // Color coding
            if (prediction.toLowerCase() === "phishing") {
              resultDiv.classList.add("phishing");
            } else if (prediction.toLowerCase() === "suspicious") {
              resultDiv.classList.add("suspicious");
            } else {
              resultDiv.classList.add("safe");
            }
          } else {
            // No probability available, just show prediction
            resultDiv.innerHTML = `<p><b>Status:</b> ${prediction}</p>`;
            
            if (prediction.toLowerCase() === "phishing") {
              resultDiv.classList.add("phishing");
            } else if (prediction.toLowerCase() === "suspicious") {
              resultDiv.classList.add("suspicious");
            } else {
              resultDiv.classList.add("safe");
            }
          }
        })
        .catch(err => {
          console.error("[PhishGuard] ❌ Prediction error:", err);
          resultDiv.innerHTML = `<p>⚠️ Backend offline. Start server: python backend/app.py</p>`;
          resultDiv.className = "result-box suspicious";
        });
    });
  }
});
