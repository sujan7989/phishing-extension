# ✅ Test URLs That Actually Work

## The Problem

URLs like `secure-login-verify.com` don't exist, so you get DNS error before extension can analyze them.

## ✅ Solution: Use Real URLs for Testing

### **Test Method 1: Use Real Phishing Simulation Sites**

These are **safe educational sites** that look like phishing:

```
https://phishing-demo.com
https://www.phishing.org/phishing-examples
```

### **Test Method 2: Create Test HTML File**

Create a local HTML file with suspicious URL patterns:

1. **Create file:** `test-phishing.html`
```html
<!DOCTYPE html>
<html>
<head><title>Test Phishing Page</title></head>
<body>
<h1>Secure Login Verification Required</h1>
<p>Please verify your account to continue.</p>
<form>
  <input type="text" placeholder="Username">
  <input type="password" placeholder="Password">
  <button>Verify Account</button>
</form>
</body>
</html>
```

2. **Open in browser:** `file:///C:/path/to/test-phishing.html`

### **Test Method 3: Use Localhost with Suspicious Path**

1. **Start a simple server:**
```bash
cd C:\Users\HP\Desktop
python -m http.server 8000
```

2. **Visit:** `http://localhost:8000/secure-login-verify`

The extension will analyze the URL pattern!

### **Test Method 4: Use Real Sites (Best Method)**

Test with **real websites** to see the extension working:

#### **Legitimate URLs (Should NOT show warning):**
```
https://www.google.com
https://www.github.com
https://www.microsoft.com
https://www.amazon.com
https://www.facebook.com
```

#### **Suspicious Patterns (May trigger warning):**

These are real sites but have patterns that might be flagged:

```
http://192.168.1.1
http://10.0.0.1
```

(Your router's IP - has suspicious pattern: IP address + no HTTPS)

---

## 🔧 **I Fixed Your Extension!**

### **The Bug:**

Your `background.js` was missing `/predict` endpoint:

**Wrong:**
```javascript
fetch("https://phishing-extension-6qs8.onrender.com", {
```

**Fixed:**
```javascript
fetch("https://phishing-extension-6qs8.onrender.com/predict", {
```

### **Now Reload Extension:**

1. Go to: `chrome://extensions/`
2. Find PhishGuard
3. Click reload (🔄)

---

## 🧪 **Test Your Extension Now**

### **Test 1: Legitimate Site**

1. Visit: `https://www.google.com`
2. **Expected:** Loads normally ✅
3. **Console (F12):** Should see:
   ```
   [PhishGuard] Prediction result: {
     prediction: "legitimate",
     probability: "5%"
   }
   ```

### **Test 2: IP Address (Suspicious)**

1. Visit: `http://192.168.1.1`
2. **Expected:** May show warning ⚠️ (IP addresses are suspicious)
3. **Console:** Should see:
   ```
   [PhishGuard] Prediction result: {
     prediction: "phishing",
     probability: "75%"
   }
   ```

### **Test 3: Check Backend Directly**

1. **Open browser**
2. **Visit:** `https://phishing-extension-6qs8.onrender.com`
3. **Should see:**
   ```json
   {
     "status": "success",
     "message": "✅ Phishing Detection API is running"
   }
   ```

4. **Test prediction:**
   - Visit: `https://phishing-extension-6qs8.onrender.com/predict?url=http://secure-login-verify.com`
   - Should see prediction result

---

## 📊 **How to Test Properly**

### **Method 1: Use Browser Console**

1. Open any website
2. Press F12 (open console)
3. Run this code:
```javascript
fetch("https://phishing-extension-6qs8.onrender.com/predict", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: "http://secure-login-verify.com" })
})
.then(r => r.json())
.then(data => console.log(data));
```

4. You'll see the prediction result!

### **Method 2: Use Real Websites**

Just browse normally:
- Visit Google → Should work fine
- Visit GitHub → Should work fine
- Visit your router IP → May show warning

### **Method 3: Create Test Page**

Create `test.html`:
```html
<!DOCTYPE html>
<html>
<head><title>Secure Login Verification</title></head>
<body>
<h1>⚠️ Verify Your Account</h1>
<p>Your account has been suspended. Please login to verify.</p>
<form>
  <input type="text" placeholder="Email">
  <input type="password" placeholder="Password">
  <button>Verify Now</button>
</form>
</body>
</html>
```

Open it: `file:///C:/path/to/test.html`

The URL pattern will be analyzed!

---

## ✅ **Quick Fix Summary**

1. **I fixed the bug** - Added `/predict` to fetch URL
2. **Reload extension** - `chrome://extensions/` → Reload
3. **Test with real sites** - Use Google, GitHub, etc.
4. **Check console** - Press F12 to see logs

---

## 🎯 **Expected Behavior**

### **Legitimate Sites:**
- ✅ Load normally
- ✅ No warning page
- ✅ Console shows "legitimate"

### **Suspicious Patterns:**
- ⚠️ Warning page appears
- ⚠️ Shows reason and probability
- ⚠️ Console shows "phishing"

---

## 🔍 **Debug Checklist**

- [ ] Extension reloaded
- [ ] Backend URL correct (with `/predict`)
- [ ] Backend is running (test in browser)
- [ ] Console shows prediction logs
- [ ] No errors in console
- [ ] Testing with real websites

---

**Your extension should work now! Reload it and test with real websites like Google.com** ✅
