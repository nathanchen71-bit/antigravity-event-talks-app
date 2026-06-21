// App State
let appState = {
    notes: [],
    filteredNotes: [],
    activeFilter: 'all',
    searchQuery: '',
    sortOrder: 'desc', // 'desc' or 'asc'
    selectedNote: null,
    activeTemplate: 'concise' // 'concise', 'hype', 'technical'
};

// SVG Circle circumference for character progress
const CIRCLE_RADIUS = 9;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS; // ~56.55

// DOM Elements
const elements = {
    updatesFeed: document.getElementById('updates-feed'),
    searchInput: document.getElementById('search-input'),
    clearSearch: document.getElementById('clear-search'),
    refreshBtn: document.getElementById('refresh-btn'),
    exportCsvBtn: document.getElementById('export-csv-btn'),
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    refreshSpinner: document.querySelector('.refresh-spinner'),
    lastUpdatedVal: document.getElementById('last-updated-val'),
    syncStatusVal: document.getElementById('sync-status-val'),
    totalUpdatesVal: document.getElementById('total-updates-val'),
    typeFilters: document.getElementById('type-filters'),
    sortDesc: document.getElementById('sort-desc'),
    sortAsc: document.getElementById('sort-asc'),
    loadingOverlay: document.getElementById('loading-overlay'),
    emptyState: document.getElementById('empty-state'),
    
    // Composer elements
    composerEmpty: document.getElementById('composer-empty'),
    composerFormContainer: document.getElementById('composer-form-container'),
    composerBadge: document.getElementById('composer-badge'),
    composerDate: document.getElementById('composer-date'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    charProgressCircle: document.getElementById('char-progress-circle'),
    charCountText: document.getElementById('char-count-text'),
    presetSummary: document.getElementById('preset-summary'),
    presetHype: document.getElementById('preset-hype'),
    presetTechnical: document.getElementById('preset-technical'),
    tweetSubmitBtn: document.getElementById('tweet-submit-btn'),
    toastContainer: document.getElementById('toast-container')
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Load saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
    }

    initProgressCircle();
    setupEventListeners();
    fetchNotes(false);
});

// Init circular progress indicator
function initProgressCircle() {
    elements.charProgressCircle.style.strokeDasharray = `${CIRCLE_CIRCUMFERENCE} ${CIRCLE_CIRCUMFERENCE}`;
    elements.charProgressCircle.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE;
}

// Set up UI Event Listeners
function setupEventListeners() {
    // Refresh button
    elements.refreshBtn.addEventListener('click', () => {
        fetchNotes(true);
    });

    // Export CSV button
    elements.exportCsvBtn.addEventListener('click', () => {
        exportToCSV();
    });

    // Theme toggle button
    elements.themeToggleBtn.addEventListener('click', () => {
        toggleTheme();
    });

    // Search input
    elements.searchInput.addEventListener('input', (e) => {
        appState.searchQuery = e.target.value.toLowerCase().strip();
        elements.clearSearch.style.display = appState.searchQuery ? 'block' : 'none';
        renderNotes();
    });

    elements.clearSearch.addEventListener('click', () => {
        elements.searchInput.value = '';
        appState.searchQuery = '';
        elements.clearSearch.style.display = 'none';
        elements.searchInput.focus();
        renderNotes();
    });

    // Filter pills
    elements.typeFilters.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            elements.typeFilters.querySelector('.filter-pill.active').classList.remove('active');
            pill.classList.add('active');
            appState.activeFilter = pill.getAttribute('data-type');
            renderNotes();
        });
    });

    // Sorting buttons
    elements.sortDesc.addEventListener('click', () => {
        elements.sortAsc.classList.remove('active');
        elements.sortDesc.classList.add('active');
        appState.sortOrder = 'desc';
        renderNotes();
    });

    elements.sortAsc.addEventListener('click', () => {
        elements.sortDesc.classList.remove('active');
        elements.sortAsc.classList.add('active');
        appState.sortOrder = 'asc';
        renderNotes();
    });

    // Composer input changes
    elements.tweetTextarea.addEventListener('input', () => {
        updateCharCount();
    });

    // Presets
    elements.presetSummary.addEventListener('click', () => selectPreset('concise'));
    elements.presetHype.addEventListener('click', () => selectPreset('hype'));
    elements.presetTechnical.addEventListener('click', () => selectPreset('technical'));

    // Tweet send
    elements.tweetSubmitBtn.addEventListener('click', sendTweet);
}

// String polyfill helper
String.prototype.strip = function() {
    return this.replace(/^\s+|\s+$/g, '');
};

// API: Fetch Release Notes
async function fetchNotes(isRefresh = false) {
    showLoading(true);
    if (isRefresh) {
        elements.refreshSpinner.classList.add('spinning');
    }

    try {
        const url = isRefresh ? '/api/refresh' : '/api/notes';
        const method = isRefresh ? 'POST' : 'GET';
        
        const response = await fetch(url, { method });
        const data = await response.json();
        
        if (response.ok) {
            appState.notes = data.notes;
            elements.lastUpdatedVal.textContent = data.last_updated;
            elements.totalUpdatesVal.textContent = data.notes.length;
            updateSyncStatusUI(data.sync_status);
            
            showToast(isRefresh ? 'Successfully refreshed notes!' : 'Notes loaded successfully', 'success');
            renderNotes();
        } else {
            showToast(data.error || 'Failed to fetch release notes', 'error');
            updateSyncStatusUI('failed');
        }
    } catch (err) {
        console.error(err);
        showToast('Network error while retrieving release notes', 'error');
        updateSyncStatusUI('failed');
    } finally {
        showLoading(false);
        elements.refreshSpinner.classList.remove('spinning');
    }
}

// Show/Hide Loading overlay
function showLoading(isLoading) {
    elements.loadingOverlay.style.display = isLoading ? 'flex' : 'none';
}

// Helper: Format Type Badges
function getTypeBadgeClass(type) {
    const t = type.toLowerCase();
    if (t.includes('feature')) return 'badge-feature';
    if (t.includes('announcement')) return 'badge-announcement';
    if (t.includes('issue')) return 'badge-issue';
    if (t.includes('breaking')) return 'badge-breaking';
    if (t.includes('change')) return 'badge-change';
    return 'badge-general';
}

// Render release notes to feed
function renderNotes() {
    // 1. Filter
    let filtered = appState.notes.filter(note => {
        const matchesType = appState.activeFilter === 'all' || note.type === appState.activeFilter;
        
        const matchesSearch = !appState.searchQuery || 
            note.date.toLowerCase().includes(appState.searchQuery) ||
            note.type.toLowerCase().includes(appState.searchQuery) ||
            note.plain_text.toLowerCase().includes(appState.searchQuery);
            
        return matchesType && matchesSearch;
    });

    // 2. Sort
    filtered.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return appState.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    appState.filteredNotes = filtered;

    // Render HTML
    if (filtered.length === 0) {
        elements.updatesFeed.innerHTML = '';
        elements.emptyState.style.display = 'block';
        return;
    }

    elements.emptyState.style.display = 'none';

    const cardsHtml = filtered.map(note => {
        const isSelected = appState.selectedNote && appState.selectedNote.id === note.id;
        const badgeClass = getTypeBadgeClass(note.type);
        
        return `
            <div class="note-card ${isSelected ? 'selected' : ''}" data-id="${note.id}">
                <div class="card-header">
                    <span class="badge ${badgeClass}">${note.type}</span>
                    <span class="card-date"><i class="fa-regular fa-calendar-days"></i> ${note.date}</span>
                    <button class="card-copy-btn" data-id="${note.id}" title="Copy to clipboard">
                        <i class="fa-regular fa-copy"></i>
                    </button>
                </div>
                <div class="card-content">
                    ${note.content_html}
                </div>
            </div>
        `;
    }).join('');

    elements.updatesFeed.innerHTML = cardsHtml;

    // Attach click listeners to cards
    elements.updatesFeed.querySelectorAll('.note-card').forEach(card => {
        card.addEventListener('click', () => {
            const noteId = card.getAttribute('data-id');
            const note = appState.notes.find(n => n.id === noteId);
            if (note) {
                handleCardSelection(note);
            }
        });
    });

    // Attach click listeners to copy buttons
    elements.updatesFeed.querySelectorAll('.card-copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Stop click from selecting the card
            const noteId = btn.getAttribute('data-id');
            const note = appState.notes.find(n => n.id === noteId);
            if (note) {
                navigator.clipboard.writeText(note.plain_text)
                    .then(() => showToast('Copied update to clipboard!', 'success'))
                    .catch(err => {
                        console.error(err);
                        showToast('Failed to copy', 'error');
                    });
            }
        });
    });
}

// Select a release note card and open the Composer
function handleCardSelection(note) {
    // Highlight correct card
    elements.updatesFeed.querySelectorAll('.note-card').forEach(card => {
        if (card.getAttribute('data-id') === note.id) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });

    appState.selectedNote = note;
    
    // Update Composer Sidebar View
    elements.composerEmpty.style.display = 'none';
    elements.composerFormContainer.style.display = 'flex';
    
    elements.composerBadge.textContent = note.type;
    elements.composerBadge.className = `badge ${getTypeBadgeClass(note.type)}`;
    elements.composerDate.textContent = note.date;

    // Build the default tweet
    selectPreset(appState.activeTemplate);
}

// Handle switching between presets/templates
function selectPreset(type) {
    appState.activeTemplate = type;
    
    // Toggle active preset button styles
    elements.presetSummary.classList.toggle('active', type === 'concise');
    elements.presetHype.classList.toggle('active', type === 'hype');
    elements.presetTechnical.classList.toggle('active', type === 'technical');

    if (!appState.selectedNote) return;

    const tweetText = generateTweetText(appState.selectedNote, type);
    elements.tweetTextarea.value = tweetText;
    updateCharCount();
}

// Pre-fill templates with smart truncation
function generateTweetText(note, templateType) {
    const link = note.link;
    const date = note.date;
    const type = note.type;
    const plainText = note.plain_text;

    // Twitter limit: 280. 
    // Treat links as 23 chars (standard Twitter shortener t.co length).
    // So we calculate text limit: 280 - 23 (for link) - spacers/formatting.
    const linkLengthBudget = 23;
    let prefix = '';
    let suffix = `\n\n🔗 ${link}`;
    
    if (templateType === 'hype') {
        prefix = `🔥 BigQuery ${type} (${date}): `;
    } else if (templateType === 'technical') {
        prefix = `[BigQuery Update] ${date} | ${type}\n\n`;
    } else {
        // Concise
        prefix = `BigQuery ${type} (${date}): `;
    }

    const overhead = prefix.length + suffix.length + 3; // +3 for "..." if truncated
    const maxDescLength = 280 - (prefix.length + linkLengthBudget + 10); // leave buffer
    
    let descriptionText = plainText;
    if (descriptionText.length > maxDescLength) {
        descriptionText = descriptionText.substring(0, maxDescLength) + '...';
    }

    return `${prefix}${descriptionText}${suffix}`;
}

// Update the progress circle and character counter text
function updateCharCount() {
    const text = elements.tweetTextarea.value;
    
    // Twitter links are shortened to 23 characters regardless of length.
    // Let's accurately calculate length based on X link shortening.
    let length = text.length;
    
    // Regex for URLs
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    
    urls.forEach(url => {
        length = length - url.length + 23; // Subtract actual url length, add standard 23
    });

    const charactersLeft = 280 - length;
    elements.charCountText.textContent = charactersLeft;

    if (charactersLeft < 0) {
        elements.charCountText.style.color = '#ef4444'; // Red
        elements.tweetSubmitBtn.disabled = true;
        elements.tweetSubmitBtn.style.opacity = 0.5;
        elements.tweetSubmitBtn.style.cursor = 'not-allowed';
    } else {
        elements.charCountText.style.color = 'var(--text-secondary)';
        elements.tweetSubmitBtn.disabled = false;
        elements.tweetSubmitBtn.style.opacity = 1;
        elements.tweetSubmitBtn.style.cursor = 'pointer';
    }

    // Update Circle Progress
    const percent = Math.min(100, (length / 280) * 100);
    const offset = CIRCLE_CIRCUMFERENCE - (percent / 100) * CIRCLE_CIRCUMFERENCE;
    elements.charProgressCircle.style.strokeDashoffset = offset;

    // Change circle color if close to limit
    if (charactersLeft <= 20 && charactersLeft > 0) {
        elements.charProgressCircle.style.stroke = '#f59e0b'; // Amber
    } else if (charactersLeft <= 0) {
        elements.charProgressCircle.style.stroke = '#ef4444'; // Red
    } else {
        elements.charProgressCircle.style.stroke = 'var(--accent-blue)'; // Blue
    }
}

// Fire the Intent Web sharing link
function sendTweet() {
    const text = elements.tweetTextarea.value;
    if (!text.strip()) return;
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
}

// Premium System Toast Notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = '<i class="fa-solid fa-circle-check"></i>';
    if (type === 'error') {
        icon = '<i class="fa-solid fa-circle-exclamation"></i>';
    }
    
    toast.innerHTML = `${icon} <span>${message}</span>`;
    elements.toastContainer.appendChild(toast);
    
    // Auto dismiss
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}

// Export notes in current view to CSV file
function exportToCSV() {
    if (appState.filteredNotes.length === 0) {
        showToast('No notes available to export', 'error');
        return;
    }
    
    const headers = ['ID', 'Date', 'Type', 'Description', 'Link'];
    const rows = appState.filteredNotes.map(note => [
        note.id,
        note.date,
        note.type,
        // Double quotes wrapper for CSV safety
        `"${note.plain_text.replace(/"/g, '""')}"`,
        note.link
    ]);
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Create download trigger
    link.setAttribute('href', url);
    link.setAttribute('download', `bigquery_release_notes_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Exported CSV successfully!', 'success');
}

// Toggle Dark/Light Theme and save preference
function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    showToast(`Swapped to ${isLight ? 'Light' : 'Dark'} Mode!`, 'success');
}

// Update the visual Sync Status Dot and description
function updateSyncStatusUI(status) {
    if (!elements.syncStatusVal) return;
    const statusText = elements.syncStatusVal.querySelector('.status-text');
    
    // Reset classes while keeping core classes
    elements.syncStatusVal.className = 'stat-value sync-status';
    
    if (status === 'synced') {
        elements.syncStatusVal.classList.add('synced');
        statusText.textContent = 'Synced with Cloud';
    } else if (status === 'cached') {
        elements.syncStatusVal.classList.add('cached');
        statusText.textContent = 'Viewing Local Cache';
    } else if (status === 'failed') {
        elements.syncStatusVal.classList.add('failed');
        statusText.textContent = 'Sync Failed';
    } else {
        statusText.textContent = 'Checking...';
    }
}
