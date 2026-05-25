# Boarding School Tech Job Monitor - Quick Reference

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Your Email                              │
│                    (Weekly Digests)                             │
└────────────────────────────┬────────────────────────────────────┘
                             ▲
                             │
                    ┌────────┴────────┐
                    │  Gmail SMTP     │
                    │  (nodemailer)   │
                    └────────┬────────┘
                             │
┌────────────────────────────┴───────────────────────────┐
│        Netlify Function (Weekly Scheduler)            │
│  - Runs every Monday at 8 AM UTC                     │
│  - Scrapes 45+ boarding school job pages             │
│  - Detects tech roles using keyword matching         │
│  - Saves new jobs to Supabase                        │
│  - Sends email digest                                │
└────────────────────────────┬───────────────────────────┘
                             │
        ┌────────────────────┴────────────────────┐
        │                                         │
        ▼                                         ▼
┌──────────────────────┐            ┌─────────────────────┐
│   Supabase DB        │            │  School Websites    │
│ ─────────────────    │            │ ─────────────────  │
│ schools              │            │ (45+ schools)       │
│ job_postings         │            │ Employment pages    │
│ job_alerts           │            │                     │
│ scraping_logs        │            │ (Cheerio parsing)   │
│                      │            │                     │
└──────────┬───────────┘            └─────────────────────┘
           │
           │ (Real-time queries)
           │
           ▼
┌────────────────────────────┐
│   React Dashboard          │
│ ────────────────────────   │
│ - Browse all jobs          │
│ - Filter by country        │
│ - Search by keyword        │
│ - View tech skills tagged  │
│ - Link to job postings     │
└────────────────────────────┘
```

---

## File Checklist

You should have received these files:

- ✅ `boarding_schools_database.csv` - 45 boarding schools with URLs
- ✅ `supabase_schema.sql` - Database schema for PostgreSQL
- ✅ `netlify-function-scraper.js` - Weekly job scraper function
- ✅ `dashboard-component.jsx` - React dashboard component
- ✅ `SETUP_GUIDE.md` - Step-by-step deployment guide (this section)
- ✅ `QUICK_REFERENCE.md` - This file

---

## One-Page Setup Summary

### 1. Supabase (5 min)
```
1. Create project at supabase.com
2. Run SQL schema from supabase_schema.sql in SQL Editor
3. Import boarding_schools_database.csv via Table Editor
4. Copy Project URL and Anon Key from API settings
```

### 2. Netlify Function (10 min)
```
1. Create netlify/functions/scrape-boarding-school-jobs.js
2. Copy netlify-function-scraper.js contents
3. npm install @supabase/supabase-js cheerio nodemailer node-fetch
4. Add to netlify.toml:
   [functions."scrape-boarding-school-jobs"]
   schedule = "0 8 * * 1"
5. Set environment variables in Netlify:
   - SUPABASE_URL
   - SUPABASE_KEY
   - GMAIL_USER
   - GMAIL_APP_PASSWORD
   - NOTIFICATION_EMAIL
6. Deploy: netlify deploy --prod
```

### 3. React Dashboard (5 min)
```
1. Create .env with:
   REACT_APP_SUPABASE_URL=...
   REACT_APP_SUPABASE_ANON_KEY=...
2. Replace src/App.jsx with dashboard-component.jsx contents
3. npm install @supabase/supabase-js
4. Deploy: npm run build && netlify deploy --prod --dir=build
```

### 4. Test (2 min)
```
curl https://your-site.netlify.app/.netlify/functions/scrape-boarding-school-jobs
# Should return JSON with jobs found
# Check email for digest
# Visit dashboard URL
```

---

## Environment Variables Cheat Sheet

**Netlify** (`Site Settings → Environment Variables`):
```
SUPABASE_URL        = https://xxxxx.supabase.co
SUPABASE_KEY        = eyJhbGciOi... (45-char anon key)
GMAIL_USER          = your-email@gmail.com
GMAIL_APP_PASSWORD  = xxxx xxxx xxxx xxxx (16 chars, spaces ok)
NOTIFICATION_EMAIL  = recipient@example.com
```

**React Dashboard** (`.env` file in root):
```
REACT_APP_SUPABASE_URL      = https://xxxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY = eyJhbGciOi... (same as Netlify)
```

---

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "No jobs found" | School URLs changed | Update URLs in Supabase `schools` table |
| Gmail auth fails | Wrong app password | Generate new password at myaccount.google.com/apppasswords |
| Netlify function times out (>26s) | Scraping too slow | Increase timeout or parallelize requests |
| Dashboard shows blank | Wrong env vars | Check `.env` has correct Supabase keys |
| Emails not arriving | SMTP error | Check Netlify logs: Deployments → Functions → Logs |
| Jobs not in dashboard | DB query error | Check Supabase `job_postings` table directly |
| CSS looks wrong | CSS variables not loaded | Refresh dashboard (hard refresh: Ctrl+Shift+R) |

---

## Customization Examples

### Change scrape schedule
In `netlify.toml`:
```toml
schedule = "0 */6 * * *"    # Every 6 hours
schedule = "0 9 * * 1-5"    # Weekdays only at 9 AM UTC
schedule = "0 8 * * *"      # Daily at 8 AM UTC
```

### Add custom tech keywords
In `netlify-function-scraper.js`, update `TECH_KEYWORDS`:
```javascript
const TECH_KEYWORDS = [
  'developer', 'engineer', 'python', 'javascript',
  'rust', 'golang', 'typescript',  // your keywords
  'kubernetes', 'terraform',
];
```

### Send to Slack instead of email
Replace `sendEmailDigest()` with:
```javascript
async function sendToSlack(newTechJobs) {
  const slackWebhook = process.env.SLACK_WEBHOOK_URL;
  const text = `Found ${newTechJobs.length} new tech jobs! 🚀`;
  await fetch(slackWebhook, {
    method: 'POST',
    body: JSON.stringify({ text })
  });
}
```

### Filter jobs during scraping
In `netlify-function-scraper.js`, modify `isTechRole()`:
```javascript
function isTechRole(title, description) {
  const combined = `${title} ${description}`.toLowerCase();
  // Only return true if it matches your criteria
  return TECH_KEYWORDS.some(keyword => combined.includes(keyword))
    && !combined.includes('entry level');  // exclude entry level
}
```

---

## Database Schema Quick Ref

**schools** table:
- `id` (PK)
- `school_name` VARCHAR(255)
- `country` VARCHAR(50)
- `region` VARCHAR(100)
- `employment_url` TEXT
- `school_website` TEXT
- `notes` TEXT
- `active` BOOLEAN
- `last_checked` TIMESTAMP

**job_postings** table:
- `id` (PK)
- `school_id` (FK → schools)
- `job_title` VARCHAR(255)
- `job_description` TEXT
- `job_url` TEXT UNIQUE
- `posted_date` DATE
- `is_tech_role` BOOLEAN
- `tech_keywords` TEXT (comma-separated)
- `salary_range` VARCHAR(255)
- `employment_type` VARCHAR(100)
- `remote_eligible` BOOLEAN
- `housing_mentioned` BOOLEAN
- `status` VARCHAR(50) (active/archived/closed)

---

## Monitoring & Maintenance

### Weekly
- Check dashboard for interesting postings
- Review tech keywords quality

### Monthly
- Verify school URLs still work
- Check email delivery logs

### Quarterly
- Add new boarding schools if discovered
- Update employment URLs that changed
- Review and refine tech keyword list

### Check Scraper Health
```bash
# View function logs
netlify logs --function=scrape-boarding-school-jobs

# Check last run in Supabase
SELECT * FROM scraping_logs ORDER BY created_at DESC LIMIT 10;

# Check new jobs found
SELECT COUNT(*) FROM job_postings 
WHERE created_at > NOW() - INTERVAL '7 days';
```

---

## Cost Breakdown

| Service | Cost | Notes |
|---------|------|-------|
| Supabase | Free tier | Up to 500MB (plenty for this) |
| Netlify | Free | 125k function invocations/month (plenty) |
| Gmail | Free | 500 emails/day (plenty) |
| React hosting | Free (Netlify) | 100 GB bandwidth free |
| **Total** | **$0/month** | Completely free! |

---

## Next Steps After Deployment

1. **First week**: Monitor logs to ensure scraper runs correctly
2. **Second week**: Review jobs found and refine tech keywords if needed
3. **Monthly**: Update school URLs that may have changed
4. **Ongoing**: Browse dashboard when you want new job listings

---

## Quick Command Reference

```bash
# Deploy everything
netlify deploy --prod

# View function logs
netlify logs --function=scrape-boarding-school-jobs

# Test scraper manually
curl https://your-site.netlify.app/.netlify/functions/scrape-boarding-school-jobs

# View Supabase data
# Go to: https://app.supabase.com/project/[project-id]/editor/

# Test email
# Modify scraper to always send test email, run function, check inbox
```

---

## Support Resources

- **Netlify Docs**: https://docs.netlify.com/functions/overview/
- **Supabase Docs**: https://supabase.com/docs
- **Cheerio (web scraping)**: https://cheerio.js.org/
- **React Docs**: https://react.dev

---

## Success Criteria

You'll know everything is working when:

✅ Dashboard loads at your deployed URL
✅ `schools` table has 45 schools
✅ Scraper function runs without errors (check logs)
✅ `job_postings` table populates with jobs
✅ You receive an email digest with jobs found
✅ Dashboard shows jobs with filters working
✅ Tech keywords are highlighted on job cards

---

Good luck! 🎓💼
