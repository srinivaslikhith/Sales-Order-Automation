# Sales Order Automation MVP

A minimal full-stack app to automate Sales Order (SO) processing:
- PDF upload → line-item extraction → product catalog matching → user verification → CSV export
- Backend: Flask + SQLite  
- Frontend: React + Ant Design

---

## Features

- **Drag-and-drop PDF upload**  
- **Line-item extraction** via external PDF-Extraction API  
- **Automated product matching** via Matching API  
- **Human-in-the-loop UI**  
  - Inline dropdowns to correct product matches  
  - Modal editor for deeper edits  
- **Export finalized orders** as CSV  
- **Persistence & history** (SQLite) for revisiting past orders  

---

## Tech Stack

- **Backend:**  
  - Python 3.11, Flask, Flask-CORS, Flask-SQLAlchemy  
  - `pdf_extraction_client.py` wraps PDF-Extraction API  
  - `matching_client.py` wraps Matching API  
  - SQLite for order storage (`orders.db`)  
- **Frontend:**  
  - React (Create-React-App)  
  - Ant Design components  
  - Axios for HTTP  
  - PapaParse for CSV export  

---

## Setup & Run

### 1. Backend

```bash
cd server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt   # Flask, flask-cors, flask-sqlalchemy, requests

# Start on port 8002
export FLASK_APP=app.py
export FLASK_ENV=development
python3 app.py