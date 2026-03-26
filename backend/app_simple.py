from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import json, os, re, base64, urllib.request
from datetime import datetime
from urllib.parse import urlparse
import tldextract

# Use cached TLD list — avoids network call on Render's read-only filesystem
_tld_extract = tldextract.TLDExtract(suffix_list_urls=[], cache_dir=None)

app = Flask(__name__)

# ─────────────────────────────────────────────
# CORS — only allow Chrome extension origins
# ─────────────────────────────────────────────
CORS(app, resources={r"/*": {"origins": [
    "chrome-extension://*",
    "http://127.0.0.1:5000",
    "http://localhost:5000",
    "https://phishguard-api.onrender.com",
]}})

# ─────────────────────────────────────────────
# RATE LIMITING — 60 requests/minute per IP
# ─────────────────────────────────────────────
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["60 per minute"],
    storage_uri="memory://",
)

print("✅ PhishGuard backend loaded!")

# ─────────────────────────────────────────────
# VIRUSTOTAL CONFIG
# Set VT_API_KEY env variable on Render dashboard
# Free tier: 4 requests/minute, 500/day
# ─────────────────────────────────────────────
VT_API_KEY = os.environ.get("VT_API_KEY", "")

def virustotal_check(url):
    """
    Query VirusTotal URL scan API.
    Returns dict with engines_detected, engines_total, vt_link, stats or error.
    """
    if not VT_API_KEY:
        return {"error": "VirusTotal API key not configured"}
    try:
        # Encode URL to base64 (VT v3 API requirement)
        url_id = base64.urlsafe_b64encode(url.encode()).decode().rstrip("=")
        api_url = f"https://www.virustotal.com/api/v3/urls/{url_id}"
        req = urllib.request.Request(
            api_url,
            headers={"x-apikey": VT_API_KEY},
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read())

        stats = data.get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
        malicious  = stats.get("malicious", 0)
        suspicious = stats.get("suspicious", 0)
        harmless   = stats.get("harmless", 0)
        undetected = stats.get("undetected", 0)
        total      = malicious + suspicious + harmless + undetected

        return {
            "engines_detected": malicious + suspicious,
            "engines_total":    total,
            "malicious":        malicious,
            "suspicious":       suspicious,
            "harmless":         harmless,
            "undetected":       undetected,
            "vt_link":          f"https://www.virustotal.com/gui/url/{url_id}",
            "verdict":          "malicious" if malicious > 0 else "suspicious" if suspicious > 0 else "clean",
        }
    except urllib.error.HTTPError as e:
        if e.code == 404:
            # URL not yet in VT database — submit it
            return {"error": "URL not yet in VirusTotal database", "vt_link": "https://www.virustotal.com"}
        return {"error": f"VirusTotal API error: {e.code}"}
    except Exception as ex:
        return {"error": str(ex)}

# ─────────────────────────────────────────────
# KNOWN SAFE DOMAINS — never flag these
# ─────────────────────────────────────────────
SAFE_DOMAINS = {
    "google.com", "youtube.com", "facebook.com", "twitter.com", "x.com",
    "instagram.com", "linkedin.com", "github.com", "microsoft.com",
    "apple.com", "amazon.com", "wikipedia.org", "reddit.com", "netflix.com",
    "stackoverflow.com", "openai.com", "chatgpt.com", "bing.com",
    "yahoo.com", "whatsapp.com", "telegram.org", "zoom.us", "dropbox.com",
    "paypal.com", "ebay.com", "walmart.com", "adobe.com", "salesforce.com",
    "wordpress.com", "shopify.com", "stripe.com", "twitch.tv", "discord.com",
    "spotify.com", "pinterest.com", "tumblr.com", "quora.com", "medium.com",
    "nytimes.com", "bbc.com", "cnn.com", "reuters.com", "theguardian.com",
    "office.com", "live.com", "outlook.com", "hotmail.com", "gmail.com",
    "cloudflare.com", "amazonaws.com", "azure.com", "heroku.com",
    # Common tools & productivity
    "ilovepdf.com", "smallpdf.com", "canva.com", "figma.com", "notion.so",
    "trello.com", "slack.com", "atlassian.com", "jira.com", "confluence.com",
    "drive.google.com", "docs.google.com", "sheets.google.com",
    "forms.google.com", "meet.google.com", "calendar.google.com",
    "maps.google.com", "play.google.com", "accounts.google.com",
    # Dev & tech
    "npmjs.com", "pypi.org", "docker.com", "vercel.com", "netlify.com",
    "digitalocean.com", "render.com", "railway.app", "supabase.com",
    "mongodb.com", "postgresql.org", "mysql.com",
    "w3schools.com", "mdn.mozilla.org", "developer.mozilla.org",
    "reactjs.org", "vuejs.org", "angular.io", "nodejs.org", "python.org",
    # Shopping & finance
    "flipkart.com", "myntra.com", "snapdeal.com", "paytm.com",
    "phonepe.com", "gpay.com", "razorpay.com", "visa.com", "mastercard.com",
    # News & media
    "ndtv.com", "timesofindia.com", "thehindu.com", "indiatimes.com",
    "hindustantimes.com", "indianexpress.com", "techcrunch.com",
    "theverge.com", "wired.com", "arstechnica.com",
    # Cloud & email
    "icloud.com", "protonmail.com", "proton.me", "tutanota.com",
    "godaddy.com", "namecheap.com", "bluehost.com",
}

# ─────────────────────────────────────────────
# PHISHING KEYWORDS
# ─────────────────────────────────────────────
PHISHING_KEYWORDS = [
    "verify", "verification", "validate", "confirm",
    "secure", "security", "signin", "sign-in",
    "password", "credential", "billing",
    "suspend", "suspended", "locked", "unlock", "alert",
    "urgent", "immediately", "expire", "expired",
    "wellsfargo", "chase", "citibank",
    "webscr", "dispatch",
]

# ─────────────────────────────────────────────
# SUSPICIOUS TLDs
# ─────────────────────────────────────────────
SUSPICIOUS_TLDS = {
    "fake", "phish", "xyz", "tk", "ml", "ga", "cf", "gq",
    "top", "click", "link", "work", "date", "racing", "download",
    "stream", "gdn", "bid", "win", "loan", "men", "accountant",
}

# ─────────────────────────────────────────────
# BRAND NAMES (for spoofing detection)
# ─────────────────────────────────────────────
BRANDS = [
    "paypal", "ebay", "amazon", "apple", "microsoft", "google",
    "facebook", "instagram", "netflix", "bank", "chase", "wellsfargo",
    "citibank", "hsbc", "barclays", "twitter", "whatsapp", "youtube",
    "linkedin", "dropbox", "spotify", "discord", "zoom",
]

# ─────────────────────────────────────────────
# TYPOSQUATTING MAP
# ─────────────────────────────────────────────
TYPOSQUAT_MAP = {
    "paypal":    ["paypa1", "paypai", "paypa-l", "paypall"],
    "google":    ["g00gle", "go0gle", "googie", "g0ogle", "gooogle"],
    "amazon":    ["arnazon", "amaz0n", "amazom", "amzon", "amazoon"],
    "microsoft": ["rn1crosoft", "micros0ft", "microsofl", "microsofft"],
    "apple":     ["app1e", "appie", "appl3"],
    "facebook":  ["faceb00k", "facebok", "faceboook"],
    "netflix":   ["netfl1x", "netfiix", "netfllx"],
    "ebay":      ["ebay1", "3bay", "ebayy"],
    "instagram": ["1nstagram", "instagran", "instagramm"],
    "twitter":   ["tw1tter", "twltter", "twitterr"],
}

_IPv4_RE = re.compile(r"^(\d{1,3}\.){3}\d{1,3}$")
_URL_RE  = re.compile(r"^https?://", re.IGNORECASE)


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def get_root_domain(hostname):
    ext = _tld_extract(hostname)
    return f"{ext.domain}.{ext.suffix}".lower()


def is_safe_domain(hostname):
    return get_root_domain(hostname) in SAFE_DOMAINS


def is_typosquat(domain):
    d = domain.lower()
    for brand, typos in TYPOSQUAT_MAP.items():
        if d in typos:
            return brand
    return None


def _build_features(url, signals, probability, is_phishing):
    return {
        "URL Length":          len(url),
        "Uses HTTPS":          "Yes" if url.lower().startswith("https") else "No",
        "IP Address as Host":  signals.get("IP Address as Host", "No"),
        "Has @ Symbol":        signals.get("@ Symbol", "No"),
        "Suspicious TLD":      signals.get("Suspicious TLD", "No"),
        "Brand Spoofing":      signals.get("Brand Spoofing", "None"),
        "Fake Domain Embed":   signals.get("Fake Domain Embed", "None"),
        "Typosquatting":       signals.get("Typosquatting", "None"),
        "Hyphens in Domain":   signals.get("Hyphens", "0"),
        "Subdomain Depth":     signals.get("Subdomain Depth", "0"),
        "Encoded Chars (%xx)": signals.get("Encoded Chars", "0"),
        "Phishing Keywords":   signals.get("Keywords", "None"),
        "Risk Score":          f"{probability}/100",
        "Verdict":             "PHISHING" if is_phishing else "LEGITIMATE",
    }


# ─────────────────────────────────────────────
# CORE DETECTION ENGINE
# ─────────────────────────────────────────────

def detect_phishing(url):
    """
    Multi-signal phishing detection.
    Returns: (is_phishing: bool, probability: int, reasons: list, features: dict)
    """
    # Validate URL format
    if not url or len(url) > 2048:
        return True, 90, ["Invalid or oversized URL"], _build_features(url or "", {}, 90, True)

    try:
        parsed = urlparse(url if "://" in url else "http://" + url)
    except Exception:
        return True, 90, ["Malformed URL"], _build_features(url, {}, 90, True)

    hostname  = (parsed.hostname or "").lower()
    url_lower = url.lower()
    ext       = _tld_extract(hostname)
    domain    = ext.domain or ""
    subdomain = ext.subdomain or ""
    suffix    = ext.suffix or ""

    # ── INSTANT SAFE: known trusted domain ──────────────────
    if is_safe_domain(hostname):
        feats = _build_features(url, {}, 0, False)
        return False, 0, ["Trusted domain — no threats detected"], feats

    score        = 0
    reasons      = []
    signals      = {}
    keyword_hits = []

    # ── SIGNAL 1: IP address as host ────────────────────────
    if _IPv4_RE.match(hostname.split(":")[0]):
        score += 40
        reasons.append("Uses IP address instead of a domain name")
        signals["IP Address as Host"] = "Yes"

    # ── SIGNAL 2: Suspicious TLD ────────────────────────────
    if suffix.lower() in SUSPICIOUS_TLDS:
        score += 35
        reasons.append(f"Suspicious domain extension (.{suffix})")
        signals["Suspicious TLD"] = f".{suffix}"

    # ── SIGNAL 3: Brand name in subdomain (spoofing) ─────────
    for brand in BRANDS:
        if brand in subdomain.lower() and brand not in domain.lower():
            score += 45
            reasons.append(f"Brand '{brand}' used in subdomain to spoof real site")
            signals["Brand Spoofing"] = brand
            break

    # ── SIGNAL 4: brand.com embedded in subdomain ────────────
    for brand in BRANDS:
        if f"{brand}.com" in subdomain.lower() or f"{brand}.net" in subdomain.lower():
            score += 50
            reasons.append(f"Fake '{brand}.com' embedded in subdomain")
            signals["Fake Domain Embed"] = f"{brand}.com in subdomain"
            break

    # ── SIGNAL 5: Typosquatting ──────────────────────────────
    typo_brand = is_typosquat(domain)
    if typo_brand:
        score += 45
        reasons.append(f"Domain looks like a typo of '{typo_brand}' (typosquatting)")
        signals["Typosquatting"] = f"Looks like '{typo_brand}'"

    # ── SIGNAL 6: Phishing keywords ─────────────────────────
    for kw in PHISHING_KEYWORDS:
        if kw in url_lower:
            keyword_hits.append(kw)
    if keyword_hits:
        score += min(len(keyword_hits) * 15, 40)
        reasons.append(f"Phishing keywords detected: {', '.join(keyword_hits[:4])}")
        signals["Keywords"] = ", ".join(keyword_hits[:4])

    # ── SIGNAL 7: @ symbol ──────────────────────────────────
    if "@" in url:
        score += 40
        reasons.append("URL contains '@' symbol (browser obfuscation trick)")
        signals["@ Symbol"] = "Yes"

    # ── SIGNAL 8: Excessive hyphens ─────────────────────────
    hyphen_count = domain.count("-") + subdomain.count("-")
    if hyphen_count >= 3:
        score += 20
        reasons.append(f"Domain has {hyphen_count} hyphens (common in phishing)")
        signals["Hyphens"] = str(hyphen_count)
    elif hyphen_count >= 2:
        score += 10
        signals["Hyphens"] = str(hyphen_count)
    elif hyphen_count == 1:
        score += 0
        signals["Hyphens"] = "1"

    # ── SIGNAL 9: Too many subdomains ───────────────────────
    sub_parts = [s for s in subdomain.split(".") if s]
    if len(sub_parts) >= 4:
        score += 20
        reasons.append(f"Excessive subdomains ({len(sub_parts)}) used to hide real domain")
        signals["Subdomain Depth"] = str(len(sub_parts))
    elif len(sub_parts) >= 3:
        score += 10
        signals["Subdomain Depth"] = str(len(sub_parts))
    elif len(sub_parts) == 2:
        score += 0
        signals["Subdomain Depth"] = "2"

    # ── SIGNAL 10: Very long URL ─────────────────────────────
    if len(url) > 200:
        score += 15
        reasons.append(f"Unusually long URL ({len(url)} chars)")
        signals["URL Length"] = str(len(url))
    elif len(url) > 150:
        score += 8
        signals["URL Length"] = str(len(url))

    # ── SIGNAL 11: Encoded characters ───────────────────────
    hex_count = len(re.findall(r"%[0-9a-fA-F]{2}", url))
    if hex_count > 8:
        score += 20
        reasons.append(f"Many encoded characters ({hex_count}) hiding real content")
        signals["Encoded Chars"] = str(hex_count)
    elif hex_count > 4:
        score += 10
        signals["Encoded Chars"] = str(hex_count)

    # ── SIGNAL 12: No HTTPS ─────────────────────────────────
    if parsed.scheme.lower() != "https":
        score += 8
        reasons.append("Not using HTTPS (insecure connection)")
        signals["HTTPS"] = "No"
    else:
        signals["HTTPS"] = "Yes"

    # ── SIGNAL 13: Numeric domain ────────────────────────────
    if domain.isdigit():
        score += 25
        reasons.append("Domain is purely numeric")
        signals["Numeric Domain"] = "Yes"

    # ── DECISION ─────────────────────────────────────────────
    probability = min(score, 100)
    is_phishing = score >= 55  # Raised threshold — requires multiple strong signals

    if not reasons:
        reasons.append("No suspicious patterns detected")

    return is_phishing, probability, reasons, _build_features(url, signals, probability, is_phishing)


# ─────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────

@app.route("/")
def home():
    return jsonify({
        "status":  "success",
        "message": "✅ PhishGuard API is running",
        "version": "2.0",
    })


@app.route("/predict", methods=["GET", "POST"])
@limiter.limit("60 per minute")
def predict():
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        url  = (data.get("url") or "").strip()
    else:
        url = (request.args.get("url") or "").strip()

    if not url:
        return jsonify({"status": "error", "message": "No URL provided"}), 400

    # Basic format validation
    if len(url) > 2048:
        return jsonify({"status": "error", "message": "URL too long"}), 400

    try:
        is_phishing, probability, reasons, features = detect_phishing(url)
        prediction = "phishing" if is_phishing else "legitimate"
        reason     = "; ".join(reasons[:3])
        print(f"{'🚨' if is_phishing else '✅'} {url[:80]} → {prediction} ({probability}%)")
        return jsonify({
            "status":      "success",
            "url":         url,
            "prediction":  prediction,
            "probability": probability,
            "reason":      reason,
            "features":    features,
        })
    except Exception as e:
        # Never expose internal errors to client
        print(f"❌ Internal error for {url[:80]}: {e}")
        return jsonify({"status": "error", "message": "Analysis failed"}), 500


@app.route("/report", methods=["POST"])
@limiter.limit("10 per minute")
def report():
    data   = request.get_json(silent=True) or {}
    url    = (data.get("url") or "").strip()
    reason = (data.get("reason") or "User reported phishing").strip()[:500]

    if not url or len(url) > 2048:
        return jsonify({"status": "error", "message": "Invalid URL"}), 400

    entry = {
        "url":       url,
        "reason":    reason,
        "timestamp": datetime.utcnow().isoformat(),
        "ip":        get_remote_address(),
    }
    try:
        rfile   = "backend/reports.json" if os.path.exists("backend") else "reports.json"
        reports = json.load(open(rfile)) if os.path.exists(rfile) else []
        reports.append(entry)
        json.dump(reports, open(rfile, "w"), indent=2)
        print(f"📩 Report stored: {url[:80]}")
        return jsonify({"status": "success", "message": "Report stored"})
    except Exception as e:
        print(f"❌ Report error: {e}")
        return jsonify({"status": "error", "message": "Failed to store report"}), 500


@app.route("/virustotal", methods=["POST"])
@limiter.limit("10 per minute")
def virustotal_route():
    data = request.get_json(silent=True) or {}
    url  = (data.get("url") or "").strip()
    if not url or len(url) > 2048:
        return jsonify({"status": "error", "message": "Invalid URL"}), 400
    result = virustotal_check(url)
    return jsonify({"status": "success", "virustotal": result})


@app.errorhandler(429)
def rate_limit_handler(e):
    return jsonify({"status": "error", "message": "Too many requests. Slow down."}), 429


@app.errorhandler(404)
def not_found(e):
    return jsonify({"status": "error", "message": "Endpoint not found"}), 404


if __name__ == "__main__":
    print("🚀 PhishGuard running on http://127.0.0.1:5000")
    app.run(debug=False, host="127.0.0.1", port=5000)
