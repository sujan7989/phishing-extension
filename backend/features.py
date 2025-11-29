import re
import math
from urllib.parse import urlparse, parse_qs
import tldextract

# Regex to detect IPv4 addresses in hostnames
_IPv4_RE = re.compile(r"^(?:\d{1,3}\.){3}\d{1,3}$")

# Regex for detecting hex patterns (e.g., encoded payloads in phishing URLs)
_HEX_RE = re.compile(r"%[0-9a-fA-F]{2}")

# Common suspicious keywords in phishing URLs
SUSPICIOUS = [
    "login", "verify", "update", "secure", "bank", "confirm",
    "account", "password", "free", "gift", "card", "pay", "paypal",
    "signin", "ebay", "amazon", "wallet", "support"
]


def _shannon_entropy(data: str) -> float:
    """Calculate Shannon entropy of a string (higher = more random)."""
    if not data:
        return 0.0
    prob = [float(data.count(c)) / len(data) for c in set(data)]
    return -sum(p * math.log(p, 2) for p in prob)


def extract_features(url: str) -> dict:
    """Extract handcrafted features from a given URL."""

    # Normalize URL (ensure scheme exists)
    try:
        p = urlparse(url if "://" in url else "http://" + url)
    except Exception:
        p = urlparse("http://" + str(url))

    host = p.netloc or ""
    path = p.path or ""
    query = p.query or ""

    # Extract domain, subdomain, suffix
    tld = tldextract.extract(host)
    domain = tld.domain or ""
    subdomain = tld.subdomain or ""
    suffix = tld.suffix or ""

    # Numerical features
    num_params = len(parse_qs(query))
    num_digits = sum(ch.isdigit() for ch in url)
    num_special = sum(ch in "@-_?%./=&#" for ch in url)
    num_dots = url.count(".")
    num_slashes = url.count("/")
    num_hex = len(_HEX_RE.findall(url))
    entropy = _shannon_entropy(url)

    # Boolean features
    hyphen_in_domain = "-" in domain
    at_symbol = "@" in url
    has_https = (p.scheme.lower() == "https")
    is_ip = bool(_IPv4_RE.match(host.split(":")[0]))

    # Suspicious keyword presence
    contains_suspicious = int(any(k in url.lower() for k in SUSPICIOUS))

    # Features dictionary
    features = {
        # Length-based
        "url_length": len(url),
        "host_length": len(host),
        "path_length": len(path),
        "query_length": len(query),

        # Structural
        "num_params": num_params,
        "num_digits": num_digits,
        "num_special_chars": num_special,
        "num_subdomains": len([s for s in subdomain.split(".") if s]) if subdomain else 0,
        "num_dots": num_dots,
        "num_slashes": num_slashes,
        "num_hex_chars": num_hex,
        "url_entropy": round(entropy, 3),

        # Boolean flags
        "hyphen_in_domain": int(hyphen_in_domain),
        "has_at_symbol": int(at_symbol),
        "has_https": int(has_https),
        "is_ip_in_host": int(is_ip),

        # Semantic
        "contains_suspicious_kw": contains_suspicious,

        # Extra (useful for ML)
        "domain_length": len(domain),
        "subdomain_length": len(subdomain),
        "suffix_length": len(suffix),
    }

    return features


def extract_reasons(url: str) -> list:
    """
    Extract human-readable reasons why a URL may be suspicious.
    Useful for frontend explanation.
    """
    feats = extract_features(url)
    reasons = []

    if feats["is_ip_in_host"]:
        reasons.append("Uses IP address instead of domain")
    if feats["contains_suspicious_kw"]:
        reasons.append("Contains suspicious keywords (e.g., login, verify, bank)")
    if feats["hyphen_in_domain"]:
        reasons.append("Domain contains hyphen (-)")
    if feats["has_at_symbol"]:
        reasons.append("URL contains '@' symbol")
    if feats["num_hex_chars"] > 2:
        reasons.append("Contains encoded characters (%xx)")
    if feats["url_entropy"] > 4.0:
        reasons.append("High randomness in URL structure")

    if not reasons:
        reasons.append("No obvious suspicious patterns detected")

    return reasons
