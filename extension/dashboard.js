document.addEventListener("DOMContentLoaded", () => {
  const historyBody = document.getElementById("historyBody");
  const reportedBody = document.getElementById("reportedBody");
  const clearBtn = document.getElementById("clearHistoryBtn");
  const exportBtn = document.getElementById("exportHistoryBtn");
  const exportPdfBtn = document.getElementById("exportPdfBtn");
  const filterSelect = document.getElementById("filterSelect");
  const searchInput = document.getElementById("searchInput");
  const backBtn = document.getElementById("backBtn");
  const darkToggle = document.getElementById("darkModeToggle");

  const featuresBody = document.getElementById("featuresBody");
  const featuresModal = document.getElementById("featuresModal");
  const closeModal = document.getElementById("closeModal");

  const totalCountEl = document.getElementById("totalCount");
  const phishingCountEl = document.getElementById("phishingCount");
  const suspiciousCountEl = document.getElementById("suspiciousCount");
  const safeCountEl = document.getElementById("safeCount");

  const barCtx = document.getElementById("phishChart")?.getContext("2d");
  const lineCtx = document.getElementById("timelineChart")?.getContext("2d");

  let phishChart = null;
  let timelineChart = null;

  // ================= Stats =================
  function updateStats(history) {
    const counts = { phishing: 0, suspicious: 0, safe: 0 };
    history.forEach((entry) => {
      const key = (entry.prediction || entry.reason || "").toLowerCase();
      if (counts[key] !== undefined) counts[key]++;
    });
    totalCountEl.textContent = history.length;
    phishingCountEl.textContent = counts.phishing;
    suspiciousCountEl.textContent = counts.suspicious;
    safeCountEl.textContent = counts.safe;
  }

  // ================= Charts =================
  function updateCharts(history) {
    if (barCtx) {
      const counts = { phishing: 0, suspicious: 0, safe: 0 };
      history.forEach((entry) => {
        const key = (entry.prediction || entry.reason || "").toLowerCase();
        if (counts[key] !== undefined) counts[key]++;
      });
      const data = { labels: ["Phishing","Suspicious","Safe"], datasets:[{label:"Detections", data:[counts.phishing,counts.suspicious,counts.safe], backgroundColor:["#dc3545","#ffc107","#28a745"]}]};
      if(phishChart){phishChart.data=data; phishChart.update();}else{phishChart=new Chart(barCtx,{type:"bar",data,options:{responsive:true,plugins:{tooltip:{enabled:true},legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0}}}}});}
    }
    if(lineCtx){
      const countsByDate={};
      history.forEach((entry)=>{if(entry.time){const date=new Date(entry.time).toLocaleDateString(); countsByDate[date]=(countsByDate[date]||0)+1;}});
      const labels=Object.keys(countsByDate).sort((a,b)=>new Date(a)-new Date(b));
      const values=labels.map(d=>countsByDate[d]);
      const timelineData={labels,datasets:[{label:"Total Detections",data:values,borderColor:"#0d6efd",backgroundColor:"rgba(13,110,253,0.2)",tension:0.3,fill:true}]};
      if(timelineChart){timelineChart.data=timelineData; timelineChart.update();}else{timelineChart=new Chart(lineCtx,{type:"line",data:timelineData,options:{responsive:true,plugins:{tooltip:{enabled:true},legend:{position:"top"}},scales:{y:{beginAtZero:true,ticks:{precision:0}}}}});}
    }
  }

  // ================= Render History =================
  function renderHistory(filter="all",search="") {
    chrome.storage.local.get(["phishingHistory","reportedSites"],(result)=>{
      const history=Array.isArray(result.phishingHistory)?result.phishingHistory:[];
      const reported=Array.isArray(result.reportedSites)?result.reportedSites:[];

      // --- History Table ---
      historyBody.innerHTML="";
      let filtered=history;
      if(filter!=="all"){filtered=filtered.filter(h=>h.reason?.toLowerCase()===filter||h.prediction?.toLowerCase()===filter);}
      if(search.trim()!==""){filtered=filtered.filter(h=>(h.url||"").toLowerCase().includes(search.toLowerCase()));}
      if(filtered.length===0){historyBody.innerHTML=`<tr><td colspan="5" style="text-align:center;color:gray;">No records found</td></tr>`; updateStats([]); updateCharts([]);}else{
        filtered.sort((a,b)=>new Date(b.time)-new Date(a.time));
        filtered.forEach(entry=>{
          const row=document.createElement("tr");
          row.innerHTML=`<td>${entry.time?new Date(entry.time).toLocaleString():"N/A"}</td><td>${entry.url||"N/A"}</td><td>${entry.prediction||entry.reason||"Unknown"}</td><td>${entry.probability||"N/A"}</td><td><button class="view-features-btn">View Features</button></td>`;
          row.querySelector(".view-features-btn").addEventListener("click",()=>{
            renderFeatures(entry); featuresModal.style.display="block";
          });
          historyBody.appendChild(row);
        });
        updateStats(history);
        updateCharts(history);
      }

      // --- Reported Sites Table ---
      reportedBody.innerHTML="";
      if(reported.length===0){reportedBody.innerHTML=`<tr><td colspan="3" style="text-align:center;color:gray;">No reported sites</td></tr>`;}else{
        reported.sort((a,b)=>new Date(b.time)-new Date(a.time));
        reported.forEach(r=>{
          const row=document.createElement("tr");
          row.innerHTML=`<td>${r.time?new Date(r.time).toLocaleString():"N/A"}</td><td>${r.url||"N/A"}</td><td>${r.status||"Reported"}</td>`;
          reportedBody.appendChild(row);
        });
      }
    });
  }

  // ================= Render AI Features =================
  function renderFeatures(entry){
    featuresBody.innerHTML="";
    if(!entry?.features||Object.keys(entry.features).length===0){featuresBody.innerHTML=`<tr><td colspan="2" style="text-align:center;color:gray;">No features available</td></tr>`;return;}
    Object.entries(entry.features).forEach(([k,v])=>{const row=document.createElement("tr"); row.innerHTML=`<td>${k}</td><td>${typeof v==="object"?JSON.stringify(v):v}</td>`; featuresBody.appendChild(row);});
  }

  // ================= Event Listeners =================
  renderHistory();

  filterSelect?.addEventListener("change",()=>renderHistory(filterSelect.value,searchInput.value));
  searchInput?.addEventListener("input",()=>renderHistory(filterSelect.value,searchInput.value));

  clearBtn?.addEventListener("click",()=>{
    if(confirm("Are you sure you want to clear all history?")){
      chrome.storage.local.remove("phishingHistory",()=>{historyBody.innerHTML=`<tr><td colspan="5" style="text-align:center;color:gray;">History cleared</td></tr>`; updateStats([]); updateCharts([]);});
    }
  });

  // ================= Export CSV =================
  exportBtn?.addEventListener("click",()=>{
    chrome.storage.local.get(["phishingHistory","reportedSites"],(result)=>{
      const history=Array.isArray(result.phishingHistory)?result.phishingHistory:[]; if(history.length===0)return alert("No history to export.");
      let csv="Time,URL,Prediction,Probability,Features\n";
      history.forEach(h=>{const f=h.features?JSON.stringify(h.features).replace(/"/g,'""'):""; csv+=`"${h.time?new Date(h.time).toLocaleString():"N/A"}","${h.url||""}","${h.prediction||h.reason||"Unknown"}","${h.probability||"N/A"}","${f}"\n`;});
      const blob=new Blob([csv],{type:"text/csv"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`phishguard_history_${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url);
    });
  });

  // ================= Export PDF =================
  exportPdfBtn?.addEventListener("click",()=>{
    chrome.storage.local.get(["phishingHistory"],(result)=>{
      const history=Array.isArray(result.phishingHistory)?result.phishingHistory:[]; if(history.length===0)return alert("No history to export.");
      let html=`<html><head><title>PhishGuard History PDF</title></head><body><h2>PhishGuard - Scan History</h2><table border="1" cellspacing="0" cellpadding="5"><tr><th>Time</th><th>URL</th><th>Prediction</th><th>Probability</th></tr>`;
      history.forEach(h=>{html+=`<tr><td>${h.time?new Date(h.time).toLocaleString():"N/A"}</td><td>${h.url||""}</td><td>${h.prediction||h.reason||"Unknown"}</td><td>${h.probability||"N/A"}</td></tr>`;});
      html+="</table></body></html>";
      const win=window.open("","_blank"); win.document.write(html); win.document.close(); win.focus(); win.print();
    });
  });

  // ================= Modal Events =================
  closeModal?.addEventListener("click",()=>{featuresModal.style.display="none";});
  window.addEventListener("click",(e)=>{if(e.target===featuresModal)featuresModal.style.display="none";});
  window.addEventListener("keydown",(e)=>{if(e.key==="Escape"&&featuresModal.style.display==="block"){featuresModal.style.display="none";}});

  backBtn?.addEventListener("click",()=>{
    chrome.storage.local.get(["lastPage"],(result)=>{const lastPage=result.lastPage; window.location.href=(lastPage==="warning"?"warning.html":"popup.html");});
  });

  // ================= Dark Mode Toggle =================
  if(darkToggle){
    function updateDarkToggle(isDark){darkToggle.textContent=isDark?"🌞 Light Mode":"🌙 Dark Mode";}
    chrome.storage.local.get(["darkMode"],(res)=>{if(res.darkMode){document.body.classList.add("dark"); updateDarkToggle(true);}else{updateDarkToggle(false);}});
    darkToggle.addEventListener("click",()=>{const isDark=document.body.classList.toggle("dark"); chrome.storage.local.set({darkMode:isDark}); updateDarkToggle(isDark);});
  }

  // ================= Listen for Report Updates =================
  chrome.storage.onChanged.addListener((changes, area)=>{
    if(area==="local"&&(changes.reportedSites||changes.phishingHistory)){ renderHistory(filterSelect.value,searchInput.value);}
  });
});
