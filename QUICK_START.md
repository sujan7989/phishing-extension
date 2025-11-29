# 🚀 PhishGuard - Quick Start Guide

## ✅ Setup Verified!

All files are correctly configured. Your extension is ready to test!

---

## 🎯 3-Minute Quick Test

### **1. Reload Extension (2 minutes)**

```
1. Open Chrome
2. Go to: chrome://extensions/
3. Find PhishGuard → Click "Remove"
4. Close ALL Chrome windows
5. Open Chrome again
6. Go to: chrome://extensions/
7. Enable "Developer mode" (top right)
8. Click "Load unpacked"
9. Select folder: C:\Users\HP\Desktop\PhishGuard_Extension\extension
10. Done!
```

### **2. Check Extension Loaded (30 seconds)**

```
1. In chrome://extensions/ page
2. Find PhishGuard
3. Click "service worker" (blue link)
4. Console opens
5. Should see:
   🚀 [PhishGuard] Extension loaded and running!
   🔧 [PhishGuard] Setting up tab listener...
```

**If you see these logs → Extension is working!** ✅

### **3. Test Detection (30 seconds)**

```
1. Open new tab
2. Visit: https://www.amazon.com
3. Press F12 (open console)
4. Should see:
   📍 [PhishGuard] Analyzing URL: https://www.amazon.com
   [PhishGuard] ✅ Whitelisted domain - Skipping check
```

**If you see these logs → Detection is working!** ✅

---

## 🎓 For IBM Presentation

### **Demo Script (5 minutes)**

**1. Show Backend (30 sec)**
- Open: `https://phishing-extension-6qs8.onrender.com`
- Show API is running

**2. Show Extension (30 sec)**
- Open: `chrome://extensions/`
- Show PhishGuard is enabled
- Show no errors

**3. Test Legitimate Site (1 min)**
- Visit: `https://www.google.com`
- Show popup with low risk probability
- Show console logs

**4. Test Phishing Detection (1 min)**
- Open: `test-phishing-page.html`
- Show warning page appears
- Explain detection features

**5. Show Dashboard (1 min)**
- Click PhishGuard icon
- Click "Open Dashboard"
- Show detection history and statistics

**6. Explain Technology (1 min)**
- Machine Learning: Random Forest classifier
- Features: 20+ URL characteristics
- Cloud Backend: Render.com deployment
- Real-time Detection: Chrome Extension API

---

## 📊 Key Features to Highlight

1. **Real-time Protection**
   - Analyzes URLs as you browse
   - Instant warning for phishing sites

2. **Machine Learning**
   - Random Forest model
   - 20+ URL features analyzed
   - Trained on phishing dataset

3. **User-Friendly**
   - Clear warning pages
   - Risk probability display
   - Detection history dashboard

4. **Cloud-Based**
   - No local backend needed
   - Deployed on Render.com
   - Always accessible

---

## 🔍 Troubleshooting

### **Extension Not Loading?**
```
1. Check chrome://extensions/
2. Look for "Errors" button
3. Click "service worker" to see logs
4. If no logs → Remove and reload extension
```

### **Backend Not Responding?**
```
1. Visit: https://phishing-extension-6qs8.onrender.com
2. If "Application failed to respond" → Wait 60 seconds
3. Render free tier sleeps after inactivity
4. Refresh page after 60 seconds
```

### **No Console Logs?**
```
1. Press F12 to open console
2. Make sure you're on "Console" tab
3. Visit a website (not chrome:// pages)
4. Should see [PhishGuard] logs
```

---

## 📁 Project Structure

```
PhishGuard_Extension/
├── backend/              # Flask API + ML Model
│   ├── app.py           # API endpoints
│   ├── features.py      # Feature extraction
│   ├── train_model.py   # Model training
│   └── phishing_model.pkl  # Trained model
├── extension/           # Chrome Extension
│   ├── manifest.json    # Extension config
│   ├── background.js    # Service worker
│   ├── popup.html/js    # Extension popup
│   ├── simple_warning.html/js  # Warning page
│   └── dashboard.html/js  # Detection history
└── dataset/
    └── phishing_data.csv  # Training data
```

---

## 🎯 Success Checklist

Before your presentation, verify:

- [ ] Backend URL responds: `https://phishing-extension-6qs8.onrender.com`
- [ ] Extension loads without errors
- [ ] Service worker shows startup logs
- [ ] Legitimate sites load normally
- [ ] Popup shows risk probability
- [ ] Test phishing page triggers warning
- [ ] Dashboard displays detection history
- [ ] Report button works

---

## 📞 Quick Commands

**Verify Setup:**
```bash
python verify_setup.py
```

**Test Backend Locally:**
```bash
cd backend
python app.py
```

**Test Prediction:**
```
Visit: https://phishing-extension-6qs8.onrender.com/predict?url=http://test.com
```

---

## 🎉 You're Ready!

Everything is configured correctly. Just:
1. Reload the extension
2. Test with Amazon.com
3. Check console logs
4. You're good to go!

**For detailed testing, see: COMPLETE_TEST_GUIDE.md**

---

**Good luck with your IBM presentation! 🚀**
