import os
import re
import urllib.parse
import xml.etree.ElementTree as ET
import requests
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Cache for release notes
cached_notes = []
last_updated_time = None

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def clean_html(raw_html):
    # Remove HTML tags
    cleanr = re.compile('<.*?>')
    cleantext = re.sub(cleanr, '', raw_html)
    # Replace multiple spaces/newlines with single space
    cleantext = re.sub(r'\s+', ' ', cleantext).strip()
    return cleantext

def parse_release_notes(xml_content):
    try:
        root = ET.fromstring(xml_content)
    except Exception as e:
        print(f"Error parsing XML: {e}")
        return []

    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    parsed_entries = []

    # Atom feed entries
    for entry in root.findall('atom:entry', ns):
        title_elem = entry.find('atom:title', ns)
        date_str = title_elem.text.strip() if title_elem is not None else "Unknown Date"
        
        updated_elem = entry.find('atom:updated', ns)
        updated_val = updated_elem.text.strip() if updated_elem is not None else ""
        
        link_elem = entry.find("atom:link[@rel='alternate']", ns)
        link_href = link_elem.attrib['href'] if link_elem is not None else ""
        
        content_elem = entry.find('atom:content', ns)
        content_html = content_elem.text if content_elem is not None else ""
        
        # Split content by <h3> headers. Each header is the start of an update description.
        # Format of feed entries is usually: <h3>Feature</h3> <p>...</p> <h3>Issue</h3> <p>...</p> etc.
        # Regex matches <h3>[Type]</h3>[Content] up to next <h3> or end of content
        matches = re.findall(r'<h3>(.*?)</h3>(.*?)(?=<h3>|$)', content_html, re.DOTALL)
        
        if not matches:
            plain_text = clean_html(content_html)
            unique_id = f"{date_str.lower().replace(' ', '_').replace(',', '')}_general"
            parsed_entries.append({
                'id': unique_id,
                'date': date_str,
                'type': 'General',
                'content_html': content_html,
                'plain_text': plain_text,
                'link': link_href
            })
        else:
            for idx, (update_type, update_html) in enumerate(matches):
                u_type = update_type.strip()
                u_html = update_html.strip()
                plain_text = clean_html(u_html)
                unique_id = f"{date_str.lower().replace(' ', '_').replace(',', '').replace(':', '')}_{idx}_{u_type.lower()}"
                
                parsed_entries.append({
                    'id': unique_id,
                    'date': date_str,
                    'type': u_type,
                    'content_html': u_html,
                    'plain_text': plain_text,
                    'link': link_href
                })
                
    return parsed_entries

def fetch_notes():
    global cached_notes, last_updated_time
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(FEED_URL, headers=headers, timeout=10)
        if response.status_code == 200:
            cached_notes = parse_release_notes(response.content)
            from datetime import datetime
            last_updated_time = datetime.now().strftime("%I:%M:%S %p")
            return True
        else:
            print(f"Failed to fetch feed, status code: {response.status_code}")
            return False
    except Exception as e:
        print(f"Error fetching feed: {e}")
        return False

@app.route('/')
def index():
    if not cached_notes:
        fetch_notes()
    return render_template('index.html')

@app.route('/api/notes', methods=['GET'])
def get_notes():
    if not cached_notes:
        success = fetch_notes()
        if not success:
            return jsonify({'error': 'Failed to fetch release notes', 'notes': []}), 500
    return jsonify({
        'notes': cached_notes,
        'last_updated': last_updated_time
    })

@app.route('/api/refresh', methods=['POST'])
def refresh_notes():
    success = fetch_notes()
    if success:
        return jsonify({
            'success': True,
            'notes': cached_notes,
            'last_updated': last_updated_time
        })
    else:
        return jsonify({
            'success': False,
            'error': 'Failed to refresh release notes. Please try again.',
            'notes': cached_notes,
            'last_updated': last_updated_time
        }), 500

if __name__ == '__main__':
    # Run the server
    app.run(debug=True, port=5000)
