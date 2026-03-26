# 🛡️ PhishGuard — AI-Powered Phishing Detection Chrome Extension

> Real-time phishing protection for Chrome. Blocks malicious sites instantly before they load.

![Icon](https://raw.githubusercontent.com/sujan7989/phishing-extension/main/extension/icons/icon128.png)

| Popup | Warning Page | AI Analysis | Dashboard |
|-------|-------------|-------------|-----------|
| Scans current tab instantly | Blocks phishing with risk score | Full AI feature breakdown + VirusTotal | History, charts, CSV export |

PhishGuard is a Chrome extension that detects phishing and malicious URLs in real time using a multi-signal detection engine backed by a live Flask API. When you visit a suspicious site, it intercepts the navigation and shows a warning page before any harm is done.

---

## 🚀 How It Works

```
You visit a URL
      ↓
Chrome extension intercepts (background.js)
      ↓
Instant local check (13 signals) — blocks obvious threats immediately
      ↓
URL sent to PhishGuard API (Render cloud or localhost fallback)
      ↓
13-signal detection engine analyzes the URL
      ↓
PHISHING → Red warning page shown
      ↓
Click "View AI Analysis" → Full report + VirusTotal scan (90+ engines)
LEGITIMATE → Page loads normally
```

---

## 🔍 Detection Signals

| Signal | Description |
|--------|-------------|
| IP Address as Host | Flags URLs using raw IPs (e.g. `http://192.168.1.1/login`) |
| Suspicious TLD | Flags `.tk`, `.ml`, `.fake`, `.xyz`, etc. |
| Brand Spoofing | Detects brand names in subdomains (e.g. `paypal.attacker.com`) |
| Fake Domain Embed | Catches `paypal.com.evil.net` style attacks |
| Typosquatting | Detects `paypa1.com`, `g00gle.com`, `arnazon.com` |
| Phishing Keywords | Flags `verify`, `suspended`, `credential`, `urgent`, etc. |
| @ Symbol | Catches browser obfuscation trick |
| Excessive Hyphens | Flags `secure-bank-login-verify.com` |
| Subdomain Depth | Flags deep subdomain chains |
| Long URL | Flags URLs over 200 characters |
| Encoded Characters | Detects `%xx` encoded payloads |
| No HTTPS | Flags plain HTTP sites |
| Numeric Domain | Flags purely numeric domains |

---

## 🦠 VirusTotal Integration

PhishGuard integrates with the **VirusTotal API** to cross-check every blocked URL against 90+ antivirus and security engines worldwide.

When you click **"View AI Analysis"** on the warning page, the AI Analysis Report shows:

- How many engines flagged the URL (e.g. `10 / 95 engines`)
- Breakdown: Malicious / Suspicious / Harmless / Undetected
- Color-coded verdict: 🔴 Malicious · 🟡 Suspicious · 🟢 Clean
- Direct link to the full VirusTotal report

### How to test VirusTotal

Visit any phishing URL — for example:

```
http://paypal-verify.tk
```

1. PhishGuard blocks it and shows the warning page
2. Click **"🤖 View AI Analysis"**
3. Scroll down to the **VirusTotal Intelligence** card
4. You'll see something like:

```
🚨 Flagged by 10 / 95 security engines
Malicious: 9  |  Suspicious: 1  |  Harmless: 54  |  Undetected: 31
[ View Full Report ↗ ]
```

---

## 📦 Installation

### Option A — Use the Deployed API (No setup needed)
The extension connects to the live API automatically. Just load the extension in Chrome.

1. Clone or download this repo
2. Open `chrome://extensions/`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** → select the `extension/` folder
5. Done — no Python, no backend needed

### Option B — Run Locally

```bash
git clone https://github.com/sujan7989/phishing-extension.git
cd phishing-extension
pip install -r requirements.txt
C:\Python313\python.exe backend/app_simple.py
```

Backend runs on `http://127.0.0.1:5000`

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

**Phishing (should trigger warning):**
- `http://paypal-verify.tk`
- `http://192.168.1.1/login`
- `https://secure-bank-login.xyz`
- `https://paypal.com.attacker.net/verify`
- `https://paypa1.com/login`

**Legitimate (should load normally):**
- `https://www.google.com`
- `https://www.netflix.com`
- `https://github.com`
- `https://ilovepdf.com`

---

## 🌐 API Endpoints

Base URL: `https://phishing-extension-tib4.onrender.com`

### `POST /predict`
Analyze a URL for phishing.

**Request:**
```json
{ "url": "https://paypal-verify-account.fake" }
```

**Response:**
```json
{
  "status": "success",
  "prediction": "phishing",
  "probability": 100,
  "reason": "Brand 'paypal' used in subdomain; Phishing keywords detected",
  "features": {
    "Brand Spoofing": "paypal",
    "Phishing Keywords": "verify, account",
    "Risk Score": "100/100",
    "Verdict": "PHISHING"
  }
}
```

### `POST /virustotal`
Cross-check a URL against 90+ security engines via VirusTotal.

**Request:**
```json
{ "url": "http://paypal-verify.tk" }
```

**Response:**
```json
{
  "status": "success",
  "virustotal": {
    "engines_detected": 10,
    "engines_total": 95,
    "malicious": 9,
    "suspicious": 1,
    "harmless": 54,
    "undetected": 31,
    "verdict": "malicious",
    "vt_link": "https://www.virustotal.com/gui/url/..."
  }
}
```

### `POST /report`
Report a phishing site manually.

```json
{ "url": "https://evil-site.com", "reason": "Tried to steal my password" }
```

---

## �️ Project Structure

```
phishing-extension/
├── backend/
│   ├── app_simple.py       # Flask API — detection engine + VirusTotal
│   ├── requirements.txt    # Python dependencies
│   └── reports.json        # Stored user reports
├── extension/
│   ├── manifest.json       # Chrome MV3 config
│   ├── background.js       # Service worker — intercepts URLs
│   ├── simple_warning.html # Warning page
│   ├── details.html        # AI Analysis Report + VirusTotal card
│   ├── dashboard.html      # Detection history + charts
│   ├── popup.html          # Extension popup
│   └── icons/
├── Procfile                # Render/Gunicorn deployment
├── render.yaml             # Render config
└── README.md
```

---

## � Deploy Your Own

### Render (Free)
1. Fork this repo
2. Go to [render.com](https://render.com) → New Web Service → connect repo
3. Render auto-detects `render.yaml`
4. Add environment variable: `VT_API_KEY` = your VirusTotal API key
5. Deploy

Get a free VirusTotal API key at [virustotal.com](https://www.virustotal.com) (free tier: 500 requests/day).

---

## 🔒 Security

- Rate limiting: 60 req/min on `/predict`, 10 req/min on `/virustotal` and `/report`
- Input validation: URLs over 2048 chars rejected
- No stack traces exposed to clients
- CORS restricted to extension origins
- VT API key stored as environment variable — never in code

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Extension | Chrome MV3, Vanilla JS |
| Backend | Python, Flask |
| Detection | 13-signal heuristic engine |
| Threat Intel | VirusTotal API (90+ engines) |
| Deployment | Render / Gunicorn |

---

## 📊 Accuracy

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
