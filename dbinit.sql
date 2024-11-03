-- Create table for NYSC Registration tracking
CREATE TABLE IF NOT EXISTS nysc_tracking (
    _id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    _createdDate TIMESTAMPTZ DEFAULT current_timestamp,
    _updatedDate TIMESTAMPTZ DEFAULT current_timestamp,
    _owner UUID NOT NULL,  -- Owner UUID to link the tracking record to a user
    email VARCHAR(255) NOT NULL,  -- User's email to receive notifications
    last_known_status VARCHAR(50)  -- Last known status for NYSC registration
);

-- Create table for GitHub Repository tracking
CREATE TABLE IF NOT EXISTS github_repo_tracking (
    _id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    _createdDate TIMESTAMPTZ DEFAULT current_timestamp,
    _updatedDate TIMESTAMPTZ DEFAULT current_timestamp,
    _owner UUID NOT NULL,
    email VARCHAR(255) NOT NULL,  -- User's email to receive notifications
    repo_url VARCHAR(255) NOT NULL,  -- GitHub repository URL entered by the user
    last_issue_count INT DEFAULT 0,  -- Number of open issues last counted for tracking
    last_closed_count INT DEFAULT 0   -- Number of closed issues last counted for tracking
);

-- Create table for Job Site tracking
CREATE TABLE IF NOT EXISTS job_site_tracking (
    _id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    _createdDate TIMESTAMPTZ DEFAULT current_timestamp,
    _updatedDate TIMESTAMPTZ DEFAULT current_timestamp,
    _owner UUID NOT NULL,
    email VARCHAR(255) NOT NULL,  -- User's email to receive notifications
    site_url VARCHAR(255) NOT NULL,  -- Job listing site URL entered by the user
    last_job_count INT DEFAULT 0  -- Number of job listings last counted for tracking
);
