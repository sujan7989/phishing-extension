# 🛡️ PhishGuard — AI-Powered Phishing Detection Chrome Extension

> Real-time phishing protection for Chrome. Blocks malicious sites instantly before they load.

![Warning Page](https://raw.githubusercontent.com/sujan7989/phishing-extension/main/extension/icons/icon128.png)

| Popup | Warning Page | AI Analysis | Dashboard |
|-------|-------------|-------------|-----------|
| Scans current tab instantly | Blocks phishing with risk score | Full AI feature breakdown | History, charts, CSV export |

PhishGuard is a Chrome extension that detects phishing and malicious URLs in real time using a multi-signal detection engine. When you visit a suspicious site, it intercepts the navigation and shows a warning page before any harm is done.

---

## 🚀 How It Works

```
You visit a URL
      ↓
Chrome extension intercepts (background.js)
      ↓
URL sent to PhishGuard API (cloud or localhost)
      ↓
13-signal detection engine analyzes the URL
      ↓
PHISHING → Red warning page shown
LEGITIMATE → Page loads normally
```

### Detection Signals
| Signal | Description |
|--------|-------------|
| IP Address as Host | Flags URLs using raw IPs (e.g. `http://192.168.1.1/login`) |
| Suspicious TLD | Flags `.tk`, `.ml`, `.fake`, `.xyz`, etc. |
| Brand Spoofing | Detects brand names in subdomains (e.g. `paypal.attacker.com`) |
| Fake Domain Embed | Catches `paypal.com.evil.net` style attacks |
| Typosquatting | Detects `paypa1.com`, `g00gle.com`, `arnazon.com` |
| Phishing Keywords | Flags `verify`, `login`, `suspended`, `urgent`, etc. |
| @ Symbol | Catches browser obfuscation trick (`user@evil.com`) |
| Excessive Hyphens | Flags `secure-bank-login-verify.com` |
| Subdomain Depth | Flags deep subdomain chains |
| Long URL | Flags URLs over 100 characters |
| Encoded Characters | Detects `%xx` encoded payloads |
| No HTTPS | Flags plain HTTP sites |
| Numeric Domain | Flags purely numeric domains |

---

## 📦 Installation

### Option A — Use the Deployed API (No setup needed)
The extension connects to the live API automatically. Just load the extension in Chrome.

### Option B — Run Locally

**1. Clone the repo**
```bash
git clone https://github.com/YOUR_USERNAME/PhishGuard_Extension.git
cd PhishGuard_Extension
```

**2. Install backend dependencies**
```bash
pip install -r backend/requirements.txt
```

**3. Start the backend**
```bash
python backend/app_simple.py
```
Backend runs on `http://127.0.0.1:5000`

**4. Load the extension in Chrome**
- Open `chrome://extensions/`
- Enable **Developer mode** (top right)
- Click **Load unpacked**
- Select the `extension/` folder

---

## 🧪 Testing

```bash
python test_comprehensive.py
```

Expected output:
```
Result: 58/58  →  Accuracy: 100.0%
🎉 100% accuracy on all test cases!
```

### Test URLs

**Phishing (should trigger warning):**
- `paypal-verify-account.fake`
- `http://192.168.1.1/login`
- `https://secure-bank-login.xyz`
- `https://paypal.com.attacker.net/verify`
- `https://paypa1.com/login` (typosquatting)

**Legitimate (should load normally):**
- `https://www.google.com`
- `https://www.paypal.com`
- `https://github.com`

---

## 🌐 API Endpoints

Base URL: `https://phishguard-api.onrender.com`

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
    "Phishing Keywords": "verify, account, paypal",
    "Risk Score": "100/100",
    "Verdict": "PHISHING"
  }
}
```

### `POST /report`
Report a phishing site.

**Request:**
```json
{ "url": "https://evil-site.com", "reason": "Tried to steal my password" }
```

---

## 🗂️ Project Structure

```
PhishGuard_Extension/
├── backend/
│   ├── app_simple.py       # Main Flask API with detection engine
│   ├── features.py         # URL feature extraction
│   ├── requirements.txt    # Python dependencies
│   └── reports.json        # Stored user reports
├── extension/
│   ├── manifest.json       # Chrome extension config (MV3)
│   ├── background.js       # Service worker — intercepts URLs
│   ├── simple_warning.html # Warning page shown on phishing detection
│   ├── warning.html        # Detailed warning with risk score
│   ├── details.html        # AI analysis report page
│   ├── dashboard.html      # Detection history dashboard
│   ├── popup.html          # Extension popup
│   └── icons/              # Extension icons
├── Procfile                # Render/Heroku deployment
├── render.yaml             # Render deployment config
└── README.md
```

---

## 🚀 Deploy Your Own Backend

### Render (Free)
1. Fork this repo
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repo
4. Render auto-detects `render.yaml` and deploys
5. Update `API_URLS` in `extension/background.js` with your Render URL

### Railway / Heroku
The `Procfile` works for both. Set `PORT` environment variable if needed.

---

## 🔒 Security Features

- Rate limiting: 60 requests/minute per IP on `/predict`, 10/minute on `/report`
- Input validation: URLs over 2048 chars are rejected
- No stack traces exposed to clients
- CORS restricted to extension origins
- No user data stored — only reported URLs

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Extension | Chrome MV3, Vanilla JS |
| Backend | Python, Flask |
| Detection | Rule-based multi-signal engine |
| Deployment | Render / Gunicorn |

---

## 📊 Accuracy

Tested against 58 URLs (38 phishing + 20 legitimate):

| Category | Correct | Total | Accuracy |
|----------|---------|-------|----------|
| Phishing | 38 | 38 | 100% |
| Legitimate | 20 | 20 | 100% |
| **Overall** | **58** | **58** | **100%** |

---

## 🤝 Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m "Add your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

## ⚠️ Disclaimer

PhishGuard is a security tool for educational and protective purposes. It uses heuristic detection and may not catch every phishing site. Always exercise caution online.
