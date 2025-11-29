# 🧪 Test Your Extension - Step by Step

## The Problem

`192.168.1.1` doesn't respond, so Chrome shows error BEFORE extension can redirect.

## ✅ Solution: Test with Real URLs

### **Test 1: Check Console Logs**

1. Visit: `https://www.amazon.com`
2. **Press F12** (open console)
3. **Look for:**
   ```
   [PhishGuard] 🔍 Checking URL: https://www.amazon.com
   [PhishGuard] Prediction result: ...
   ```

**If you see these logs → Extension is working!** ✅

**If you see NO logs → Extension is not running!** ❌

---

### **Test 2: Check Backend is Running**

1. **Open new tab**
2. **Visit:** `https://phishing-extension-6qs8.onrender.com`
3. **Should see:**
   ```json
   {
     "status": "success",
     "message": "✅ Phishing Detection API is running"
   }
   ```

**If you see this → Backend is working!** ✅

**If you see error → Backend is down!** ❌

---

### **Test 3: Test Prediction Directly**

1. **Visit:** `https://phishing-extension-6qs8.onrender.com/predict?url=http://secure-login-verify.com`
2. **Should see:**
   ```json
   {
     "status": "success",
     "prediction": "phishing",
     "probability": 87.5,
     "reason": "Suspicious patterns detected"
   }
   ```

**If you see this → ML model is working!** ✅

---

### **Test 4: Use Test HTML File**

1. **Open:** `test-phishing-page.html` (I created it for you)
2. **Right-click** → Open with Chrome
3. **URL will be:** `file:///C:/Users/HP/Desktop/PhishGuard_Extension/test-phishing-page.html`

**The extension will analyze the URL pattern!**

---

### **Test 5: Check Extension Errors**

1. **Go to:** `chrome://extensions/`
2. **Find PhishGuard**
3. **Look for "Errors" button**
4. **Click it** - any errors shown?

---

### **Test 6: Check Service Worker**

1. **Go to:** `chrome://extensions/`
2. **Find PhishGuard**
3. **Click "service worker"** (blue link)
4. **Console opens** - any errors?

---

## 🔍 Debug Checklist

Run through these:

- [ ] Extension is enabled in `chrome://extensions/`
- [ ] No errors shown in extension
- [ ] Backend URL works: `https://phishing-extension-6qs8.onrender.com`
- [ ] Prediction endpoint works: `.../predict?url=test.com`
- [ ] Console shows logs when visiting Amazon.com
- [ ] Service worker is running (check in extensions page)

---

## 📸 Send Me Screenshots

If still not working, send me:

1. **Console (F12)** when visiting Amazon.com
2. **Extension page** (`chrome://extensions/`)
3. **Service worker console** (click "service worker" link)
4. **Backend URL** in browser

---

## 🎯 Expected Behavior

### **For Amazon.com (Legitimate):**
```
Console:
[PhishGuard] 🔍 Checking URL: https://www.amazon.com
[PhishGuard] Prediction result: { prediction: "legitimate", probability: "8%" }
[PhishGuard] ✅ LEGITIMATE - Allowing access

Result: Site loads normally ✅
```

### **For Suspicious URL:**
```
Console:
[PhishGuard] 🔍 Checking URL: http://suspicious-site.com
[PhishGuard] Prediction result: { prediction: "phishing", probability: "85%" }
[PhishGuard] ⚠️ PHISHING DETECTED - Blocking site

Result: Warning page appears ⚠️
```

---

## 🚨 Most Likely Issues

### **Issue 1: Backend is Sleeping**

Render free tier sleeps after 15 minutes of inactivity.

**Solution:**
- Visit: `https://phishing-extension-6qs8.onrender.com`
- Wait 30 seconds for it to wake up
- Try extension again

### **Issue 2: Extension Not Loaded**

**Solution:**
- `chrome://extensions/`
- Remove PhishGuard
- Load unpacked again
- Select `extension` folder

### **Issue 3: Service Worker Stopped**

**Solution:**
- `chrome://extensions/`
- Click "service worker" link
- If it says "inactive", click it to start
- Try again

---

## ✅ Quick Test Command

**Run this in console (F12) on any page:**

```javascript
fetch("https://phishing-extension-6qs8.onrender.com/predict", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: "http://test-phishing.com" })
})
.then(r => r.json())
.then(data => console.log("Backend response:", data))
.catch(err => console.error("Backend error:", err));
```

**Should show:**
```
Backend response: {
  status: "success",
  prediction: "phishing",
  probability: 75.2,
  ...
}
```

---

**Start with Test 1 and Test 2, then show me the results!** 🔍
