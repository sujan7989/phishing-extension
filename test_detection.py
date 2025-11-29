"""
Test script to verify PhishGuard correctly identifies phishing vs legitimate URLs
"""
import requests
import json

def test_url(url, expected):
    """Test a single URL and check if prediction matches expected result"""
    try:
        response = requests.post(
            "http://127.0.0.1:5000/predict",
            json={"url": url},
            headers={"Content-Type": "application/json"},
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            prediction = data.get('prediction', '').lower()
            probability = data.get('probability', 0)
            reason = data.get('reason', '')
            
            # Check if prediction matches expected
            is_correct = prediction == expected.lower()
            status = "✅ PASS" if is_correct else "❌ FAIL"
            
            print(f"\n{status} | {url}")
            print(f"   Expected: {expected}")
            print(f"   Got: {prediction} ({probability}%)")
            print(f"   Reason: {reason}")
            
            return is_correct
        else:
            print(f"\n❌ ERROR | {url}")
            print(f"   Status: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"\n❌ ERROR | {url}")
        print(f"   Error: {e}")
        return False

def main():
    print("=" * 70)
    print("PhishGuard Detection Test Suite")
    print("=" * 70)
    
    # Check if backend is running
    try:
        response = requests.get("http://127.0.0.1:5000/", timeout=2)
        if response.status_code != 200:
            print("\n❌ Backend is not responding correctly!")
            print("   Start backend: cd backend && python app.py")
            return
    except:
        print("\n❌ Backend is NOT running!")
        print("   Start backend: cd backend && python app.py")
        return
    
    print("\n✅ Backend is running\n")
    
    # Test cases: (URL, Expected Result)
    test_cases = [
        # LEGITIMATE URLs - Should NOT show warning
        ("https://www.google.com", "legitimate"),
        ("https://www.facebook.com", "legitimate"),
        ("https://www.youtube.com", "legitimate"),
        ("https://www.github.com", "legitimate"),
        ("https://www.amazon.com", "legitimate"),
        ("https://www.wikipedia.org", "legitimate"),
        ("https://www.reddit.com", "legitimate"),
        ("https://www.twitter.com", "legitimate"),
        
        # PHISHING URLs - Should show warning
        ("http://secure-login-verify.com", "phishing"),
        ("http://paypal-verify-account.com", "phishing"),
        ("http://192.168.1.1/login", "phishing"),
        ("http://bank-update-secure.com", "phishing"),
        ("http://amazon-gift-card-free.com", "phishing"),
        ("http://verify-your-account-now.com", "phishing"),
        ("http://secure-signin-update.com", "phishing"),
    ]
    
    print("Testing URL Detection...")
    print("=" * 70)
    
    results = []
    for url, expected in test_cases:
        result = test_url(url, expected)
        results.append(result)
    
    # Summary
    print("\n" + "=" * 70)
    print("Test Summary")
    print("=" * 70)
    
    passed = sum(results)
    total = len(results)
    percentage = (passed / total * 100) if total > 0 else 0
    
    print(f"\nPassed: {passed}/{total} ({percentage:.1f}%)")
    
    if passed == total:
        print("\n🎉 All tests passed!")
        print("\nYour extension will:")
        print("  ✅ Allow legitimate URLs (Google, Facebook, etc.)")
        print("  ⚠️  Block phishing URLs (fake login pages, etc.)")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        print("\nPossible issues:")
        print("  - Model needs retraining")
        print("  - Dataset needs more examples")
        print("  - Feature extraction needs tuning")
    
    print("\n" + "=" * 70)

if __name__ == "__main__":
    main()
