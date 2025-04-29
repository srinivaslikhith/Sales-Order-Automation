import os
import requests
from typing import List, Dict, Any

# Base URL of your PDF Extraction API; override via env var if needed
PDF_API_URL = os.getenv('PDF_EXTRACTION_API_URL', 'https://plankton-app-qajlk.ondigitalocean.app')

def extract_header(pdf_path: str, filename: str) -> Dict[str, Any]:
    """
    Calls the PDF Extraction API to pull out header fields like:
      { requestId, address, poDate, poNumber }

    Returns a dict matching exactly what React expects in `header`.
    """
    with open(pdf_path, 'rb') as f:
        files = {'file': (filename, f, 'application/pdf')}
        resp = requests.post(f'{PDF_API_URL}/extraction_api', files=files)
        resp.raise_for_status()
        data = resp.json()
        print("DEBUG extract_header response:", data)
        return data.get('header', {})

def extract_line_items(pdf_path: str, filename: str) -> List[str]:
    """
    Calls the PDF Extraction API to extract raw line-item strings.
    Returns a list of strings, e.g.:
      ["Item A x2", "Item B x5", …]
    """
    with open(pdf_path, 'rb') as f:
        files = {'file': (filename, f, 'application/pdf')}
        resp = requests.post(f'{PDF_API_URL}/extraction_api', files=files)
        resp.raise_for_status()
        data = resp.json()
        print("DEBUG extract_line_items response:", data)
        return data