# Fix Extension Error - Line 240

## The Error

Chrome is showing an old cached error from line 240. The file is actually correct now.

## ✅ Solution: Clear and Reload

### **Step 1: Remove Extension**

1. Go to: `chrome://extensions/`
2. Find **PhishGuard**
3. Click **"Remove"** button
4. Confirm removal

### **Step 2: Close All Chrome Windows**

1. Close **ALL** Chrome windows
2. Wait 5 seconds
3. Open Chrome again

### **Step 3: Reload Extension**

1. Go to: `chrome://extensions/`
2. Click **"Load unpacked"**
3. Navigate to: `C:\Users\HP\Desktop\PhishGuard_Extension\extension`
4. Click **"Select Folder"**

### **Step 4: Verify No Errors**

1. Check PhishGuard in extensions page
2. Should show **NO "Errors" button**
3. Should show **"service worker"** link

### **Step 5: Test**

1. Visit: `https://www.amazon.com`
2. Press **F12**
3. Should see:
   ```
   [PhishGuard] 🔍 Checking URL: https://www.amazon.com
   ```

---

## ✅ If Still Shows Error

### **Alternative: Clear Extension Cache**

1. Close Chrome completely
2. Delete this folder:
   ```
   C:\Users\HP\AppData\Local\Google\Chrome\User Data\Default\Extensions
   ```
   (This clears all extension cache)

3. Restart Chrome
4. Reload extension

---

## 🎯 Expected Result

After reloading, you should see:
- ✅ No "Errors" button
- ✅ Extension enabled
- ✅ Service worker running
- ✅ Console shows logs when visiting websites

---

**Remove extension, close Chrome, reopen, and load extension again!**
