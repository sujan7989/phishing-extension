# train_model.py
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib
from features import extract_features

# ======================================
# 1. Load dataset
# ======================================
print("📂 Loading dataset...")
df = pd.read_csv("../dataset/phishing_data.csv")  # adjust if path is different

print("✅ Dataset loaded with columns:", df.columns.tolist())

# Detect label column
label_col = None
if "label" in df.columns:
    label_col = "label"
elif "type" in df.columns:
    label_col = "type"
else:
    raise ValueError(f"❌ No valid label column found! Available: {df.columns.tolist()}")

# Clean label column
df[label_col] = df[label_col].astype(str).str.lower().str.strip()
print(f"🎯 Using '{label_col}' as label column")

# ======================================
# 2. Feature extraction
# ======================================
print("🔎 Extracting features...")
feature_rows = []
for url in df['url']:
    feature_rows.append(extract_features(url))

X = pd.DataFrame(feature_rows)
y = df[label_col]

print(f"✅ Extracted {X.shape[1]} features from {len(X)} URLs")

# ======================================
# 3. Train-test split
# ======================================
print("✂️ Splitting data...")
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# ======================================
# 4. Train model
# ======================================
print("🤖 Training model...")
model = RandomForestClassifier(
    n_estimators=300,
    random_state=42,
    n_jobs=-1,
    max_depth=20
)
model.fit(X_train, y_train)

# ======================================
# 5. Evaluate model
# ======================================
print("📊 Evaluating model...")
y_pred = model.predict(X_test)

print(f"\n✅ Accuracy: {accuracy_score(y_test, y_pred):.4f}\n")
print("📌 Classification Report:\n", classification_report(y_test, y_pred))
print("📌 Confusion Matrix:\n", confusion_matrix(y_test, y_pred))

# ======================================
# 6. Save model + feature column order
# ======================================
joblib.dump((model, list(X.columns)), "phishing_model.pkl")
print("\n💾 Model and feature columns saved as phishing_model.pkl")
