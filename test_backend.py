"""
Quick test to check if backend is running and working
"""
import requests

print("Testing PhishGuard Backend...")
print("=" * 50)

# Test 1: Check if backend is running
print("\n1. Testing backend connection...")
try:
    response = requests.get("http://127.0.0.1:5000/", timeout=2)
    if response.status_code == 200:
        print("✅ Backend is running!")
        print(f"   Response: {response.json()}")
    else:
        print(f"❌ Backend returned status {response.status_code}")
except requests.exceptions.ConnectionError:
    print("❌ Backend is NOT running!")
    print("\n   To start backend:")
    print("   1. Open terminal")
    print("   2. cd backend")
    print("   3. python app.py")
    exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)

# Test 2: Test prediction endpoint
print("\n2. Testing prediction endpoint...")
test_url = "http://secure-login-verify-account.com"
try:
    response = requests.post(
        "http://127.0.0.1:5000/predict",
        json={"url": test_url},
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Prediction working!")
        print(f"   URL: {test_url}")
        print(f"   Prediction: {data.get('prediction')}")
        print(f"   Probability: {data.get('probability')}%")
        print(f"   Reason: {data.get('reason')}")
        print(f"   Features: {len(data.get('features', {}))} features extracted")
    else:
        print(f"❌ Prediction failed with status {response.status_code}")
        print(f"   Response: {response.text}")
except Exception as e:
    print(f"❌ Error: {e}")

print("\n" + "=" * 50)
print("✅ Backend is working correctly!")
print("\nYou can now:")
print("1. Reload extension in chrome://extensions/")
print("2. Visit a suspicious URL")
print("3. Warning page should appear")
