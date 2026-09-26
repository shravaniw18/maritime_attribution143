import json
import urllib.request
import urllib.parse
import sys

BASE_URL = "http://127.0.0.1:8000"

CASE_IDS = [
    "case_01_gulf_mexico",
    "case_02_ennore_india",
    "case_03_synthetic_eval",
    "case_04_malacca_strait",
    "case_05_mumbai_high",
    "case_06_bay_of_bengal_sagar"
]

def make_request(url, method="GET", data=None):
    headers = {'Content-Type': 'application/json'} if data else {}
    req_body = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(url, data=req_body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            body_text = resp.read().decode('utf-8')
            try:
                body_json = json.loads(body_text)
            except Exception:
                body_json = body_text
            return status, body_json
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        try:
            err_json = json.loads(err_body)
        except Exception:
            err_json = err_body
        return e.code, err_json
    except Exception as e:
        return 500, str(e)

def run_tests():
    results = {}
    print("=== GET /api/cases ===")
    status, cases = make_request(f"{BASE_URL}/api/cases")
    results["GET /api/cases"] = {"status": status, "response": cases}
    print(f"Status: {status}, Count: {len(cases) if isinstance(cases, list) else cases}")

    per_case_endpoints = [
        "/api/cases/{case_id}",
        "/api/detection/{case_id}",
        "/api/drift/{case_id}",
        "/api/drift/{case_id}/forward-prediction",
        "/api/drift/{case_id}/combined",
        "/api/attribution/{case_id}",
        "/api/ais/candidates/{case_id}",
        "/api/report/{case_id}"
    ]

    case_data = {}
    for cid in CASE_IDS:
        print(f"\n--- Testing Case: {cid} ---")
        case_data[cid] = {}
        for ep_template in per_case_endpoints:
            ep = ep_template.format(case_id=cid)
            status, resp = make_request(f"{BASE_URL}{ep}")
            case_data[cid][ep_template] = {"status": status, "response": resp}
            print(f"  {ep}: Status {status}")

    results["per_case"] = case_data

    print("\n--- Additional POST & Specific Tests ---")
    c1 = "case_01_gulf_mexico"
    
    # POST /api/drift/{case_id}/re-simulate
    ep = f"/api/drift/{c1}/re-simulate"
    post_data = {"num_particles": 500, "simulation_hours": 24}
    status, resp = make_request(f"{BASE_URL}{ep}", method="POST", data=post_data)
    results["POST re-simulate"] = {"status": status, "response": resp}
    print(f"  POST {ep}: Status {status}")

    # POST /api/attribution/{case_id}/recompute
    ep = f"/api/attribution/{c1}/recompute"
    post_data = {
        "spatial": 0.4,
        "temporal": 0.2,
        "trajectory": 0.2,
        "anomaly": 0.1,
        "vessel_type": 0.1
    }
    status, resp = make_request(f"{BASE_URL}{ep}", method="POST", data=post_data)
    results["POST recompute"] = {"status": status, "response": resp}
    print(f"  POST {ep}: Status {status}")

    # POST /api/attribution/{case_id}/review
    ep = f"/api/attribution/{c1}/review"
    # Find first candidate MMSI
    cand_resp = case_data[c1]["/api/ais/candidates/{case_id}"]["response"]
    first_mmsi = None
    if isinstance(cand_resp, list) and len(cand_resp) > 0:
        first_mmsi = cand_resp[0].get("mmsi")
    elif isinstance(cand_resp, dict) and "candidates" in cand_resp and len(cand_resp["candidates"]) > 0:
        first_mmsi = cand_resp["candidates"][0].get("mmsi")
    
    review_mmsi = first_mmsi or 367123450
    post_data = {
        "mmsi": review_mmsi,
        "flag": "SUSPECT",
        "notes": "Verification test review"
    }
    status, resp = make_request(f"{BASE_URL}{ep}", method="POST", data=post_data)
    results["POST review"] = {"status": status, "response": resp}
    print(f"  POST {ep}: Status {status}, MMSI used: {review_mmsi}")

    # GET /api/ais/vessels/{mmsi}/risk-profile
    ep = f"/api/ais/vessels/{review_mmsi}/risk-profile"
    status, resp = make_request(f"{BASE_URL}{ep}")
    results["GET risk-profile"] = {"status": status, "response": resp}
    print(f"  GET {ep}: Status {status}")

    # GET /api/report/{case_id}/markdown
    ep = f"/api/report/{c1}/markdown"
    status, resp = make_request(f"{BASE_URL}{ep}")
    results["GET report markdown"] = {"status": status, "response": resp}
    print(f"  GET {ep}: Status {status}")

    with open("api_verification_results.json", "w") as f:
        json.dump(results, f, indent=2)
    print("\nSaved all API responses to api_verification_results.json")

if __name__ == "__main__":
    run_tests()
