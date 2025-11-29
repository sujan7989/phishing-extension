#!/usr/bin/env python3
"""
PhishGuard Setup Verification Script
Checks if all components are properly configured
"""

import os
import json
import sys

def check_file_exists(filepath, description):
    """Check if a file exists"""
    if os.path.exists(filepath):
        print(f"✅ {description}: {filepath}")
        return True
    else:
        print(f"❌ {description} MISSING: {filepath}")
        return False

def check_json_file(filepath, required_keys):
    """Check if JSON file exists and has required keys"""
    if not os.path.exists(filepath):
        print(f"❌ {filepath} not found")
        return False
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        missing_keys = [key for key in required_keys if key not in data]
        if missing_keys:
            print(f"⚠️  {filepath} missing keys: {missing_keys}")
            return False
        
        print(f"✅ {filepath} is valid")
        return True
    except Exception as e:
        print(f"❌ Error reading {filepath}: {e}")
        return False

def check_backend_url_in_files():
    """Check if backend URL is correctly set in extension files"""
    backend_url = "https://phishing-extension-6qs8.onrender.com"
    files_to_check = [
        "extension/background.js",
        "extension/popup.js"
    ]
    
    all_correct = True
    for filepath in files_to_check:
        if not os.path.exists(filepath):
            print(f"❌ {filepath} not found")
            all_correct = False
            continue
        
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if backend_url in content:
            print(f"✅ {filepath} has correct backend URL")
        else:
            print(f"❌ {filepath} missing backend URL: {backend_url}")
            all_correct = False
    
    return all_correct

def main():
    print("=" * 60)
    print("🔍 PhishGuard Setup Verification")
    print("=" * 60)
    print()
    
    all_checks_passed = True
    
    # Check backend files
    print("📂 Checking Backend Files...")
    all_checks_passed &= check_file_exists("backend/app.py", "Backend API")
    all_checks_passed &= check_file_exists("backend/features.py", "Feature Extractor")
    all_checks_passed &= check_file_exists("backend/train_model.py", "Model Trainer")
    all_checks_passed &= check_file_exists("backend/phishing_model.pkl", "Trained Model")
    all_checks_passed &= check_file_exists("backend/requirements.txt", "Python Dependencies")
    all_checks_passed &= check_file_exists("backend/Procfile", "Render Config")
    print()
    
    # Check extension files
    print("🧩 Checking Extension Files...")
    all_checks_passed &= check_file_exists("extension/manifest.json", "Extension Manifest")
    all_checks_passed &= check_file_exists("extension/background.js", "Service Worker")
    all_checks_passed &= check_file_exists("extension/popup.html", "Popup HTML")
    all_checks_passed &= check_file_exists("extension/popup.js", "Popup Script")
    all_checks_passed &= check_file_exists("extension/simple_warning.html", "Warning Page")
    all_checks_passed &= check_file_exists("extension/simple_warning.js", "Warning Script")
    all_checks_passed &= check_file_exists("extension/dashboard.html", "Dashboard")
    all_checks_passed &= check_file_exists("extension/dashboard.js", "Dashboard Script")
    print()
    
    # Check manifest.json structure
    print("📋 Checking Manifest Configuration...")
    all_checks_passed &= check_json_file("extension/manifest.json", [
        "manifest_version",
        "name",
        "version",
        "permissions",
        "background",
        "action"
    ])
    print()
    
    # Check backend URL configuration
    print("🌐 Checking Backend URL Configuration...")
    all_checks_passed &= check_backend_url_in_files()
    print()
    
    # Check dataset
    print("📊 Checking Dataset...")
    all_checks_passed &= check_file_exists("dataset/phishing_data.csv", "Training Dataset")
    print()
    
    # Check icons
    print("🎨 Checking Extension Icons...")
    icon_sizes = [16, 32, 48, 64, 128]
    for size in icon_sizes:
        all_checks_passed &= check_file_exists(
            f"extension/icons/icon{size}.png",
            f"Icon {size}x{size}"
        )
    print()
    
    # Final summary
    print("=" * 60)
    if all_checks_passed:
        print("✅ ALL CHECKS PASSED!")
        print()
        print("Next Steps:")
        print("1. Reload extension in Chrome (chrome://extensions/)")
        print("2. Visit: https://phishing-extension-6qs8.onrender.com")
        print("3. Test with: https://www.amazon.com")
        print("4. Check console logs (F12)")
        print()
        print("📖 See COMPLETE_TEST_GUIDE.md for detailed testing")
    else:
        print("❌ SOME CHECKS FAILED")
        print("Please fix the issues above before testing")
    print("=" * 60)
    
    return 0 if all_checks_passed else 1

if __name__ == "__main__":
    sys.exit(main())
