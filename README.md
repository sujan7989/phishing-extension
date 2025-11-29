# PhishGuard - AI Phishing Detection Extension

Browser extension that uses Machine Learning to detect and block phishing websites.

## Setup

### 1. Install Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Train ML Model
```bash
cd backend
python train_model.py
```

### 3. Start Backend Server (IMPORTANT!)
```bash
cd backend
python app.py
```

**⚠️ KEEP THIS TERMINAL OPEN!** The backend must stay running.

You should see:
```
✅ Model loaded successfully with features: 20
 * Running on http://127.0.0.1:5000
```

### 4. Test Backend (Optional)
Open a NEW terminal:
```bash
python test_backend.py
```

### 5. Load Extension in Browser

**Chrome/Edge:**
1. Go to `chrome://extensions/` (or `edge://extensions/`)
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select the `extension` folder
5. Done!

### 6. Reload Extension After Backend Starts
1. Go to `chrome://extensions/`
2. Find PhishGuard
3. Click reload icon (🔄)

## Usage

- **Automatic Protection**: Browse normally - extension scans every site
- **Manual Check**: Click extension icon to check current page
- **Dashboard**: Click "Open Dashboard" to view history and stats
- **Report Sites**: Click "Report Site" to flag suspicious URLs

## Features

✅ Real-time phishing detection using Random Forest ML  
✅ 20+ URL features analyzed (length, structure, keywords, entropy)  
✅ Visual warning pages for phishing sites  
✅ Analytics dashboard with charts  
✅ Export history (CSV/PDF)  
✅ 100% local - no external servers  

## Troubleshooting

**"Backend offline"** → Run `python backend/app.py`  
**"Model not found"** → Run `python backend/train_model.py`  
**Extension not loading** → Check `chrome://extensions/` for errors

## How It Works

1. Extension monitors all HTTP/HTTPS navigation
2. Sends URL to local Flask API
3. Backend extracts 20+ features from URL
4. Random Forest model predicts phishing/legitimate
5. If phishing detected → shows warning page
6. User can proceed or go back

## Privacy

- Everything runs locally on your machine
- No external API calls or data collection
- Backend only accessible from localhost
