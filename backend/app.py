from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import json
import os
from datetime import datetime

# ======================================
# Initialize Flask App
# ======================================
app = Flask(__name__)
CORS(app)

# ======================================
# Try importing feature extractor
# ======================================
try:
    from features import extract_features
    print("✅ features.py loaded successfully!")
except ImportError:
    print("❌ ERROR: features.py not found or invalid.")
    extract_features = None

# ======================================
# Load trained model once at startup
# ======================================
print("📂 Loading phishing_model.pkl ...")
model, feature_cols = None, None
try:
    # Try loading from backend directory first, then current directory
    model_path = "backend/phishing_model.pkl" if os.path.exists("backend/phishing_model.pkl") else "phishing_model.pkl"
    model, feature_cols = joblib.load(model_path)
    print("✅ Model loaded successfully with features:", len(feature_cols))
except Exception as e:
    print("❌ Error loading model:", str(e))


# ======================================
# Home Route
# ======================================
@app.route("/")
def home():
    return jsonify({
        "status": "success",
        "message": "✅ Phishing Detection API is running",
        "routes": {
            "predict": "/predict?url=example.com",
            "report": "/report (POST)"
        }
    })


# ======================================
# Prediction Route
# ======================================
@app.route("/predict", methods=["GET", "POST"])
def predict():
    if model is None or extract_features is None:
        return jsonify({
            "status": "error",
            "message": "Model or feature extractor not available"
        }), 500

    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        url = data.get("url")
    else:
        url = request.args.get("url")

    if not url:
        return jsonify({"status": "error", "message": "No URL provided"}), 400

    try:
        feats = extract_features(url)
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Feature extraction failed: {str(e)}"
        }), 500

    try:
        X = pd.DataFrame([feats])[feature_cols]
        
        # Simple rule-based detection for demo
        phishing_score = 0
        
        # Check for suspicious patterns
        if feats.get("contains_suspicious_kw", 0):
            phishing_score += 30
        if feats.get("is_ip_in_host", 0):
            phishing_score += 25
        if feats.get("hyphen_in_domain", 0):
            phishing_score += 15
        if feats.get("has_at_symbol", 0):
            phishing_score += 20
        if feats.get("url_length", 0) > 75:
            phishing_score += 10
        if feats.get("num_hex_chars", 0) > 3:
            phishing_score += 15
        if feats.get("url_entropy", 0) > 4.0:
            phishing_score += 10
        
        # Determine prediction
        y_pred = "phishing" if phishing_score >= 40 else "legitimate"
        phishing_prob = min(phishing_score / 100.0, 0.95)
        
        reasons = []
        if feats.get("contains_suspicious_kw", 0):
            reasons.append("Contains suspicious keywords")
        if feats.get("is_ip_in_host", 0):
            reasons.append("Uses IP address instead of domain")
        if feats.get("hyphen_in_domain", 0):
            reasons.append("Domain contains hyphens")
        if feats.get("has_at_symbol", 0):
            reasons.append("Contains @ symbol")
        if feats.get("url_length", 0) > 75:
            reasons.append("Unusually long URL")
        
        reason = "; ".join(reasons) if reasons else "No suspicious patterns detected"

        return jsonify({
            "status": "success",
            "url": url,
            "prediction": str(y_pred),
            "probability": round(phishing_prob * 100, 2) if phishing_prob else None,
            "reason": reason,
            "features": feats
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Prediction failed: {str(e)}"
        }), 500


# ======================================
# Report Route (improved)
# ======================================
@app.route("/report", methods=["POST"])
def report():
    data = request.get_json(silent=True) or {}
    url = data.get("url")
    reason = data.get("reason", "User reported phishing")

    if not url:
        return jsonify({"status": "error", "message": "No URL provided"}), 400

    # Save reports into a file
    report_entry = {
        "url": url,
        "reason": reason,
        "timestamp": datetime.utcnow().isoformat()
    }

    try:
        if os.path.exists("reports.json"):
            with open("reports.json", "r") as f:
                reports = json.load(f)
        else:
            reports = []

        reports.append(report_entry)

        with open("reports.json", "w") as f:
            json.dump(reports, f, indent=2)

        print(f"📩 Report stored: {report_entry}")

        return jsonify({
            "status": "success",
            "message": "Report received and stored successfully",
            "report": report_entry
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to store report: {str(e)}"
        }), 500


# ======================================
# Run Flask App
# ======================================
if __name__ == "__main__":
    app.run(debug=True, port=5000)
