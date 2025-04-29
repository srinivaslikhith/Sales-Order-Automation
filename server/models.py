# server/models.py
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Order(db.Model):
    id        = db.Column(db.Integer, primary_key=True)
    filename  = db.Column(db.String, nullable=False)
    header    = db.Column(db.JSON, nullable=False)   # requestId, poDate, etc.
    line_items= db.Column(db.JSON, nullable=False)   # full lineItems payload
    timestamp = db.Column(db.DateTime, server_default=db.func.now())