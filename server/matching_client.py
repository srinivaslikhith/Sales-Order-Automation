import os
import requests

# Base URL of your Matching API; override via env var if needed
MATCH_API_URL = os.getenv('MATCHING_API_URL', 'https://endeavor-interview-api-gzwki.ondigitalocean.app')

def match_items(raw_lines: list[str]) -> list[list[dict]]:
    """
    Sends the list of raw line-item strings to your Matching API.
    Uses POST /match/batch to retrieve suggestions.
    """
    # The API expects {"queries": [ "string1", "string2", ... ]}
    # raw_lines may be list of dicts, so extract the "Request Item" field if present
    queries = [
        li['Request Item'] if isinstance(li, dict) and 'Request Item' in li else li
        for li in raw_lines
    ]
    payload = {'queries': queries}
    resp = requests.post(f'{MATCH_API_URL}/match/batch', json=payload)
    resp.raise_for_status()
    data = resp.json()
    print("DEBUG match_items response:", data)
    # 'results' is a dict mapping each query to its list of matches
    results = data.get('results', {})
    suggestions = [results.get(q, []) for q in queries]
    return suggestions