from flask import Flask, request, jsonify, send_file
from flask_cors import CORS, cross_origin
from models import db, Order
import io, csv, tempfile, os

import pdf_extraction_client
import matching_client
from requests.exceptions import HTTPError

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI']      = 'sqlite:///orders.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

CORS(app, resources={r"/api/*": {"origins": "*"}})
db.init_app(app)

# Create tables on startup instead of using before_first_request
with app.app_context():
    db.create_all()


@app.route('/api/upload', methods=['POST'])
@cross_origin(origin='*')
def upload():
    pdf_file = request.files.get('file')
    if not pdf_file:
        return jsonify({'error': 'No file uploaded'}), 400

    # 1) Save to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
        pdf_path = tmp.name
        pdf_file.save(pdf_path)

    try:
        original_name = pdf_file.filename

        try:
            raw_lines = pdf_extraction_client.extract_line_items(pdf_path, original_name)
        except HTTPError as e:
            print("Line-items API error:", e, e.response.text)
            return jsonify({'error': 'Line-item extraction failed', 'details': e.response.text}), 502

        try:
            suggestions = matching_client.match_items(raw_lines)
        except HTTPError as e:
            print("Matching API error:", e, e.response.text)
            return jsonify({'error': 'Matching API failed', 'details': e.response.text}), 502

        # 4) Build payload
        line_items = []
        for line, sugg in zip(raw_lines, suggestions):
            line_items.append({
                'original':    line,
                'suggestions': sugg
            })

        # 5) Persist
        order = Order(
            filename=pdf_file.filename,
            header={},
            line_items=line_items
        )
        db.session.add(order)
        db.session.commit()

        # 6) Return
        return jsonify({'lineItems': line_items})

    finally:
        os.remove(pdf_path)


@app.route('/api/history', methods=['GET'])
@cross_origin(origin='*')
def history():
    orders = Order.query.order_by(Order.timestamp.desc()).all()
    return jsonify([
        {'id': o.id, 'filename': o.filename, 'timestamp': o.timestamp.isoformat()}
        for o in orders
    ])


@app.route('/api/reopen/<int:order_id>', methods=['GET'])
@cross_origin(origin='*')
def reopen(order_id):
    o = Order.query.get_or_404(order_id)
    return jsonify({'header': o.header, 'lineItems': o.line_items})


@app.route('/api/export/<int:order_id>', methods=['GET'])
@cross_origin(origin='*')
def export(order_id):
    o = Order.query.get_or_404(order_id)
    si = io.StringIO()
    writer = csv.writer(si)
    writer.writerow(['Original', 'Selection'])
    for li in o.line_items:
        sel_name = ''
        sel_id = li.get('selected')
        if sel_id:
            for s in li['suggestions']:
                if s['id'] == sel_id:
                    sel_name = s['name']
        writer.writerow([li['original'], sel_name])

    mem = io.BytesIO(si.getvalue().encode('utf-8'))
    mem.seek(0)
    return send_file(
        mem,
        as_attachment=True,
        download_name=f'order_{order_id}.csv',
        mimetype='text/csv'
    )


if __name__ == '__main__':
    # Listen on port 8002 instead of default 5000
    app.run(host='127.0.0.1', port=8002, debug=True)