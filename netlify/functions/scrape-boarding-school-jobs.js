// netlify/functions/scrape-boarding-school-jobs.js
// Deploy to Netlify and set up a scheduled function trigger (weekly)
// This function runs weekly to check boarding school employment pages for tech jobs

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import nodemailer from 'nodemailer';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD, // Use app-specific password, not regular password
  },
});

// Tech keywords to identify technology roles
const TECH_KEYWORDS = [
  'developer', 'engineer', 'programmer', 'devops', 'aws', 'azure', 'cloud',
  'python', 'javascript', 'java', 'csharp', 'golang', 'rust', 'typescript',
  'react', 'vue', 'angular', 'node.js', 'nodejs', 'express', 'django', 'flask',
  'database', 'sql', 'postgres', 'mongodb', 'mysql', 'redis', 'elasticsearch',
  'api', 'rest', 'graphql', 'microservices', 'kubernetes', 'docker', 'ci/cd',
  'git', 'github', 'gitlab', 'jenkins', 'terraform', 'infrastructure',
  'cybersecurity', 'security', 'penetration', 'siem', 'firewall',
  'data scientist', 'machine learning', 'ml', 'ai', 'data engineer',
  'front-end', 'frontend', 'back-end', 'backend', 'full-stack', 'fullstack',
  'systems administrator', 'sysadmin', 'it support', 'network', 'linux', 'windows',
  'web developer', 'web designer', 'ux', 'ui', 'product manager', 'tech lead',
  'solutions architect', 'technical architect', 'crm', 'salesforce', 'erp',
  'mobile developer', 'ios', 'android', 'flutter', 'react native',
];

// Function to check if job title/description contains tech keywords
function isTechRole(title, description) {
  const combined = `${title} ${description}`.toLowerCase();
  return TECH_KEYWORDS.some(keyword => combined.includes(keyword));
}

// Function to extract tech keywords found in job posting
function extractTechKeywords(title, description) {
  const combined = `${title} ${description}`.toLowerCase();
  const found = TECH_KEYWORDS.filter(keyword => combined.includes(keyword));
  return [...new Set(found)].join(', ');
}

// Function to fetch and parse a school's employment page
async function scrapeSchoolJobs(school) {
  try {
    const response = await fetch(school.employment_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000,
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${school.school_name}: ${response.status}`);
      return { jobs: [], error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const jobs = [];

    // Generic selectors for job listings (these may need customization per school)
    // Try multiple common patterns
    const jobSelectors = [
      'div[class*="job"]',
      'li[class*="position"]',
      'article[class*="vacancy"]',
      'tr[class*="job"]',
      'div[class*="vacancy"]',
      'div[class*="opening"]',
      'a[href*="/job/"], a[href*="/position/"], a[href*="/vacancy/"]',
    ];

    let jobElements = [];
    for (const selector of jobSelectors) {
      jobElements = $(selector).get();
      if (jobElements.length > 0) break;
    }

    jobElements.forEach((element) => {
      const $el = $(element);
      
      // Extract job title
      const titleSelectors = ['h2', 'h3', 'h4', '[class*="title"]', 'strong'];
      let title = '';
      for (const sel of titleSelectors) {
        const text = $el.find(sel).first().text().trim();
        if (text) {
          title = text;
          break;
        }
      }

      // Extract description/snippet
      const descriptionSelectors = ['p', '[class*="description"]', '[class*="excerpt"]'];
      let description = '';
      for (const sel of descriptionSelectors) {
        const text = $el.find(sel).first().text().trim();
        if (text && text.length > 10) {
          description = text.substring(0, 500); // Limit to 500 chars
          break;
        }
      }

      // Extract job link
      let jobUrl = $el.find('a').attr('href') || '';
      if (jobUrl && !jobUrl.startsWith('http')) {
        jobUrl = new URL(jobUrl, school.employment_url).href;
      }

      // Skip if we don't have a title
      if (!title) return;

      jobs.push({
        title,
        description,
        jobUrl,
        isTech: isTechRole(title, description),
        techKeywords: extractTechKeywords(title, description),
        htmlSnapshot: $.html($el).substring(0, 2000), // Store snapshot for comparison
      });
    });

    // Update last_checked timestamp
    await supabase
      .from('schools')
      .update({ last_checked: new Date().toISOString() })
      .eq('id', school.id);

    return { jobs, error: null };
  } catch (error) {
    console.error(`Error scraping ${school.school_name}:`, error.message);
    return { jobs: [], error: error.message };
  }
}

// Function to save jobs to database and identify new ones
async function saveJobsToDatabase(schoolId, jobs) {
  const newJobs = [];

  for (const job of jobs) {
    // Check if this job URL already exists
    const { data: existing } = await supabase
      .from('job_postings')
      .select('id')
      .eq('job_url', job.jobUrl)
      .single();

    if (existing) {
      // Job already in database, update last_seen
      await supabase
        .from('job_postings')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      // New job - insert it
      const { data: inserted, error } = await supabase
        .from('job_postings')
        .insert([
          {
            school_id: schoolId,
            job_title: job.title,
            job_description: job.description,
            job_url: job.jobUrl,
            is_tech_role: job.isTech,
            tech_keywords: job.techKeywords,
            raw_html_snapshot: job.htmlSnapshot,
            posted_date: new Date().toISOString().split('T')[0],
            last_seen: new Date().toISOString(),
            status: 'active',
          },
        ])
        .select();

      if (!error && inserted && inserted.length > 0) {
        newJobs.push({
          ...inserted[0],
          schoolName: job.schoolName,
        });
      }
    }
  }

  return newJobs;
}

// Function to send email digest
async function sendEmailDigest(userEmail, newTechJobs) {
  if (newTechJobs.length === 0) {
    return; // Don't send empty digests
  }

  const jobsGroupedBySchool = newTechJobs.reduce((acc, job) => {
    if (!acc[job.school_id]) {
      acc[job.school_id] = { schoolName: job.school_name, jobs: [] };
    }
    acc[job.school_id].jobs.push(job);
    return acc;
  }, {});

  let htmlContent = `
    <h2>🚀 New Tech Jobs at Boarding Schools</h2>
    <p>We found ${newTechJobs.length} new technology job postings this week:</p>
  `;

  for (const [, schoolData] of Object.entries(jobsGroupedBySchool)) {
    htmlContent += `
      <h3>${schoolData.schoolName}</h3>
      <ul>
    `;
    
    for (const job of schoolData.jobs) {
      htmlContent += `
        <li>
          <strong>${job.job_title}</strong>
          ${job.tech_keywords ? `<br/><small>Tech: ${job.tech_keywords}</small>` : ''}
          <br/>
          <a href="${job.job_url}">View Posting →</a>
        </li>
      `;
    }
    
    htmlContent += '</ul>';
  }

  htmlContent += `
    <hr/>
    <p><a href="https://your-dashboard-url.com">View all jobs in dashboard →</a></p>
  `;

  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: userEmail,
    subject: `[Boarding School Tech Jobs] ${newTechJobs.length} new postings found`,
    html: htmlContent,
  });
}

// Main handler
export async function handler(event) {
  console.log('Starting boarding school job scraping...');

  const startTime = new Date();
  let totalJobsFound = 0;
  let totalNewJobs = 0;
  let failureCount = 0;

  try {
    // Fetch all active schools
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('*')
      .eq('active', true);

    if (schoolsError || !schools) {
      throw new Error(`Failed to fetch schools: ${schoolsError?.message}`);
    }

    const allNewTechJobs = [];

    // Scrape each school
    for (const school of schools) {
      console.log(`Scraping ${school.school_name}...`);

      const { jobs, error } = await scrapeSchoolJobs(school);
      totalJobsFound += jobs.length;

      if (error) {
        failureCount++;
        await supabase.from('scraping_logs').insert({
          school_id: school.id,
          check_start: startTime.toISOString(),
          check_end: new Date().toISOString(),
          jobs_found_count: 0,
          jobs_new_count: 0,
          status: 'failed',
          error_message: error,
        });
        continue;
      }

      // Filter to tech jobs only
      const techJobs = jobs.filter(j => j.isTech);

      // Save to database
      const newJobs = await saveJobsToDatabase(school.id, techJobs);
      totalNewJobs += newJobs.length;

      // Collect for email digest
      newJobs.forEach(job => {
        allNewTechJobs.push({
          ...job,
          school_name: school.school_name,
        });
      });

      // Log this scrape
      await supabase.from('scraping_logs').insert({
        school_id: school.id,
        check_start: startTime.toISOString(),
        check_end: new Date().toISOString(),
        jobs_found_count: jobs.length,
        jobs_new_count: newJobs.length,
        status: 'success',
      });
    }

    // Send email digest if there are new tech jobs
    const userEmail = process.env.NOTIFICATION_EMAIL;
    if (userEmail && allNewTechJobs.length > 0) {
      await sendEmailDigest(userEmail, allNewTechJobs);
      console.log(`Email sent to ${userEmail} with ${allNewTechJobs.length} new jobs`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Scraping completed',
        schoolsScraped: schools.length,
        totalJobsFound,
        totalNewTechJobs,
        failureCount,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Scraping failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
}

