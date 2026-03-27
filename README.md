# 🛡️ PhishGuard — AI-Powered Phishing Detection Chrome Extension

> Real-time phishing protection for Chrome. Blocks malicious sites instantly before they load.

![Icon](https://raw.githubusercontent.com/sujan7989/phishing-extension/main/extension/icons/icon128.png)

| Popup | Warning Page | AI Analysis | Dashboard |
|-------|-------------|-------------|-----------|
| Scans current tab + page signals | Blocks phishing with risk score | Full AI breakdown + VirusTotal | Daily charts, top domains, CSV/PDF export |

PhishGuard is a Chrome extension that detects phishing URLs in real time using a multi-layer detection system. It intercepts navigation, analyzes URLs, inspects page content, and cross-checks with VirusTotal — all before any harm is done.

---

## 🚀 How It Works

```
You visit a URL
      ↓
① Instant local check (13 URL signals) — blocks obvious threats in milliseconds
      ↓
② Backend API check (Flask on Render) — deeper multi-signal analysis
      ↓
③ Content script — inspects live page for password forms, hidden iframes, spoofing
      ↓
④ VirusTotal — cross-checks against 90+ security engines
      ↓
PHISHING → Red warning page + OS notification
LEGITIMATE → Page loads normally
```

---

## 🔍 Detection Layers

### Layer 1 — URL Analysis (13 Signals)
| Signal | Description |
|--------|-------------|
| IP Address as Host | Flags `http://192.168.1.1/login` style URLs |
| Suspicious TLD | Flags `.tk`, `.ml`, `.xyz`, `.fake`, `.gq` etc. |
| Brand Spoofing | Detects brand names in subdomains (`paypal.evil.com`) |
| Fake Domain Embed | Catches `paypal.com.evil.net` style attacks |
| Typosquatting | Detects `paypa1.com`, `g00gle.com`, `arnazon.com` |
| Phishing Keywords | Flags `verify`, `suspended`, `credential`, `unlock` etc. |
| @ Symbol | Catches browser obfuscation trick |
| Excessive Hyphens | Flags `secure-bank-login-verify.com` |
| Subdomain Depth | Flags deep subdomain chains |
| Long URL | Flags URLs over 200 characters |
| Encoded Characters | Detects `%xx` encoded payloads |
| No HTTPS | Flags plain HTTP sites |
| Numeric Domain | Flags purely numeric domains |

### Layer 2 — Domain Age Check
- Queries RDAP (free, no API key) for domain registration date
- Domain < 30 days old → +40 risk score (NEW ⚠️)
- Domain < 90 days old → +20 risk score (recent)

### Layer 3 — Page Content Analysis
Content script runs on every loaded page and checks:
- Password input fields present
- Form action submitting to a different domain (strongest phishing signal)
- Hidden iframes (common in phishing kits)
- External scripts from suspicious TLDs
- Page title spoofing a brand name

### Layer 4 — VirusTotal Intelligence
- Cross-checks every blocked URL against 90+ antivirus engines
- Shows malicious / suspicious / harmless / undetected counts
- Color-coded verdict card on AI Analysis page
- Direct link to full VirusTotal report

---

## ✨ Features

- ⚡ Instant blocking — redirects before page loads
- 🤖 AI Analysis Report — full feature breakdown with color-coded badges
- 📊 Dashboard — daily threat chart, doughnut breakdown, top blocked domains
- 📄 Page Content Signals — shown in popup when detected
- 🦠 VirusTotal Integration — 90+ engine cross-check
- 🔔 OS Notifications — desktop alert on every block
- ✅ Trust This Site — whitelist domains you trust
- 🚨 Report Site — report phishing to backend
- ⬇ Export CSV / PDF — download full scan history
- 🌙 Dark mode dashboard
- 🏓 Keep-alive ping — prevents Render cold starts

---

## 📦 Installation (No setup needed)

1. Clone or download this repo
2. Open `chrome://extensions/`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** → select the `extension/` folder
5. Done — connects to live API automatically

### Run Backend Locally (Optional)
```bash
git clone https://github.com/sujan7989/phishing-extension.git
cd phishing-extension
pip install -r requirements.txt
python backend/app_simple.py
```

---

## 🧪 Testing

```bash
python test_comprehensive.py
```

Expected:
```
Result: 58/58  →  Accuracy: 100.0%
🎉 100% accuracy on all test cases!
```

### Test URLs

**Phishing (triggers warning):**
- `http://paypal-verify.tk`
- `http://192.168.1.1/login`
- `https://secure-bank-login.xyz`
- `https://paypal.com.attacker.net/verify`
- `https://paypa1.com/login`

**Legitimate (loads normally):**
- `https://www.google.com`
- `https://www.netflix.com`
- `https://github.com`
- `https://ilovepdf.com`

---

## 🌐 API Endpoints

Base URL: `https://phishing-extension-tib4.onrender.com`

### `POST /predict`
```json
{ "url": "https://paypal-verify-account.fake" }
```
Response:
```json
{
  "prediction": "phishing",
  "probability": 100,
  "reason": "Suspicious TLD; Brand spoofing detected",
  "features": { "Suspicious TLD": ".fake", "Brand Spoofing": "paypal", "Verdict": "PHISHING" }
}
```

### `POST /virustotal`
```json
{ "url": "http://paypal-verify.tk" }
```
Response:
```json
{
  "virustotal": {
    "engines_detected": 10,
    "engines_total": 95,
    "malicious": 9,
    "suspicious": 1,
    "verdict": "malicious",
    "vt_link": "https://www.virustotal.com/gui/url/..."
  }
}
```

### `POST /report`
```json
{ "url": "https://evil-site.com", "reason": "Tried to steal my password" }
```

---

## 🗂️ Project Structure

```
phishing-extension/
├── backend/
│   ├── app_simple.py       # Flask API — detection engine + domain age + VirusTotal
│   └── requirements.txt
├── extension/
│   ├── manifest.json       # Chrome MV3 config
│   ├── background.js       # Service worker — URL interception + detection
│   ├── content.js          # Content script — page inspection
│   ├── simple_warning.html # Warning page
│   ├── details.html        # AI Analysis Report + VirusTotal card
│   ├── dashboard.html      # Threat dashboard with charts
│   ├── popup.html          # Extension popup with content signals
│   └── icons/
├── Procfile
├── render.yaml
└── README.md
```

---

## 🚀 Deploy Your Own

1. Fork this repo
2. Go to [render.com](https://render.com) → New Web Service → connect repo
3. Render auto-detects `render.yaml` and deploys
4. Add environment variable: `VT_API_KEY` = your VirusTotal API key
5. Get free key at [virustotal.com](https://www.virustotal.com) (500 req/day free)

---

## 🔒 Security

- Rate limiting: 60 req/min on `/predict`, 10 req/min on `/virustotal` and `/report`
- Input validation: URLs over 2048 chars rejected
- No stack traces exposed to clients
- CORS restricted to extension origins
- VT API key stored as environment variable only

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Extension | Chrome MV3, Vanilla JS |
| Content Script | Vanilla JS (page inspection) |
| Backend | Python, Flask, Gunicorn |
| Detection | 13-signal heuristic engine + domain age (RDAP) |
| Threat Intel | VirusTotal API (90+ engines) |
| Deployment | Render (free tier) |

---

## � Accuracy

Tested against 58 URLs (38 phishing + 20 legitimate):

| Category | Correct | Total | Accuracy |
|----------|---------|-------|----------|
| Phishing | 38 | 38 | 100% |
| Legitimate | 20 | 20 | 100% |
| Overall | 58 | 58 | 100% |

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

## ⚠️ Disclaimer

PhishGuard is a security tool for educational and protective purposes. It uses heuristic detection and may not catch every phishing site. Always exercise caution online.
