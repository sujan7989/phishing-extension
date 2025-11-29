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
    model, feature_cols = joblib.load("phishing_model.pkl")
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
        y_pred = model.predict(X)[0]

        phishing_prob = None
        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(X)[0]
            phishing_index = list(model.classes_).index("phishing")
            phishing_prob = float(proba[phishing_index])
            y_pred = "phishing" if phishing_prob >= 0.5 else "legitimate"

        reason = "Suspicious patterns detected" if y_pred == "phishing" else "No phishing indicators found"

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
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
