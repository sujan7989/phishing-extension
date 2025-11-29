# How to Start PhishGuard Backend

## The Problem

Your extension shows "Backend error: Failed to fetch" because the Flask backend is not running.

## Solution: Start the Backend

### Step 1: Open Terminal in Backend Folder

**Windows:**
```bash
cd backend
```

### Step 2: Check if Model Exists

```bash
# Check if phishing_model.pkl exists
dir phishing_model.pkl
```

**If model doesn't exist:**
```bash
python train_model.py
```

### Step 3: Start Backend Server

```bash
python app.py
```

**You should see:**
```
📂 Loading phishing_model.pkl ...
✅ Model loaded successfully with features: 20
✅ features.py loaded successfully!
 * Running on http://127.0.0.1:5000
 * Running on http://0.0.0.0:5000
```

**⚠️ KEEP THIS TERMINAL WINDOW OPEN!**

The backend must stay running for the extension to work.

## Step 4: Test Backend

Open a NEW terminal and run:
```bash
python test_backend.py
```

You should see:
```
✅ Backend is running!
✅ Prediction working!
```

## Step 5: Reload Extension

1. Go to `chrome://extensions/`
2. Find PhishGuard
3. Click the reload icon (🔄)

## Step 6: Test Extension

Visit a suspicious URL like:
- `http://secure-login-verify.com`
- `http://192.168.1.1/login`
- `http://paypal-verify-account.com`

The warning page should now appear!

## Troubleshooting

### "Model not found" error

**Solution:**
```bash
cd backend
python train_model.py
```

### "Port 5000 already in use"

**Solution:**
```bash
# Find and kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F
```

### Backend starts but extension still fails

**Solution:**
1. Check backend is accessible: Visit `http://127.0.0.1:5000` in browser
2. Reload extension in `chrome://extensions/`
3. Check browser console (F12) for errors
4. Clear extension storage:
   ```javascript
   // In browser console
   chrome.storage.local.clear()
   ```

## Quick Commands

**Start backend:**
```bash
cd backend && python app.py
```

**Test backend:**
```bash
python test_backend.py
```

**Train model:**
```bash
cd backend && python train_model.py
```

## Keep Backend Running

The backend must stay running while you use the extension. You can:

1. **Keep terminal open** - Simplest method
2. **Run in background** - Use `start` command (Windows)
3. **Use screen/tmux** - For Linux/Mac

## Success Indicators

✅ Backend terminal shows: "Running on http://127.0.0.1:5000"  
✅ `http://127.0.0.1:5000` opens in browser  
✅ `test_backend.py` shows all tests passing  
✅ Extension errors cleared in `chrome://extensions/`  
✅ Warning page appears when visiting suspicious URLs  
