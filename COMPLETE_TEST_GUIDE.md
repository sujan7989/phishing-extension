# 🎯 Complete PhishGuard Testing Guide

## Current Status ✅

All code is fixed and ready! The extension should now:
- ✅ Detect phishing URLs using ML model
- ✅ Show warning page for suspicious sites
- ✅ Display risk probability in popup
- ✅ Log all activity to console
- ✅ Connect to cloud backend (Render.com)

---

## 🚀 Step-by-Step Testing Process

### **STEP 1: Verify Backend is Running**

1. Open browser and visit:
   ```
   https://phishing-extension-6qs8.onrender.com
   ```

2. **Expected Response:**
   ```json
   {
     "status": "success",
     "message": "✅ Phishing Detection API is running",
     "routes": {
       "predict": "/predict?url=example.com",
       "report": "/report (POST)"
     }
   }
   ```

3. **If you see "Application failed to respond":**
   - Backend is sleeping (Render free tier)
   - Wait 30-60 seconds and refresh
   - It will wake up automatically

---

### **STEP 2: Test Backend Prediction**

1. Visit this URL in browser:
   ```
   https://phishing-extension-6qs8.onrender.com/predict?url=http://secure-login-verify.com
   ```

2. **Expected Response:**
   ```json
   {
     "status": "success",
     "url": "http://secure-login-verify.com",
     "prediction": "phishing",
     "probability": 85.5,
     "reason": "Suspicious patterns detected",
     "features": { ... }
   }
   ```

3. **If this works → Backend ML model is working!** ✅

---

### **STEP 3: Reload Extension (IMPORTANT)**

**You MUST reload the extension to apply all fixes:**

1. Go to: `chrome://extensions/`
2. Find **PhishGuard**
3. Click **"Remove"** button
4. **Close ALL Chrome windows**
5. Wait 5 seconds
6. Open Chrome again
7. Go to: `chrome://extensions/`
8. Enable **"Developer mode"** (top right)
9. Click **"Load unpacked"**
10. Navigate to: `C:\Users\HP\Desktop\PhishGuard_Extension\extension`
11. Click **"Select Folder"**

---

### **STEP 4: Check Extension Loaded Successfully**

1. In `chrome://extensions/` page:
   - ✅ PhishGuard should be **enabled**
   - ✅ Should show **"service worker"** link (blue text)
   - ❌ Should NOT show **"Errors"** button

2. Click **"service worker"** link
3. A console window opens

4. **You should immediately see:**
   ```
   🚀 [PhishGuard] Extension loaded and running!
   🔧 [PhishGuard] Setting up tab listener...
   ```

5. **If you see these logs → Extension is running!** ✅
6. **If you see nothing → Extension failed to load!** ❌

---

### **STEP 5: Test with Legitimate Website**

1. Open new tab
2. Visit: `https://www.amazon.com`
3. Press **F12** to open console
4. Go to **Console** tab

5. **Expected Console Output:**
   ```
   📍 [PhishGuard] Analyzing URL: https://www.amazon.com
   [PhishGuard] ✅ Whitelisted domain - Skipping check: https://www.amazon.com
   ```

6. **Result:** Site loads normally, no warning page ✅

---

### **STEP 6: Test with Test Phishing Page**

1. Open file explorer
2. Navigate to: `C:\Users\HP\Desktop\PhishGuard_Extension`
3. Right-click `test-phishing-page.html`
4. Select **"Open with Chrome"**

5. **Expected Behavior:**
   - Extension analyzes the URL
   - Console shows: `[PhishGuard] 🔍 Checking URL: file:///...`
   - Backend analyzes URL pattern
   - If detected as phishing → Warning page appears

---

### **STEP 7: Test Extension Popup**

1. Visit any website (e.g., `https://www.google.com`)
2. Click the **PhishGuard icon** in toolbar
3. Popup opens

4. **Expected Display:**
   ```
   Status: legitimate
   Risk Probability: 5.2%
   ```

5. **Color Coding:**
   - 🟢 Green = Safe (0-30%)
   - 🟡 Yellow = Suspicious (30-70%)
   - 🔴 Red = Phishing (70-100%)

---

### **STEP 8: Test Warning Page Features**

If you get a warning page:

1. **"⬅ Go Back" button** → Should close tab or go back
2. **"📊 More Details" button** → Opens detailed analysis page
3. **"🚨 Report This Site" button** → Sends report to backend

---

### **STEP 9: Test Dashboard**

1. Click PhishGuard icon
2. Click **"Open Dashboard"** button
3. Dashboard opens showing:
   - Detection history
   - Statistics
   - Charts

---

## 🔍 Debugging Checklist

If something doesn't work, check:

- [ ] Backend is awake: `https://phishing-extension-6qs8.onrender.com`
- [ ] Extension is enabled in `chrome://extensions/`
- [ ] No "Errors" button shown in extension
- [ ] Service worker console shows startup logs
- [ ] Console shows logs when visiting websites
- [ ] Extension was reloaded after code changes

---

## 📊 Expected Console Logs

### **When Extension Starts:**
```
🚀 [PhishGuard] Extension loaded and running!
🔧 [PhishGuard] Setting up tab listener...
```

### **When Visiting Legitimate Site:**
```
📍 [PhishGuard] Analyzing URL: https://www.amazon.com
[PhishGuard] ✅ Whitelisted domain - Skipping check
```

### **When Visiting Unknown Site:**
```
📍 [PhishGuard] Analyzing URL: http://example.com
[PhishGuard] 🔍 Checking URL: http://example.com
[PhishGuard] Prediction result: { prediction: "legitimate", probability: "12.5%" }
[PhishGuard] ✅ LEGITIMATE - Allowing access
```

### **When Phishing Detected:**
```
📍 [PhishGuard] Analyzing URL: http://suspicious-site.com
[PhishGuard] 🔍 Checking URL: http://suspicious-site.com
[PhishGuard] Prediction result: { prediction: "phishing", probability: "87.5%" }
[PhishGuard] ⚠️ PHISHING DETECTED - Blocking site
[PhishGuard] Detection data saved, redirecting to warning page
```

---

## 🚨 Common Issues & Solutions

### **Issue 1: Backend Returns 503 Error**
**Cause:** Render free tier is sleeping  
**Solution:** Visit backend URL and wait 30-60 seconds

### **Issue 2: Extension Shows No Logs**
**Cause:** Extension not reloaded after changes  
**Solution:** Remove extension, close Chrome, reload extension

### **Issue 3: Warning Page Not Showing**
**Cause:** Backend offline or prediction is "legitimate"  
**Solution:** Check backend is running, test with suspicious URL

### **Issue 4: Popup Shows "Backend offline"**
**Cause:** Cannot reach backend API  
**Solution:** Check internet connection, verify backend URL

### **Issue 5: Service Worker Inactive**
**Cause:** Chrome stopped service worker  
**Solution:** Click "service worker" link to restart it

---

## ✅ Success Criteria

Your extension is working correctly if:

1. ✅ Backend URL responds with success message
2. ✅ Extension loads without errors
3. ✅ Console shows startup logs
4. ✅ Legitimate sites load normally
5. ✅ Popup shows risk probability
6. ✅ Warning page appears for phishing sites
7. ✅ Dashboard displays detection history

---

## 🎯 Quick Test URLs

**Test these URLs to verify detection:**

1. **Legitimate (should allow):**
   - `https://www.google.com`
   - `https://www.amazon.com`
   - `https://github.com`

2. **Test with backend directly:**
   ```
   https://phishing-extension-6qs8.onrender.com/predict?url=http://secure-login-verify.com
   ```

3. **Local test file:**
   - Open `test-phishing-page.html` in Chrome

---

## 📸 What to Check

1. **Extension page** (`chrome://extensions/`)
   - No errors shown
   - Service worker active

2. **Service worker console**
   - Shows startup logs
   - Shows URL analysis logs

3. **Browser console (F12)**
   - Shows detection logs when visiting sites

4. **Backend URL**
   - Returns JSON response
   - Prediction endpoint works

---

## 🎓 For IBM Presentation

**Demo Flow:**

1. Show backend is running (visit URL)
2. Show extension in Chrome
3. Visit legitimate site → Show it's allowed
4. Open test phishing page → Show warning appears
5. Click popup → Show risk probability
6. Open dashboard → Show detection history
7. Explain ML features used for detection

---

**Start with STEP 1 and work through each step!** 🚀

If you encounter any issues, check the service worker console first - it will show you exactly what's happening.
