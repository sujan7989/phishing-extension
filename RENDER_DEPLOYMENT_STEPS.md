# 🚀 Deploy PhishGuard to Render.com - Complete Guide

## ✅ Files Ready!

I've prepared everything you need:
- ✅ `backend/Procfile` - Created
- ✅ `backend/runtime.txt` - Created  
- ✅ `backend/requirements.txt` - Updated with gunicorn
- ✅ `backend/app.py` - Updated for cloud deployment

---

## 📋 **STEP-BY-STEP DEPLOYMENT**

### **STEP 1: Create Render Account (2 minutes)**

1. **Open browser** and go to: **https://render.com**

2. **Click** "Get Started for Free"

3. **Sign up with GitHub:**
   - Click "Sign up with GitHub"
   - Authorize Render
   - Verify your email

4. **You're in!** You should see the Render Dashboard

---

### **STEP 2: Push Code to GitHub (5 minutes)**

#### **Option A: If you have GitHub account**

1. **Create new repository on GitHub:**
   - Go to: https://github.com/new
   - Repository name: `phishguard-backend`
   - Make it **Public** or **Private** (your choice)
   - Click "Create repository"

2. **Open terminal in your project folder:**
   ```bash
   cd C:\Users\HP\Desktop\PhishGuard_Extension
   ```

3. **Initialize git and push:**
   ```bash
   git init
   git add .
   git commit -m "PhishGuard backend for Render"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/phishguard-backend.git
   git push -u origin main
   ```
   
   Replace `YOUR_USERNAME` with your GitHub username!

#### **Option B: If you don't have GitHub (Use Manual Upload)**

Skip to STEP 3 Option B below.

---

### **STEP 3: Deploy on Render (5 minutes)**

#### **Option A: Deploy from GitHub (Recommended)**

1. **In Render Dashboard:**
   - Click **"New +"** button (top right)
   - Select **"Web Service"**

2. **Connect GitHub:**
   - Click **"Connect GitHub"**
   - Find your `phishguard-backend` repository
   - Click **"Connect"**

3. **Configure Service:**
   
   Fill in these settings:

   | Field | Value |
   |-------|-------|
   | **Name** | `phishguard-api` |
   | **Region** | Choose closest to you |
   | **Branch** | `main` |
   | **Root Directory** | `backend` |
   | **Runtime** | `Python 3` |
   | **Build Command** | `pip install -r requirements.txt` |
   | **Start Command** | `gunicorn app:app` |
   | **Instance Type** | **Free** ⭐ |

4. **Click** "Create Web Service"

5. **Wait 3-5 minutes** for deployment
   - You'll see logs scrolling
   - Wait for "Your service is live" ✅

#### **Option B: Manual Upload (No GitHub)**

1. **Create a ZIP of backend folder:**
   ```bash
   cd backend
   zip -r backend.zip *
   cd ..
   ```

2. **In Render Dashboard:**
   - Click **"New +"** → **"Web Service"**
   - Choose **"Deploy an existing image from a registry"**
   - Or use **"Public Git Repository"** and paste a public repo URL

3. **Follow same configuration as Option A**

---

### **STEP 4: Get Your API URL (1 minute)**

After deployment completes:

1. **Look at the top of your service page**
2. **You'll see a URL like:**
   ```
   https://phishguard-api.onrender.com
   ```

3. **Copy this URL!** You'll need it in the next step.

4. **Test it works:**
   - Open browser
   - Visit: `https://phishguard-api.onrender.com`
   - You should see: `"✅ Phishing Detection API is running"`

---

### **STEP 5: Update Extension with API URL (2 minutes)**

Now update your extension to use the cloud backend:

1. **Open:** `extension/background.js`

2. **Find line ~193** (use Ctrl+F to search):
   ```javascript
   fetch("http://127.0.0.1:5000/predict", {
   ```

3. **Replace with:**
   ```javascript
   fetch("https://phishguard-api.onrender.com/predict", {
   ```
   
   ⚠️ **Use YOUR actual Render URL!**

4. **Find line ~310** (search for `/report`):
   ```javascript
   const res = await fetch("http://127.0.0.1:5000/report", {
   ```

5. **Replace with:**
   ```javascript
   const res = await fetch("https://phishguard-api.onrender.com/report", {
   ```

6. **Save the file!**

---

### **STEP 6: Test Extension (2 minutes)**

1. **Reload extension in Chrome:**
   - Go to: `chrome://extensions/`
   - Find PhishGuard
   - Click reload button (🔄)

2. **Test legitimate URL:**
   - Visit: `https://www.google.com`
   - Should load normally ✅

3. **Test phishing URL:**
   - Visit: `http://secure-login-verify.com`
   - Should show warning page! ⚠️

4. **Check console (F12):**
   - Should see: `[PhishGuard] Prediction result: ...`
   - No errors! ✅

---

### **STEP 7: Package Extension for Users (1 minute)**

Now create the ZIP file for users:

```bash
cd extension
zip -r phishguard-extension.zip *
```

Or on Windows:
1. Open `extension` folder
2. Select all files
3. Right-click → "Send to" → "Compressed (zipped) folder"
4. Name it: `phishguard-extension.zip`

---

## 🎉 **DONE! Your Extension is Ready!**

### **Now users can:**

1. **Download** `phishguard-extension.zip`
2. **Extract** the folder
3. **Load in Chrome:**
   - `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select extracted folder
4. **Works immediately!** ✅

**No Python, no backend setup, nothing!**

---

## 📊 **What You Get (FREE):**

- ✅ **Backend running 24/7**
- ✅ **Automatic HTTPS**
- ✅ **750 hours/month** (enough for 24/7)
- ✅ **512 MB RAM**
- ✅ **No credit card required**
- ✅ **Automatic deployments** (if using GitHub)

---

## 🔧 **Troubleshooting**

### **Issue: Deployment Failed**

**Check logs in Render:**
- Click on your service
- Go to "Logs" tab
- Look for errors

**Common fixes:**
- Make sure `phishing_model.pkl` is in backend folder
- Check `requirements.txt` has all dependencies
- Verify `Procfile` exists

### **Issue: Extension shows "Backend offline"**

**Solutions:**
1. Check Render service is running (green status)
2. Test API URL in browser: `https://your-url.onrender.com`
3. Make sure you updated BOTH URLs in background.js
4. Reload extension in Chrome

### **Issue: "Model not found" error**

**Solution:**
- Make sure `phishing_model.pkl` is in your backend folder
- If not, run: `python backend/train_model.py`
- Then redeploy to Render

---

## 💡 **Pro Tips**

### **Automatic Deployments:**
If you used GitHub, every time you push code:
```bash
git add .
git commit -m "Update"
git push
```
Render will automatically redeploy! ✅

### **View Logs:**
In Render dashboard → Your service → "Logs" tab
See all backend activity in real-time

### **Custom Domain (Optional):**
Render allows custom domains even on free tier!
- Go to Settings → Custom Domain
- Add your domain

---

## 📋 **Deployment Checklist**

- [ ] Render account created
- [ ] Code pushed to GitHub (or ready to upload)
- [ ] Service created on Render
- [ ] Deployment successful (green status)
- [ ] API URL copied
- [ ] Extension updated with API URL
- [ ] Extension tested and working
- [ ] Extension packaged as ZIP
- [ ] Ready to share! ✅

---

## 🎯 **Summary**

| What | Time | Cost |
|------|------|------|
| Create Render account | 2 min | $0 |
| Push to GitHub | 5 min | $0 |
| Deploy on Render | 5 min | $0 |
| Update extension | 2 min | $0 |
| Test | 2 min | $0 |
| Package ZIP | 1 min | $0 |
| **TOTAL** | **17 min** | **$0** |

---

## 🚀 **You're Ready!**

Your extension now works for everyone without any setup!

**Share the ZIP file and users can install immediately!**

---

## 📞 **Need Help?**

If you get stuck:
1. Check Render logs
2. Check browser console (F12)
3. Verify API URL is correct
4. Make sure service is running (green status)

---

**Good luck with your deployment! 🎉**
