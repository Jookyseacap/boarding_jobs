# Boarding School Tech Job Monitor - Complete Setup Guide

## Overview

This system automatically monitors 50+ boarding schools across 7 countries, detects tech job postings weekly, and sends you email alerts + maintains a searchable dashboard.

**Components**:
1. **School Database** - CSV list of boarding schools with employment URLs
2. **Supabase** - PostgreSQL database to store schools and jobs
3. **Netlify Function** - Weekly scraper that finds new tech jobs via web scraping
4. **React Dashboard** - Browse and filter all discovered jobs
5. **Email Alerts** - Weekly digest of new tech postings

---

## Step 1: Supabase Setup

### 1a. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - **Name**: `boarding-school-jobs`
   - **Database Password**: Generate a strong one (save this!)
   - **Region**: Pick one close to you
4. Wait for project to initialize (~2 min)

### 1b. Create Database Schema

1. In Supabase, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `supabase_schema.sql` (from the files provided)
4. Paste into the editor
5. Click "Run"

This creates 4 tables: `schools`, `job_postings`, `job_alerts`, `scraping_logs`

### 1c. Import Schools Data

1. Go to **Table Editor** in Supabase
2. Click on the `schools` table
3. Click "Insert" → "Import Data" (or use the CSV button)
4. Select the `boarding_schools_database.csv` file
5. Map columns:
   - school_name → school_name
   - country → country
   - region → region
   - employment_url → employment_url
   - school_website → school_website
   - notes → notes
6. Click "Import"

All 45 schools are now in your database!

### 1d. Get API Keys

1. Go to **Settings** → **API**
2. Find "Project URL" and "Anon Key"
3. Copy both — you'll need them for Netlify and your React dashboard

---

## Step 2: Netlify Function Setup (Weekly Scraper)

### 2a. Prepare Your Netlify Project

If you don't have a Netlify project yet, create one:

```bash
npm install -g netlify-cli
netlify login
netlify init
```

Choose "Create a new site" and follow prompts.

### 2b. Add the Scraper Function

1. In your Netlify project root, create `netlify/functions/scrape-boarding-school-jobs.js`
2. Copy the entire contents of `netlify-function-scraper.js` into this file

### 2c. Install Dependencies

Your `package.json` should include:

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.38.4",
    "cheerio": "^1.0.0-rc.12",
    "node-fetch": "^2.6.11",
    "nodemailer": "^6.9.4"
  }
}
```

Run:
```bash
npm install
```

### 2d. Set Environment Variables

1. Go to your Netlify site in the dashboard
2. Go to **Site Settings** → **Environment Variables**
3. Add these secrets:

```
SUPABASE_URL = [from Supabase API settings]
SUPABASE_KEY = [Supabase Anon Key]
GMAIL_USER = your-email@gmail.com
GMAIL_APP_PASSWORD = [see below for how to generate]
NOTIFICATION_EMAIL = your-email@gmail.com
```

### 2e. Generate Gmail App Password

1. Go to [myaccount.google.com/security](https://myaccount.google.com/security)
2. Enable "2-Step Verification" if you haven't already
3. Go back to Security → "App passwords"
4. Select "Mail" and "Windows Computer" (doesn't matter)
5. Google generates a 16-character password
6. Copy it into `GMAIL_APP_PASSWORD` in Netlify

### 2f. Set Up Weekly Scheduled Trigger

**Option A: Using Netlify Functions Scheduled Events**

1. In `netlify/functions/scrape-boarding-school-jobs.js`, modify the function to accept scheduled events:

```javascript
// Add this at the top of the handler
export async function handler(event, context) {
  // Check if this is a scheduled event
  if (event.httpMethod !== 'GET' && !context.clientContext) {
    // Not triggered by HTTP, likely scheduled event — run normally
  }
  // ... rest of scraper code
}
```

2. In `netlify.toml`, add:

```toml
[functions]
  [functions."scrape-boarding-school-jobs"]
    schedule = "0 8 * * 1" # Every Monday at 8 AM UTC
```

3. Deploy:

```bash
netlify deploy --prod
```

**Option B: Using an External Scheduler (more reliable)**

If you prefer guaranteed execution, use a free external scheduler:

1. Go to [CRON-job.org](https://cron-job.org) or [EasyCron](https://www.easycron.com/)
2. Create a new cron job
3. **URL**: `https://your-netlify-site.netlify.app/.netlify/functions/scrape-boarding-school-jobs`
4. **Schedule**: `0 8 * * 1` (Monday 8 AM UTC)
5. Check "Save responses"

Test the function once manually:
```bash
curl https://your-netlify-site.netlify.app/.netlify/functions/scrape-boarding-school-jobs
```

You should see:
```json
{
  "message": "Scraping completed",
  "schoolsScraped": 45,
  "totalJobsFound": 18,
  "totalNewTechJobs": 3,
  "failureCount": 0
}
```

---

## Step 3: React Dashboard Setup

### 3a. Create React App

If you don't have a React app, create one:

```bash
npx create-react-app boarding-school-jobs-dashboard
cd boarding-school-jobs-dashboard
npm install @supabase/supabase-js
```

### 3b. Add Dashboard Component

1. Replace `src/App.jsx` with the contents of `dashboard-component.jsx`
2. Create a `.env` file in the root:

```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3c. Deploy Dashboard

**Option A: Deploy to Netlify**

```bash
npm run build
netlify deploy --prod --dir=build
```

**Option B: Deploy to Vercel**

```bash
vercel
```

Your dashboard is now live! Access it at `https://your-site.netlify.app`

---

## Step 4: Configure Email Alerts

The Netlify function automatically sends emails when new tech jobs are found. Update `NOTIFICATION_EMAIL` in Netlify environment variables if you want alerts to go to a different address.

To customize the email template, edit the `sendEmailDigest()` function in `netlify-function-scraper.js`.

---

## Step 5: Verify Everything Works

### Test the Scraper

```bash
# Manually trigger the scraper
curl https://your-netlify-site.netlify.app/.netlify/functions/scrape-boarding-school-jobs
```

Check your email for a test digest.

### Check the Dashboard

Visit your deployed dashboard URL. You should see:
- Stats (total jobs, new this week, countries)
- Filter options (country, search, tech keyword)
- List of all scraped tech jobs

### Verify Database

In Supabase, go to **Table Editor**:
- `schools` table should have 45+ schools
- `job_postings` table should be populated after first scrape
- `scraping_logs` table should show execution history

---

## Step 6: Troubleshooting

### Scraper Not Finding Jobs

**Issue**: Zero jobs found, or very few jobs

**Causes**:
1. School websites changed their URL structure
2. Cheerio selectors aren't matching the HTML (sites use different class names)
3. Many schools use third-party job boards (Indeed, Tes, Ashton Recruitment)

**Solutions**:
- Update the `employment_url` in the `schools` table with correct URLs
- For schools using third-party boards, create a custom scraper for that board
- Manually add known job posting URLs to `job_postings` table

### Gmail Errors

**Issue**: "Invalid credentials" or "App password rejected"

**Solutions**:
1. Make sure you enabled 2-Step Verification on your Google account
2. Generate a NEW app password (don't reuse old ones)
3. Make sure it's exactly 16 characters (with spaces removed)
4. Paste into Netlify environment variables exactly as provided (no extra spaces)

### Email Not Sending

**Issue**: Scraper runs but no email arrives

**Solutions**:
1. Check Netlify function logs: **Deployments** → **Latest** → **Functions** tab
2. Look for error messages (wrong email, SMTP rejection, etc.)
3. Verify `NOTIFICATION_EMAIL` is set
4. Check spam folder

### Dashboard Shows No Jobs

**Issue**: Dashboard loads but no jobs display

**Solutions**:
1. Make sure scraper has run at least once
2. Check Supabase **job_postings** table to see if jobs exist
3. Verify dashboard environment variables are correct (check `.env`)
4. Check browser console for errors (F12 → Console tab)

---

## Step 7: Fine-Tuning

### Add More Schools

1. In Supabase **Table Editor**, go to `schools` table
2. Click "Insert" → "New row"
3. Fill in school details and employment URL

### Customize Tech Keywords

Edit the `TECH_KEYWORDS` array in `netlify-function-scraper.js` to match your interests:

```javascript
const TECH_KEYWORDS = [
  'developer', 'python', 'react', 'aws', 'devops',
  // Add your custom keywords here
];
```

### Change Scrape Schedule

Edit `netlify.toml`:

```toml
schedule = "0 */6 * * *"  # Every 6 hours
schedule = "0 9 * * 1-5"  # Weekdays at 9 AM UTC
```

### Customize Email Template

In `netlify-function-scraper.js`, modify the `sendEmailDigest()` function's HTML content.

### Integrate with Other Services

**Slack Alerts**: Replace Gmail with Slack webhook:

```javascript
// Instead of sending email, post to Slack
const slackWebhook = process.env.SLACK_WEBHOOK_URL;
await fetch(slackWebhook, {
  method: 'POST',
  body: JSON.stringify({ text: `Found ${newJobs.length} new tech jobs!` })
});
```

**Discord Webhook**: Similar to Slack, use a Discord webhook

---

## Maintenance Checklist

- **Weekly**: Check dashboard for interesting postings
- **Monthly**: Update school URLs if you find broken links (they change!)
- **Quarterly**: Review and update tech keywords to match your interests
- **Annually**: Verify email delivery is working, check for new boarding schools to add

---

## Next Steps

1. **Deploy everything** following steps 1-5 above
2. **Run the scraper** manually to test
3. **Check your email** for the digest
4. **Visit the dashboard** to browse jobs
5. **Set schedule** to run weekly
6. **Customize** as needed for your specific interests

Once deployed, the system runs automatically every week and you'll get emails whenever new tech jobs are found!

---

## Support

If you run into issues:

1. **Check logs**: Netlify → Deployments → Functions → Logs tab
2. **Verify environment variables**: All required secrets set in Netlify?
3. **Test individual components**: Try the curl command for scraper, check Supabase directly
4. **Check school URLs**: Some may be outdated — verify in browser first

Good luck! 🚀
