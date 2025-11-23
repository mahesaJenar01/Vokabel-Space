import os
import json
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app) # Enable CORS for Frontend communication

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LIBRARY_PATH = os.path.join(BASE_DIR, 'data', 'library.json')
USER_DATA_PATH = os.path.join(BASE_DIR, 'userdata', 'user_performance.json')

def load_json(path):
    if not os.path.exists(path):
        return {}
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

@app.route('/api/library', methods=['GET'])
def get_library():
    data = load_json(LIBRARY_PATH)
    return jsonify(data)

@app.route('/api/user-performance', methods=['GET'])
def get_user_performance():
    data = load_json(USER_DATA_PATH)
    # Ensure default structure if file is empty or corrupt
    if not data:
        data = {
            "progress": {},
            "lastSessionDate": "",
            "dailyUniqueWords": []
        }
    return jsonify(data)

@app.route('/api/user-performance', methods=['POST'])
def save_user_performance():
    new_state = request.json
    save_json(USER_DATA_PATH, new_state)
    return jsonify({"status": "success", "message": "Performance saved"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)