import requests
import json

# Test the backend
url = "http://127.0.0.1:5000/predict"
data = {"url": "paypal-verify-account.fake"}

try:
    response = requests.post(url, json=data)
    print("Status:", response.status_code)
    print("Response:", json.dumps(response.json(), indent=2))
except Exception as e:
    print("Error:", e)