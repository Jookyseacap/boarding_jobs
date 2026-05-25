-- Boarding School Job Monitor - Supabase Schema

-- Table 1: Schools
CREATE TABLE schools (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  school_name VARCHAR(255) NOT NULL,
  country VARCHAR(50) NOT NULL,
  region VARCHAR(100),
  employment_url TEXT,
  school_website TEXT,
  notes TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_checked TIMESTAMP WITH TIME ZONE
);

-- Table 2: Job Postings
CREATE TABLE job_postings (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  job_title VARCHAR(255) NOT NULL,
  job_description TEXT,
  job_url TEXT UNIQUE,
  posted_date DATE,
  last_seen DATE,
  is_tech_role BOOLEAN DEFAULT FALSE,
  tech_keywords TEXT, -- comma-separated keywords found (e.g., "Python, DevOps, AWS")
  salary_range VARCHAR(255),
  location VARCHAR(255),
  employment_type VARCHAR(100), -- Full-time, Part-time, Contract, etc.
  remote_eligible BOOLEAN,
  housing_mentioned BOOLEAN DEFAULT FALSE,
  raw_html_snapshot TEXT, -- Store snapshot of job posting for comparison
  status VARCHAR(50) DEFAULT 'active', -- active, archived, closed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 3: Job Alerts (track what's been emailed to user)
CREATE TABLE job_alerts (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  job_posting_id BIGINT NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  user_email VARCHAR(255) NOT NULL,
  alert_sent_date TIMESTAMP WITH TIME ZONE,
  alert_type VARCHAR(50), -- 'new', 'updated', 'reminder'
  clicked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 4: Scraping Log (track when checks happen)
CREATE TABLE scraping_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  school_id BIGINT REFERENCES schools(id) ON DELETE SET NULL,
  check_start TIMESTAMP WITH TIME ZONE,
  check_end TIMESTAMP WITH TIME ZONE,
  jobs_found_count INT,
  jobs_new_count INT,
  status VARCHAR(50), -- success, failed, partial
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_job_postings_school_id ON job_postings(school_id);
CREATE INDEX idx_job_postings_is_tech_role ON job_postings(is_tech_role);
CREATE INDEX idx_job_postings_status ON job_postings(status);
CREATE INDEX idx_job_postings_created_at ON job_postings(created_at);
CREATE INDEX idx_job_alerts_job_posting_id ON job_alerts(job_posting_id);
CREATE INDEX idx_job_alerts_user_email ON job_alerts(user_email);
CREATE INDEX idx_scraping_logs_school_id ON scraping_logs(school_id);
CREATE INDEX idx_scraping_logs_created_at ON scraping_logs(created_at);

-- Row Level Security (RLS) - Optional but recommended
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_logs ENABLE ROW LEVEL SECURITY;

-- If you want to allow public read-only access to job_postings:
CREATE POLICY "Allow public read on job_postings" 
  ON job_postings FOR SELECT 
  USING (true);

-- To seed initial schools data, you can use the CSV import feature in Supabase:
-- 1. Go to SQL Editor
-- 2. Create the tables above
-- 3. Use Table Editor to bulk import the CSV file
-- Or use this command (replace with your CSV path):
-- COPY schools(school_name, country, region, employment_url, school_website, notes)
-- FROM '/path/to/boarding_schools_database.csv' 
-- WITH (FORMAT csv, HEADER true);
