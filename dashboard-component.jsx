import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function BoardingSchoolJobDashboard() {
  const [jobs, setJobs] = useState([]);
  const [schools, setSchools] = useState([]);
  const [filters, setFilters] = useState({
    country: '',
    searchTerm: '',
    techKeyword: '',
    onlyNew: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, newThis week: 0, countries: 0 });

  // Initialize Supabase client
  const supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.REACT_APP_SUPABASE_ANON_KEY
  );

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      
      // Fetch schools
      const { data: schoolsData, error: schoolsError } = await supabase
        .from('schools')
        .select('*')
        .eq('active', true);

      if (schoolsError) throw schoolsError;
      setSchools(schoolsData || []);

      // Fetch all tech jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from('job_postings')
        .select('*, schools(school_name, country)')
        .eq('is_tech_role', true)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      setJobs(jobsData || []);

      // Calculate stats
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const newThisWeek = (jobsData || []).filter(
        j => new Date(j.created_at) > oneWeekAgo
      ).length;

      const uniqueCountries = new Set(
        (schoolsData || []).map(s => s.country)
      ).size;

      setStats({
        total: jobsData?.length || 0,
        newThisWeek,
        countries: uniqueCountries,
      });

      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Filter jobs based on criteria
  const filteredJobs = jobs.filter(job => {
    const schoolCountry = job.schools?.country || '';
    const jobTitle = job.job_title?.toLowerCase() || '';
    const techKeywords = job.tech_keywords?.toLowerCase() || '';
    const description = job.job_description?.toLowerCase() || '';

    const matchesCountry =
      !filters.country || schoolCountry === filters.country;

    const matchesSearch =
      !filters.searchTerm ||
      jobTitle.includes(filters.searchTerm.toLowerCase()) ||
      description.includes(filters.searchTerm.toLowerCase());

    const matchesTechKeyword =
      !filters.techKeyword ||
      techKeywords.includes(filters.techKeyword.toLowerCase());

    const matchesNew =
      !filters.onlyNew ||
      new Date(job.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    return matchesCountry && matchesSearch && matchesTechKeyword && matchesNew;
  });

  const countries = [...new Set(schools.map(s => s.country))].sort();
  const allTechKeywords = [
    ...new Set(
      jobs
        .flatMap(j => j.tech_keywords?.split(', ') || [])
        .filter(k => k)
    ),
  ].sort();

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'var(--font-sans)' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 500, marginBottom: '0.5rem' }}>
          Boarding School Tech Jobs
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0 }}>
          Real-time monitoring of technology positions across boarding schools worldwide
        </p>
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
          marginBottom: '2rem',
        }}
      >
        <div
          style={{
            background: 'var(--color-background-secondary)',
            padding: '1rem',
            borderRadius: 'var(--border-radius-md)',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '0 0 0.5rem 0' }}>
            Total postings
          </p>
          <p style={{ fontSize: '24px', fontWeight: 500, margin: 0 }}>
            {stats.total}
          </p>
        </div>
        <div
          style={{
            background: 'var(--color-background-secondary)',
            padding: '1rem',
            borderRadius: 'var(--border-radius-md)',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '0 0 0.5rem 0' }}>
            New this week
          </p>
          <p style={{ fontSize: '24px', fontWeight: 500, margin: 0, color: 'var(--color-text-info)' }}>
            {stats.newThisWeek}
          </p>
        </div>
        <div
          style={{
            background: 'var(--color-background-secondary)',
            padding: '1rem',
            borderRadius: 'var(--border-radius-md)',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '0 0 0.5rem 0' }}>
            Countries
          </p>
          <p style={{ fontSize: '24px', fontWeight: 500, margin: 0 }}>
            {stats.countries}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          background: 'var(--color-background-primary)',
          border: '0.5px solid var(--color-border-tertiary)',
          borderRadius: 'var(--border-radius-lg)',
          padding: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        <h3 style={{ fontSize: '14px', fontWeight: 500, marginTop: 0, marginBottom: '1rem' }}>
          Filters
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
          }}
        >
          <div>
            <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
              Country
            </label>
            <select
              value={filters.country}
              onChange={e => setFilters({ ...filters, country: e.target.value })}
              style={{ width: '100%' }}
            >
              <option value="">All countries</option>
              {countries.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
              Search
            </label>
            <input
              type="text"
              placeholder="e.g., Python, DevOps..."
              value={filters.searchTerm}
              onChange={e => setFilters({ ...filters, searchTerm: e.target.value })}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
              Tech keyword
            </label>
            <select
              value={filters.techKeyword}
              onChange={e => setFilters({ ...filters, techKeyword: e.target.value })}
              style={{ width: '100%' }}
            >
              <option value="">All skills</option>
              {allTechKeywords.map(k => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={filters.onlyNew}
                onChange={e => setFilters({ ...filters, onlyNew: e.target.checked })}
              />
              This week
            </label>
          </div>
        </div>
      </div>

      {/* Job Listings */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
          Loading jobs...
        </div>
      )}

      {error && (
        <div
          style={{
            background: 'var(--color-background-danger)',
            color: 'var(--color-text-danger)',
            padding: '1rem',
            borderRadius: 'var(--border-radius-md)',
            marginBottom: '1rem',
          }}
        >
          Error: {error}
        </div>
      )}

      {!loading && filteredJobs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
          No jobs match your filters.
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '12px',
        }}
      >
        {filteredJobs.map(job => (
          <div
            key={job.id}
            style={{
              background: 'var(--color-background-primary)',
              border: '0.5px solid var(--color-border-tertiary)',
              borderRadius: 'var(--border-radius-lg)',
              padding: '1.25rem',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-border-secondary)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border-tertiary)'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 500, margin: '0 0 0.25rem 0' }}>
                {job.job_title}
              </h4>
              {new Date(job.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
                <span
                  style={{
                    background: 'var(--color-background-success)',
                    color: 'var(--color-text-success)',
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: 'var(--border-radius-md)',
                    whiteSpace: 'nowrap',
                    marginLeft: '8px',
                  }}
                >
                  New
                </span>
              )}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 0.75rem 0' }}>
              {job.schools?.school_name} • {job.schools?.country}
            </p>
            {job.job_description && (
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 0.75rem 0', lineHeight: '1.5' }}>
                {job.job_description.substring(0, 150)}...
              </p>
            )}
            {job.tech_keywords && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                {job.tech_keywords.split(', ').slice(0, 3).map(keyword => (
                  <span
                    key={keyword}
                    style={{
                      background: 'var(--color-background-info)',
                      color: 'var(--color-text-info)',
                      fontSize: '11px',
                      padding: '4px 8px',
                      borderRadius: 'var(--border-radius-md)',
                    }}
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            )}
            <a
              href={job.job_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                color: 'var(--color-text-info)',
                fontSize: '13px',
                textDecoration: 'none',
                borderBottom: '1px solid currentColor',
              }}
            >
              View posting →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
