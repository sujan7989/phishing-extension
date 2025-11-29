from flask import Flask, request, jsonify, render_template_string
import sqlite3
import datetime

app = Flask(__name__)

DB_FILE = "reports.db"

# =========================
# DB Setup
# =========================
def init_db():
    with sqlite3.connect(DB_FILE) as conn:
        cur = conn.cursor()
        cur.execute(
            """CREATE TABLE IF NOT EXISTS reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL,
                reportedAt TEXT NOT NULL
            )"""
        )
        conn.commit()

init_db()

# =========================
# Dummy predict endpoint (placeholder for your ML model)
# =========================
@app.route("/predict", methods=["POST"])
def predict():
    data = request.json or {}
    url = data.get("url", "")
    # ⚠️ Replace this with your real ML prediction later
    return jsonify({"prediction": "safe", "confidence": 0.95, "url": url})

# =========================
# Report Endpoint
# =========================
@app.route("/report", methods=["POST"])
def report():
    try:
        data = request.json or {}
        url = data.get("url")
        reportedAt = data.get("reportedAt", datetime.datetime.now().isoformat(timespec="seconds"))

        if not url:
            return jsonify({"error": "Missing URL"}), 400

        with sqlite3.connect(DB_FILE) as conn:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO reports (url, reportedAt) VALUES (?, ?)",
                (url, reportedAt)
            )
            conn.commit()

        return jsonify({"message": "Report received", "url": url, "reportedAt": reportedAt}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# =========================
# View Reports Page
# =========================
@app.route("/reports", methods=["GET"])
def view_reports():
    with sqlite3.connect(DB_FILE) as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, url, reportedAt FROM reports ORDER BY id DESC")
        rows = cur.fetchall()

    # Simple HTML with auto-refresh
    html = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Reported Sites</title>
      <meta http-equiv="refresh" content="10"> <!-- auto-refresh every 10s -->
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h2 { color: #b30000; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background: #f2f2f2; }
        tr:nth-child(even) { background: #fafafa; }
      </style>
    </head>
    <body>
      <h2>🚨 Reported Sites</h2>
      <table>
        <tr><th>ID</th><th>URL</th><th>Reported At</th></tr>
        {% for row in rows %}
        <tr>
          <td>{{ row[0] }}</td>
          <td>{{ row[1] }}</td>
          <td>{{ row[2] }}</td>
        </tr>
        {% endfor %}
      </table>
      <p><i>Page auto-refreshes every 10 seconds</i></p>
    </body>
    </html>
    """
    return render_template_string(html, rows=rows)

# =========================
# Run App
# =========================
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
