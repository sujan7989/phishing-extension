document.addEventListener("DOMContentLoaded", () => {

  // ── Element refs ──────────────────────────────────────────
  const historyBody   = document.getElementById("historyBody");
  const reportedBody  = document.getElementById("reportedBody");
  const filterSelect  = document.getElementById("filterSelect");
  const searchInput   = document.getElementById("searchInput");
  const clearBtn      = document.getElementById("clearHistoryBtn");
  const exportCsvBtn  = document.getElementById("exportCsvBtn");
  const exportPdfBtn  = document.getElementById("exportPdfBtn");
  const backBtn       = document.getElementById("backBtn");
  const darkToggle    = document.getElementById("darkModeToggle");
  const featuresModal = document.getElementById("featuresModal");
  const featuresBody  = document.getElementById("featuresBody");
  const closeModal    = document.getElementById("closeModal");

  let timelineChart = null;
  let pieChart      = null;

  // ── Dark mode ─────────────────────────────────────────────
  chrome.storage.local.get(["darkMode"], (res) => {
    if (res.darkMode) { document.body.classList.add("dark"); darkToggle.textContent = "🌞 Light"; }
  });
  darkToggle?.addEventListener("click", () => {
    const dark = document.body.classList.toggle("dark");
    darkToggle.textContent = dark ? "🌞 Light" : "🌙 Dark";
    chrome.storage.local.set({ darkMode: dark });
  });

  backBtn?.addEventListener("click", () => window.history.back());

  // ── Main render ───────────────────────────────────────────
  function render(filter = "all", search = "") {
    chrome.storage.local.get(["phishingHistory", "reportedSites", "totalScanned"], (res) => {
      const history  = Array.isArray(res.phishingHistory) ? res.phishingHistory : [];
      const reported = Array.isArray(res.reportedSites)   ? res.reportedSites   : [];
      const scanned  = (res.totalScanned || 0) + history.length;

      updateStats(history, scanned);
      updateCharts(history);
      updateTopDomains(history);
      renderHistory(history, filter, search);
      renderReported(reported);
    });
  }

  // ── Stats ─────────────────────────────────────────────────
  function updateStats(history, scanned) {
    const now     = new Date();
    const today   = now.toDateString();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    document.getElementById("totalThreats").textContent = history.length;
    document.getElementById("todayThreats").textContent =
      history.filter(h => h.time && new Date(h.time).toDateString() === today).length;
    document.getElementById("weekThreats").textContent =
      history.filter(h => h.time && new Date(h.time) >= weekAgo).length;
    document.getElementById("totalScanned").textContent = scanned;
  }

  // ── Charts ────────────────────────────────────────────────
  function updateCharts(history) {
    // Daily threats — last 7 days
    const timelineCtx = document.getElementById("timelineChart")?.getContext("2d");
    if (timelineCtx) {
      const days = [];
      const counts = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const dateStr = d.toDateString();
        days.push(label);
        counts.push(history.filter(h => h.time && new Date(h.time).toDateString() === dateStr).length);
      }
      const tData = {
        labels: days,
        datasets: [{
          label: "Threats Blocked",
          data: counts,
          borderColor: "#c62828",
          backgroundColor: "rgba(198,40,40,0.15)",
          tension: 0.4,
          fill: true,
          pointBackgroundColor: "#c62828",
          pointRadius: 4,
        }]
      };
      if (timelineChart) { timelineChart.data = tData; timelineChart.update(); }
      else {
        timelineChart = new Chart(timelineCtx, {
          type: "line", data: tData,
          options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
        });
      }
    }

    // Pie — breakdown
    const pieCtx = document.getElementById("pieChart")?.getContext("2d");
    if (pieCtx) {
      const total   = history.length;
      const blocked = total;
      const safe    = Math.max(0, (parseInt(document.getElementById("totalScanned")?.textContent) || 0) - blocked);
      const pData = {
        labels: ["Threats Blocked", "Safe Sites"],
        datasets: [{
          data: [blocked, safe],
          backgroundColor: ["#c62828", "#2e7d32"],
          borderWidth: 2,
          borderColor: "#fff",
        }]
      };
      if (pieChart) { pieChart.data = pData; pieChart.update(); }
      else {
        pieChart = new Chart(pieCtx, {
          type: "doughnut", data: pData,
          options: { responsive: true, plugins: { legend: { position: "bottom" } }, cutout: "60%" }
        });
      }
    }
  }

  // ── Top blocked domains ───────────────────────────────────
  function updateTopDomains(history) {
    const domainCount = {};
    history.forEach(h => {
      try {
        const host = new URL(h.url).hostname;
        domainCount[host] = (domainCount[host] || 0) + 1;
      } catch (_) {}
    });
    const sorted = Object.entries(domainCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const container = document.getElementById("topDomains");
    if (!container) return;
    if (!sorted.length) { container.innerHTML = `<span style="color:#aaa;font-size:13px;">No threats blocked yet</span>`; return; }
    const max = sorted[0][1];
    container.innerHTML = sorted.map(([domain, count]) => `
      <div class="domain-row">
        <span style="min-width:180px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${domain}</span>
        <div class="domain-bar-wrap"><div class="domain-bar" style="width:${Math.round((count/max)*100)}%"></div></div>
        <span class="domain-count">${count}</span>
      </div>`).join("");
  }

  // ── History table ─────────────────────────────────────────
  function renderHistory(history, filter, search) {
    let filtered = [...history];
    if (filter === "phishing") filtered = filtered.filter(h => (h.prediction || "").toLowerCase() === "phishing");
    if (search.trim()) filtered = filtered.filter(h => (h.url || "").toLowerCase().includes(search.toLowerCase()));
    filtered.sort((a, b) => new Date(b.time) - new Date(a.time));

    if (!filtered.length) {
      historyBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#aaa;padding:20px;">No records found</td></tr>`;
      return;
    }
    historyBody.innerHTML = "";
    filtered.forEach(entry => {
      const verdict   = (entry.prediction || "phishing").toLowerCase();
      const badgeCls  = verdict === "phishing" ? "badge-phish" : "badge-safe";
      const badgeTxt  = verdict === "phishing" ? "🚨 Phishing" : "✅ Safe";
      const prob      = entry.probability || entry.riskScore || "—";
      const timeStr   = entry.time ? new Date(entry.time).toLocaleString() : "—";
      const shortUrl  = (entry.url || "").length > 55 ? entry.url.slice(0, 55) + "…" : (entry.url || "—");

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="white-space:nowrap;">${timeStr}</td>
        <td title="${entry.url || ""}">${shortUrl}</td>
        <td><span class="badge ${badgeCls}">${badgeTxt}</span></td>
        <td>${prob}%</td>
        <td><button class="feat-btn">View</button></td>`;
      tr.querySelector(".feat-btn").addEventListener("click", () => openModal(entry));
      historyBody.appendChild(tr);
    });
  }

  // ── Reported sites ────────────────────────────────────────
  function renderReported(reported) {
    if (!reported.length) {
      reportedBody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:#aaa;padding:16px;">No reported sites</td></tr>`;
      return;
    }
    reportedBody.innerHTML = "";
    [...reported].sort((a, b) => new Date(b.time) - new Date(a.time)).forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${r.time ? new Date(r.time).toLocaleString() : "—"}</td><td>${r.url || "—"}</td><td><span class="badge badge-phish">Reported</span></td>`;
      reportedBody.appendChild(tr);
    });
  }

  // ── Features modal ────────────────────────────────────────
  function openModal(entry) {
    featuresBody.innerHTML = "";
    const f = entry?.features || {};
    if (!Object.keys(f).length) {
      featuresBody.innerHTML = `<tr><td colspan="2" style="text-align:center;color:#aaa;">No features available</td></tr>`;
    } else {
      Object.entries(f).forEach(([k, v]) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td><strong>${k}</strong></td><td>${typeof v === "object" ? JSON.stringify(v) : v}</td>`;
        featuresBody.appendChild(tr);
      });
    }
    featuresModal.style.display = "block";
  }
  closeModal?.addEventListener("click", () => featuresModal.style.display = "none");
  window.addEventListener("click", e => { if (e.target === featuresModal) featuresModal.style.display = "none"; });
  window.addEventListener("keydown", e => { if (e.key === "Escape") featuresModal.style.display = "none"; });

  // ── Export CSV ────────────────────────────────────────────
  exportCsvBtn?.addEventListener("click", () => {
    chrome.storage.local.get(["phishingHistory"], (res) => {
      const history = res.phishingHistory || [];
      if (!history.length) return alert("No history to export.");
      let csv = "Time,URL,Prediction,Risk Score,Reason\n";
      history.forEach(h => {
        csv += `"${h.time ? new Date(h.time).toLocaleString() : ""}","${h.url || ""}","${h.prediction || "phishing"}","${h.probability || ""}","${(h.reason || "").replace(/"/g, '""')}"\n`;
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      a.download = `phishguard_${Date.now()}.csv`;
      a.click();
    });
  });

  // ── Export PDF ────────────────────────────────────────────
  exportPdfBtn?.addEventListener("click", () => {
    chrome.storage.local.get(["phishingHistory"], (res) => {
      const history = res.phishingHistory || [];
      if (!history.length) return alert("No history to export.");
      let html = `<html><head><title>PhishGuard Report</title>
        <style>body{font-family:Arial;padding:20px}h2{color:#1a237e}table{width:100%;border-collapse:collapse;font-size:13px}th,td{border:1px solid #ddd;padding:8px}th{background:#e8eaf6;color:#1a237e}</style>
        </head><body><h2>🛡️ PhishGuard — Threat Report</h2>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <table><thead><tr><th>Time</th><th>URL</th><th>Verdict</th><th>Risk</th><th>Reason</th></tr></thead><tbody>`;
      history.forEach(h => {
        html += `<tr><td>${h.time ? new Date(h.time).toLocaleString() : ""}</td><td>${h.url || ""}</td><td>${h.prediction || "phishing"}</td><td>${h.probability || ""}%</td><td>${h.reason || ""}</td></tr>`;
      });
      html += `</tbody></table></body></html>`;
      const w = window.open("", "_blank");
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
    });
  });

  // ── Clear history ─────────────────────────────────────────
  clearBtn?.addEventListener("click", () => {
    if (confirm("Clear all scan history?")) {
      chrome.storage.local.remove(["phishingHistory", "totalScanned"], () => render());
    }
  });

  // ── Filter / search ───────────────────────────────────────
  filterSelect?.addEventListener("change", () => render(filterSelect.value, searchInput.value));
  searchInput?.addEventListener("input",   () => render(filterSelect.value, searchInput.value));

  // ── Live updates ──────────────────────────────────────────
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && (changes.phishingHistory || changes.reportedSites)) {
      render(filterSelect.value, searchInput.value);
    }
  });

  // ── Init ──────────────────────────────────────────────────
  render();
});
