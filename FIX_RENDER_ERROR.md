# Fix Render Deployment Error

## The Error

**"Exited with status 1"** - Build failed

## Common Causes & Solutions

### **Solution 1: Simplify Requirements (Try This First)**

The issue might be with scikit-learn version. Let's use simpler versions:

1. **Update `backend/requirements.txt`:**

```txt
Flask==2.3.0
flask-cors==4.0.0
scikit-learn==1.2.0
pandas==1.5.3
numpy==1.23.5
tldextract==3.4.0
joblib==1.2.0
gunicorn==20.1.0
```

2. **Commit and push:**
```bash
git add .
git commit -m "Fix requirements"
git push
```

3. **Render will auto-redeploy**

---

### **Solution 2: Use Render Blueprint (Easier)**

Instead of manual setup, use the `render.yaml` file I created:

1. **I created `render.yaml` in your project root**

2. **In Render Dashboard:**
   - Delete the failed service
   - Click "New +" → "Blueprint"
   - Connect your GitHub repo
   - Render will read `render.yaml` automatically
   - Click "Apply"

---

### **Solution 3: Manual Configuration Fix**

If you're using manual setup:

1. **Go to your service in Render**

2. **Settings → Build & Deploy:**
   - **Build Command:** `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app --bind 0.0.0.0:$PORT`

3. **Environment Variables:**
   - Add: `PYTHON_VERSION` = `3.9.18`

4. **Click "Save Changes"**

5. **Manual Deploy → "Deploy latest commit"**

---

### **Solution 4: Check Logs**

1. **In Render Dashboard:**
   - Click on your service
   - Go to "Logs" tab
   - Look for the exact error

2. **Common errors:**
   - **"No module named 'sklearn'"** → Requirements issue
   - **"Model file not found"** → Missing phishing_model.pkl
   - **"Memory error"** → Model too large (unlikely with 56MB)

---

### **Solution 5: Reduce Model Size (If Needed)**

If the model is causing issues, retrain with fewer trees:

1. **Edit `backend/train_model.py`:**

```python
# Change line ~40 from:
model = RandomForestClassifier(
    n_estimators=300,  # Change to 100
    random_state=42,
    n_jobs=-1,
    max_depth=20
)
```

2. **Retrain:**
```bash
cd backend
python train_model.py
```

3. **Commit and push**

---

### **Solution 6: Alternative - Use PythonAnywhere**

If Render keeps failing, try PythonAnywhere instead:

1. **Go to:** https://www.pythonanywhere.com
2. **Sign up** (FREE)
3. **Upload backend files**
4. **Create Flask web app**
5. **Much simpler for Python apps!**

---

## **Recommended Fix (Easiest)**

### **Step 1: Update Requirements**

Replace `backend/requirements.txt` with:

```txt
Flask==2.3.0
flask-cors==4.0.0
scikit-learn==1.2.0
pandas==1.5.3
numpy==1.23.5
tldextract==3.4.0
joblib==1.2.0
gunicorn==20.1.0
```

### **Step 2: Commit & Push**

```bash
git add backend/requirements.txt
git commit -m "Fix scikit-learn version"
git push
```

### **Step 3: Redeploy**

Render will automatically redeploy. Wait 3-5 minutes.

### **Step 4: Check Logs**

Watch the logs in Render dashboard. Should see:
```
✅ Model loaded successfully
Your service is live
```

---

## **If Still Failing**

### **Try PythonAnywhere (100% FREE Alternative)**

**Easier for Python/Flask apps:**

1. **Sign up:** https://www.pythonanywhere.com
2. **Upload files:**
   - Go to "Files"
   - Upload all backend files
   - Upload phishing_model.pkl

3. **Create web app:**
   - Go to "Web"
   - Add new web app
   - Choose Flask
   - Python 3.9

4. **Configure WSGI:**
   ```python
   import sys
   path = '/home/yourusername/backend'
   if path not in sys.path:
       sys.path.append(path)
   
   from app import app as application
   ```

5. **Reload web app**

6. **Get URL:** `https://yourusername.pythonanywhere.com`

---

## **Quick Checklist**

- [ ] Model file exists (phishing_model.pkl)
- [ ] Requirements.txt has correct versions
- [ ] Procfile is correct
- [ ] Python version is 3.9.x
- [ ] Build command is correct
- [ ] Start command is correct
- [ ] Logs checked for specific error

---

## **Contact Me**

If you're still stuck:
1. Check Render logs (copy the error)
2. Try PythonAnywhere instead
3. Or use local backend for IBM demo

---

**Most likely fix: Update requirements.txt with older scikit-learn version!**
