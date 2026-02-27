"""
HVAC Kazakhstan — Flask Web Application
High-conversion website for HVAC design, installation and maintenance in Kazakhstan.
"""

from flask import Flask, render_template, request, jsonify, redirect, url_for
from translations import get_translation, TRANSLATIONS

app = Flask(__name__)
app.config['SECRET_KEY'] = 'hvac-kz-secret-key-2026'


@app.route('/')
def index():
    """Main page — defaults to Russian."""
    return redirect(url_for('home', lang='ru'))


@app.route('/<lang>/')
def home(lang):
    """Render the main landing page in the specified language."""
    if lang not in TRANSLATIONS:
        lang = 'ru'
    t = get_translation(lang)
    return render_template('index.html', t=t, lang=lang)


@app.route('/api/submit-form', methods=['POST'])
def submit_form():
    """Handle lead capture form submission."""
    data = request.get_json() if request.is_json else request.form.to_dict()

    name = data.get('name', '').strip()
    phone = data.get('phone', '').strip()
    city = data.get('city', '').strip()
    object_type = data.get('object_type', '').strip()
    area = data.get('area', '').strip()

    if not name or not phone:
        return jsonify({'success': False, 'error': 'Name and phone are required'}), 400

    # In production, this would integrate with a CRM (Bitrix24, AmoCRM, etc.)
    # For now, log the lead
    print(f"[NEW LEAD] Name: {name}, Phone: {phone}, City: {city}, "
          f"Object: {object_type}, Area: {area}")

    return jsonify({'success': True, 'message': 'Form submitted successfully'})


@app.route('/api/callback', methods=['POST'])
def callback():
    """Handle callback request form submission."""
    data = request.get_json() if request.is_json else request.form.to_dict()

    name = data.get('name', '').strip()
    phone = data.get('phone', '').strip()

    if not phone:
        return jsonify({'success': False, 'error': 'Phone is required'}), 400

    print(f"[CALLBACK REQUEST] Name: {name}, Phone: {phone}")

    return jsonify({'success': True, 'message': 'Callback request received'})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
