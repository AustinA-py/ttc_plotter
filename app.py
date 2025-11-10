"""
TTC Plotter - Flask Web Application
A tool for creating temporary traffic control pattern maps
"""

from flask import Flask, render_template, jsonify, request
import json

app = Flask(__name__)
app.secret_key = 'ttc-plotter-secret-key-change-in-production'

# Configuration
app.config['DEBUG'] = True

@app.route('/')
def index():
    """Main application page with interactive map"""
    return render_template('index.html')

@app.route('/api/save-pattern', methods=['POST'])
def save_pattern():
    """Save a traffic control pattern to the server"""
    try:
        pattern_data = request.get_json()
        
        # For now, just return success - could save to database later
        # TODO: Implement pattern saving functionality
        
        return jsonify({
            'success': True,
            'message': 'Pattern saved successfully',
            'pattern_id': 'temp_id_123'
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error saving pattern: {str(e)}'
        }), 500

@app.route('/api/load-patterns', methods=['GET'])
def load_patterns():
    """Load saved traffic control patterns"""
    try:
        # For now, return empty list - could load from database later
        # TODO: Implement pattern loading functionality
        
        return jsonify({
            'success': True,
            'patterns': []
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error loading patterns: {str(e)}'
        }), 500

@app.route('/api/export-pattern', methods=['POST'])
def export_pattern():
    """Export a traffic control pattern as various formats"""
    try:
        pattern_data = request.get_json()
        export_format = pattern_data.get('format', 'json')
        
        # TODO: Implement export functionality (PDF, DXF, etc.)
        
        return jsonify({
            'success': True,
            'message': f'Pattern exported as {export_format}',
            'download_url': '/download/pattern.json'
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error exporting pattern: {str(e)}'
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)