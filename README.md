# Job Application Tracker

A comprehensive web-based tool for tracking job applications with AI-powered job posting analysis, bulk operations, and advanced filtering capabilities.

![Job Tracker Screenshot](https://via.placeholder.com/800x400/4285f4/ffffff?text=Job+Application+Tracker)

## Features

### 🎯 **Multiple Input Methods**
- **Job URL Analysis**: Paste any job posting URL for automatic analysis
- **Copy & Paste**: Paste job posting content directly 
- **Describe Job**: Use natural language to describe your application
- **Manual Entry**: Complete control with detailed form input

### 🤖 **AI-Powered Analysis**
- Automatically extracts company, position, location, salary, and more
- Uses OpenAI GPT to parse job postings and descriptions
- Smart duplicate detection prevents accidental re-entries

### 📊 **Advanced Management**
- **Search & Filter**: Find jobs by company, position, location, status, or date range
- **Column Sorting**: Click headers to sort by any field
- **Bulk Operations**: Select multiple jobs to update dates, statuses, or delete
- **Inline Editing**: Click to edit company, position, or location directly

### ✏️ **Comprehensive Editing**
- Full-form editing modal for complete job details
- Editable application dates with automatic "days since" calculation
- Custom status options beyond the standard set
- Source URL tracking with clickable links

### 📈 **Status Tracking**
- Pre-defined statuses: Applied, Interview, Offer, Rejected
- Add custom statuses for your workflow
- Visual status indicators
- Progress tracking with "days since applied"

### 💾 **Data Management**
- Local browser storage (no external servers)
- CSV export for individual jobs or entire list
- Google Sheets integration
- Bulk data operations

## Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- OpenAI API key (for AI analysis features)

### Setup

1. **Download the files**:
   ```bash
   git clone https://github.com/yourusername/job-tracker-app.git
   cd job-tracker-app
   ```

2. **Open the application**:
   - Open `job_tracker_app.html` in your web browser
   - Or serve it using a local server:
     ```bash
     python -m http.server 8000
     # Then visit http://localhost:8000
     ```

3. **Configure OpenAI API** (optional, for AI features):
   - Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys)
   - Enter it in the "OpenAI API Key" field
   - Your key is stored locally and only sent to OpenAI

## Usage Guide

### Adding Job Applications

#### Method 1: Job URL
1. Select "Job URL" tab
2. Paste the job posting URL
3. Click "Analyze Job Posting"
4. Review extracted information
5. Click "Save to Tracker"

#### Method 2: Copy & Paste
1. Select "Copy & Paste" tab
2. Copy the entire job posting text
3. Paste into the text area
4. Click "Analyze Job Posting"
5. Save when satisfied

#### Method 3: Describe Job
1. Select "Describe Job" tab
2. Write in plain language: *"I applied to Google for a Software Engineer position in Mountain View. It's full-time and pays around $150k"*
3. Click "Analyze Description"
4. Review and save

#### Method 4: Manual Entry
1. Select "Manual Entry" tab
2. Fill in all known details
3. Click "Add Job Application"

### Managing Applications

#### Search & Filter
- **Search**: Type in the search box to find specific jobs
- **Status Filter**: Use dropdown to filter by application status
- **Date Range**: Set "From" and "To" dates to filter by application period
- **Clear Filters**: Reset all filters and search

#### Sorting
- Click any column header to sort by that field
- Click again to reverse the sort order
- Visual indicators show current sort direction

#### Bulk Operations
1. Select jobs using checkboxes
2. Use "Select All" to select everything
3. Choose bulk action:
   - **Update Date**: Set new application date for all selected
   - **Update Status**: Change status for all selected
   - **Delete**: Remove all selected jobs

#### Individual Editing
- **Inline Edit**: Click company, position, or location to edit directly
- **Full Edit**: Click "Edit" button for complete form editing
- **Date Edit**: Click date field to change application date
- **Status Edit**: Use dropdown to change status

### Duplicate Detection
- System automatically detects potential duplicates
- Shows existing job details and current status
- Option to add anyway or disregard

## File Structure

```
job-tracker-app/
├── job_tracker_app.html    # Main application file
├── job_tracker_prd.md      # Product requirements document
├── README.md               # This file
├── LICENSE                 # MIT License
└── .gitignore             # Git ignore file
```

## Features in Detail

### AI Analysis
The app uses OpenAI's GPT-3.5-turbo model to analyze job postings and extract:
- Company name
- Job title/position
- Location (including remote work)
- Salary range (if mentioned)
- Job type (full-time, part-time, contract, etc.)
- Experience level required
- Key skills and technologies
- Brief job description

### Data Storage
- All data is stored locally in your browser's localStorage
- No external servers or databases
- Data persists between browser sessions
- Export options available for backup

### Privacy & Security
- Your API key is stored locally only
- Job data never leaves your browser (except for AI analysis)
- No tracking or analytics
- Open source and transparent

## Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome  | 80+     | ✅ Fully Supported |
| Firefox | 75+     | ✅ Fully Supported |
| Safari  | 13+     | ✅ Fully Supported |
| Edge    | 80+     | ✅ Fully Supported |

## Troubleshooting

### Common Issues

**AI Analysis Not Working**
- Verify your OpenAI API key is correct
- Check your OpenAI account has available credits
- Ensure you have internet connection

**Jobs Not Saving**
- Check if localStorage is enabled in your browser
- Clear browser cache and try again
- Ensure you're not in private/incognito mode

**Export Not Working**
- Make sure pop-ups are allowed for the page
- Try a different browser
- Check that downloads are enabled

**Performance Issues**
- Clear old job entries you no longer need
- Use filters to reduce displayed jobs
- Try refreshing the browser

### Getting Help
- Check the browser console for error messages
- Ensure you're using a supported browser
- Verify all form fields are filled correctly

## Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature-name`
3. **Make your changes**
4. **Test thoroughly**
5. **Submit a pull request**

### Development Guidelines
- Keep the single-file architecture
- Maintain compatibility with all supported browsers
- Add comments for complex functionality
- Test all features before submitting

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- OpenAI for providing the GPT API for job posting analysis
- AllOrigins for CORS proxy service
- Google Sheets integration inspiration

## Roadmap

### Upcoming Features
- Email notification system
- Calendar integration for interview scheduling
- Resume and cover letter management
- Analytics dashboard with success metrics
- Mobile app version
- Team/collaborative features

### Version History
- **v1.0** - Initial release with basic tracking
- **v1.1** - Added AI analysis features
- **v1.2** - Implemented bulk operations
- **v1.3** - Added search and filtering
- **v1.4** - Enhanced editing capabilities

---

**Made with ❤️ for job seekers everywhere**

*Star this repository if you find it helpful!*