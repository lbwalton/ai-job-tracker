# Job Application Tracker - Product Requirements Document

## Overview

A standalone web application that uses AI to intelligently extract job posting information and provides a complete job application tracking system. The app eliminates manual data entry by automatically parsing job postings and organizing application data for easy management and export.

## Background & Context

**Problem Statement:**
Job seekers need to track multiple applications across various platforms, but manually entering job details is time-consuming and error-prone. Existing solutions either lack intelligence (basic spreadsheets) or require complex integrations with limited platform support.

**Solution:**
An AI-powered web app that can analyze any job posting (URL or copy-paste) and automatically extract structured information, then provide a complete tracking system with easy export capabilities.

## User Persona

**Primary User:**
- Professional job seeker (marketing background, tech-savvy)
- Applies to multiple positions simultaneously
- Values automation and efficiency
- Uses Google Sheets for organization
- Prefers simple, reliable tools over complex systems

## Core Features

### 1. AI-Powered Job Analysis

**Input Methods:**
- Job posting URL (supports any career site, job board)
- Copy-paste job posting content

**AI Extraction:**
- Company name (actual company, not job board platform)
- Job title
- Location/remote status
- Salary range (if mentioned)
- Job type (full-time, part-time, contract)
- Experience level required
- Key skills mentioned
- Brief job description summary

**Technical Implementation:**
- OpenAI GPT-3.5-turbo for content analysis
- AllOrigins API for CORS-free URL fetching
- Structured JSON response parsing

### 2. Application Tracking System

**Job Storage:**
- Local browser storage (no external servers)
- Persistent across browser sessions
- Unlimited job entries

**Tracking Fields:**
- Date applied (auto-generated)
- All extracted job information
- Application status (Applied, Interview, Offer, Rejected)
- Days since application (auto-calculated)
- Source URL for reference

**Status Management:**
- Update application status
- Visual status badges
- Remove applications
- Bulk operations

### 3. Export & Integration

**CSV Export:**
- Individual job export
- Bulk export of all applications
- Google Sheets compatible format
- Standard column structure for consistency

**Google Sheets Integration:**
- Direct CSV download for import
- Proper formatting for sheet templates
- Maintains data structure integrity

### 4. User Interface

**Design Principles:**
- Clean, modern interface
- Mobile-responsive design
- Single-page application
- Minimal configuration required

**Key Screens:**
- Setup/configuration section
- Job input (URL vs paste methods)
- Extracted information review
- Application tracking table
- Export options

## Technical Architecture

### Frontend
- **Technology:** Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Storage:** localStorage for persistence
- **Responsive:** Mobile-first design with CSS Grid/Flexbox

### External APIs
- **OpenAI API:** Job content analysis
- **AllOrigins:** CORS proxy for URL fetching
- **No backend required:** Fully client-side application

### Data Structure
```javascript
{
  id: timestamp,
  dateAdded: "YYYY-MM-DD",
  company: "string",
  jobTitle: "string", 
  location: "string",
  sourceUrl: "string",
  status: "Applied|Interview|Offer|Rejected",
  salaryRange: "string|null",
  jobType: "string",
  experience: "string",
  skills: "string",
  description: "string"
}
```

## User Flow

1. **Setup:** Enter OpenAI API key (one-time)
2. **Input:** Choose URL or paste method
3. **Analysis:** AI extracts job information
4. **Review:** User confirms extracted details
5. **Save:** Add to personal tracker
6. **Manage:** View all applications, update statuses
7. **Export:** Download CSV for external use

## Success Metrics

**Primary KPIs:**
- Extraction accuracy (company name, job title correctness)
- Time saved vs manual entry
- User retention (return usage)

**Secondary Metrics:**
- Number of jobs tracked per user
- Export frequency
- Error rates in AI extraction

## Risk Mitigation

**API Dependencies:**
- Graceful fallback if OpenAI API fails
- Clear error messaging for API issues
- Offline functionality for viewing saved jobs

**Data Loss Prevention:**
- Local storage backup
- Export functionality as backup mechanism
- Clear data persistence messaging

**Privacy & Security:**
- No data sent to external servers (except OpenAI for analysis)
- API keys stored locally only
- No user accounts or personal data collection

## Future Enhancements

**V2 Features:**
- Email tracking integration
- Application deadline reminders
- Interview scheduling integration
- Advanced filtering and search
- Team/collaborative tracking
- Chrome extension for one-click saving

**Analytics & Insights:**
- Application success rate tracking
- Industry/role analysis
- Salary trend analysis
- Time-to-hire metrics

## Technical Considerations

**Browser Compatibility:**
- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ JavaScript features
- CSS Grid and Flexbox support

**Performance:**
- Lightweight single-file application
- Minimal external dependencies
- Fast local storage operations

**Scalability:**
- Client-side only (no server scaling concerns)
- localStorage limitations (~5-10MB typical)
- Suitable for individual users tracking 100+ applications

## Configuration Requirements

**User Setup:**
- OpenAI API key (platform.openai.com)
- No additional accounts or services required

**API Costs:**
- Estimated <$5/month for heavy usage
- ~$0.01 per job analysis
- Pay-per-use model

## Development Notes

**Deployment:**
- Single HTML file
- No build process required
- Can be hosted anywhere or run locally
- No server infrastructure needed

**Maintenance:**
- Minimal ongoing maintenance
- API key rotation as needed
- Potential OpenAI API updates

---

## Appendix

### Original Requirements Summary
- Automated job application tracking
- AI-powered information extraction
- Google Sheets integration
- Minimal manual data entry
- URL and copy-paste input methods
- Status tracking and management
- Export capabilities