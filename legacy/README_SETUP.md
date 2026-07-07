# Job Tracker App - Easy Access Setup

## Quick Start Options

### Option 1: Double-Click Launch (Recommended)
Simply double-click `start_job_tracker.sh` to launch the app. It will:
- Start a local web server
- Automatically open the app in your browser
- Keep running until you close the terminal

### Option 2: Browser Bookmark
1. Start the server by running: `./start_job_tracker.sh`
2. Bookmark this URL in your browser: `http://localhost:8080/job_tracker_app.html`
3. Access anytime while the server is running

### Option 3: Desktop Shortcut (macOS)
1. Open Automator
2. Create a new "Application"
3. Add "Run Shell Script" action
4. Set shell to `/bin/bash`
5. Paste this script:
   ```bash
   cd "/Users/labroiwalton/Projects/Job Tracker App"
   python3 start_server.py
   ```
6. Save as "Job Tracker" to Applications or Desktop

## Data Persistence Features

Your job application data is automatically:
- ✅ Saved to browser localStorage after every change
- ✅ Auto-backed up every 30 seconds
- ✅ Recoverable from backup if main data is corrupted
- ✅ Exportable as JSON backup files
- ✅ Restorable from exported backup files

### Manual Backup
1. Click "Configuration Setup" at the top
2. Go to "Import CSV/Excel" tab
3. Click "Export Backup" to download your data
4. Store the backup file safely

### Restore from Backup
1. Click "Configuration Setup" at the top
2. Go to "Import CSV/Excel" tab
3. Click "Import Backup" and select your backup file

## Gmail Integration Setup

To connect Gmail for email tracking:

1. **Create Google Cloud Project:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create new project or select existing one

2. **Enable Gmail API:**
   - Go to "APIs & Services" → "Library"
   - Search for "Gmail API" and enable it

3. **Create OAuth Credentials:**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth Client ID"
   - Choose "Web application"
   - Add authorized JavaScript origins: `http://localhost:8080`
   - Add authorized redirect URIs: `http://localhost:8080/job_tracker_app.html`
   - Copy the Client ID

4. **Configure in App:**
   - Start the app using `./start_job_tracker.sh`
   - Go to "Configuration Setup" → paste Client ID
   - Click "Connect Gmail"

## Troubleshooting

**Gmail Error 400: invalid_request?**
- Make sure you're accessing via `http://localhost:8080/job_tracker_app.html` (not file://)
- Check that `http://localhost:8080` is in your OAuth authorized origins
- Verify redirect URI is exactly: `http://localhost:8080/job_tracker_app.html`

**App won't start?**
- Make sure Python 3 is installed: `python3 --version`
- Try: `chmod +x start_job_tracker.sh`

**Data not saving?**
- The app uses localStorage - data persists per browser
- Clear browser cache will remove data (use Export Backup first!)
- Different browsers = different data stores

**Port 8080 in use?**
- Edit `start_server.py` and change `PORT = 8080` to another number
- Update any bookmarks and OAuth settings with the new port number

## Security Note
This runs locally on your machine only. Your data never leaves your computer unless you explicitly export it.