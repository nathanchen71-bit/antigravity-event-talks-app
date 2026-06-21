# BigQuery Release Notes Explorer & Twitter Composer

A web application built using Python Flask, plain vanilla HTML, JavaScript, and CSS that fetches the BigQuery release notes RSS feed, parses individual updates dynamically, and allows you to customize and share them directly on Twitter (X) using tone templates.

---

## Features

- **Dynamic XML Parsing & Caching:** Requests the official Google Cloud BigQuery Release Notes feed, splits grouped daily entries into individual entries by `<h3>` tags, cleans HTML tags for composing tweets, and caches feed data.
- **Glassmorphic Dark Theme:** Tailored dashboard styling using modern typography, sleek gradients, responsive design, and CSS transitions.
- **Search & Filters:** Real-time text search bar and quick filter pills by update type (`Feature`, `Announcement`, `Issue`, `Breaking`, `Change`, `General`).
- **Interactive Timeline:** Order updates chronologically (Ascending or Descending). Selecting any card highlights the entry and opens the composer.
- **Tone Composer:** Custom-crafted tone templates (`Concise`, `Hype`, `Technical`) with a live SVG character count progress ring, correctly budgeting standard Twitter URL standard lengths (23 characters).

---

## Getting Started

### Prerequisites

You need Python 3 installed on your machine. The app requires the following packages:
- `Flask`
- `requests`

### Installation

1. Clone or copy this project to your local directory:
   ```bash
   cd C:\Users\natha\agy-cli-projects\bigquery_release_notes
   ```

2. Install the dependencies:
   ```bash
   pip install flask requests
   ```

### Running the App

To start the local development server:

```bash
python app.py
```

After launching, navigate to **[http://127.0.0.1:5000](http://127.0.0.1:5000)** in your web browser.

---

## Directory Structure

```text
├── app.py                   # Flask server backend & RSS feed parser
├── .gitignore               # Exclusions for version control
├── README.md                # Project documentation
├── templates/
│   └── index.html           # Core HTML layout & dashboard controls
└── static/
    ├── css/
    │   └── styles.css       # Layout styles & responsive design
    └── js/
        └── app.js           # Client-side state engine & tweet composer
```
