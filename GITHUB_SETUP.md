# GitHub Setup Instructions

Follow these steps to upload your Job Application Tracker to GitHub as a public repository.

## Prerequisites

1. **GitHub Account**: Create one at [github.com](https://github.com) if you don't have one
2. **Git Installed**: Download from [git-scm.com](https://git-scm.com/) if not already installed

## Step-by-Step Setup

### 1. Initialize Git Repository

Open Terminal/Command Prompt and navigate to your project folder:

```bash
cd "/Users/labroiwalton/Projects/Job Tracker App"
git init
```

### 2. Configure Git (if first time)

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 3. Add Files to Git

```bash
git add .
git commit -m "Initial commit: Job Application Tracker with AI analysis, bulk operations, and search/filter features"
```

### 4. Create GitHub Repository

1. Go to [github.com](https://github.com)
2. Click the **"+"** button in the top right
3. Select **"New repository"**
4. Fill in details:
   - **Repository name**: `job-application-tracker`
   - **Description**: `AI-powered job application tracker with advanced filtering and bulk operations`
   - **Visibility**: Select **Public**
   - **DO NOT** initialize with README (we already have one)
5. Click **"Create repository"**

### 5. Connect Local Repository to GitHub

Replace `yourusername` with your actual GitHub username:

```bash
git remote add origin https://github.com/yourusername/job-application-tracker.git
git branch -M main
git push -u origin main
```

### 6. Verify Upload

1. Go to your repository on GitHub
2. You should see all files:
   - `job_tracker_app.html`
   - `README.md`
   - `LICENSE`
   - `.gitignore`
   - `job_tracker_prd.md`

## Optional: Enable GitHub Pages

To host your app directly on GitHub:

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Scroll down to **Pages** section
4. Under **Source**, select **Deploy from a branch**
5. Select **main** branch and **/ (root)** folder
6. Click **Save**
7. Your app will be available at: `https://yourusername.github.io/job-application-tracker/job_tracker_app.html`

## Repository Structure

Your final repository will look like this:

```
job-application-tracker/
├── .gitignore              # Git ignore rules
├── LICENSE                 # MIT License
├── README.md               # Comprehensive documentation
├── job_tracker_app.html    # Main application (single file)
├── job_tracker_prd.md      # Product requirements document
└── GITHUB_SETUP.md         # This setup guide
```

## Recommended Repository Settings

### 1. Add Topics/Tags
In your GitHub repository:
- Click the ⚙️ gear icon next to "About"
- Add topics: `job-tracker`, `ai-powered`, `javascript`, `html`, `css`, `career-tools`, `job-search`

### 2. Create Repository Description
Use this description:
```
🎯 AI-powered job application tracker with advanced search, filtering, bulk operations, and OpenAI integration. Track applications, analyze job postings, and manage your job search effectively.
```

### 3. Add Links
- Website: `https://yourusername.github.io/job-application-tracker/job_tracker_app.html` (if using GitHub Pages)

## Future Updates

To update your repository with changes:

```bash
git add .
git commit -m "Description of your changes"
git push
```

## Troubleshooting

### Authentication Issues
If you get authentication errors:
1. Use GitHub Desktop app, or
2. Set up SSH keys, or
3. Use Personal Access Token instead of password

### Large File Issues
The HTML file is ~70KB, which is fine for GitHub. If you add large assets later, consider using Git LFS.

### Permissions
Make sure your repository is public if you want others to access it easily.

---

**Your Job Application Tracker is now ready for the world! 🚀**

Don't forget to:
- ⭐ Star your own repository
- 📝 Update the README with your GitHub username
- 🔗 Share it with the job-seeking community
- 🐛 Accept issues and contributions from others