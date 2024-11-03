const { Pool } = require("pg");
const { v4: uuidv4 } = require("uuid");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  application_name: "tracking_app",
});

const backoffInterval = 100; // milliseconds
const maxTries = 5;

// Retry wrapper function
async function retryTxn(client, operation) {
  let tries = 0;

  while (true) {
    await client.query('BEGIN;');
    tries++;

    try {
      const result = await operation(client);
      await client.query('COMMIT;');
      return result;
    } catch (err) {
      await client.query('ROLLBACK;');

      if (err.code !== '40001' || tries === maxTries) {
        throw err;
      } else {
        console.log(`Transaction failed. Retrying attempt ${tries}.`);
        await new Promise(r => setTimeout(r, tries * backoffInterval));
      }
    }
  }
}

// CRUD Operations

// INSERT operation for NYSC Tracking
async function insertNYSCTracking(client, email, status) {
  const id = uuidv4();
  const insertStatement = `
    INSERT INTO nysc_tracking (_id, _createdDate, _updatedDate, _owner, email, last_known_status)
    VALUES ($1, current_timestamp, current_timestamp, NULL, $2, $3)
  `;
  await client.query(insertStatement, [id, email, status]);
}

// SELECT operation for NYSC Tracking
async function selectNYSCTracking(client) {
  const selectStatement = `SELECT * FROM nysc_tracking;`;
  const result = await client.query(selectStatement);
  return result.rows;
}

// UPDATE operation for NYSC Tracking
async function updateNYSCTracking(client, id, newStatus) {
  const updateStatement = `
    UPDATE nysc_tracking SET last_known_status = $1, _updatedDate = current_timestamp WHERE _id = $2;
  `;
  await client.query(updateStatement, [newStatus, id]);
}

// DELETE operation for NYSC Tracking
async function deleteNYSCTracking(client, id) {
  const deleteStatement = `DELETE FROM nysc_tracking WHERE _id = $1;`;
  await client.query(deleteStatement, [id]);
}

// INSERT operation for GitHub Repo Tracking
async function insertGitHubRepoTracking(client, email, repoUrl) {
  const id = uuidv4();
  const insertStatement = `
    INSERT INTO github_repo_tracking (_id, _createdDate, _updatedDate, _owner, email, repo_url, last_issue_count)
    VALUES ($1, current_timestamp, current_timestamp, NULL, $2, $3, 0)
  `;
  await client.query(insertStatement, [id, email, repoUrl]);
}

// SELECT operation for GitHub Repo Tracking
async function selectGitHubRepoTracking(client) {
    const selectStatement = `SELECT * FROM github_repo_tracking;`;
    const result = await client.query(selectStatement);
    return result.rows;
  }
  
  // UPDATE operation for GitHub Repo Tracking
  async function updateGitHubRepoTracking(client, id, newIssueCount) {
    const updateStatement = `
      UPDATE github_repo_tracking SET last_issue_count = $1, _updatedDate = current_timestamp WHERE _id = $2;
    `;
    await client.query(updateStatement, [newIssueCount, id]);
  }
  
  // DELETE operation for GitHub Repo Tracking
  async function deleteGitHubRepoTracking(client, id) {
    const deleteStatement = `DELETE FROM github_repo_tracking WHERE _id = $1;`;
    await client.query(deleteStatement, [id]);
  }

  // INSERT operation for Job Site Tracking
async function insertJobSiteTracking(client, email, siteUrl) {
    const id = uuidv4();
    const insertStatement = `
      INSERT INTO job_site_tracking (_id, _createdDate, _updatedDate, _owner, email, site_url, last_job_count)
      VALUES ($1, current_timestamp, current_timestamp, NULL, $2, $3, 0)
    `;
    await client.query(insertStatement, [id, email, siteUrl]);
  }
  
  // SELECT operation for Job Site Tracking
  async function selectJobSiteTracking(client) {
    const selectStatement = `SELECT * FROM job_site_tracking;`;
    const result = await client.query(selectStatement);
    return result.rows;
  }
  
  // UPDATE operation for Job Site Tracking
  async function updateJobSiteTracking(client, id, newJobCount) {
    const updateStatement = `
      UPDATE job_site_tracking SET last_job_count = $1, _updatedDate = current_timestamp WHERE _id = $2;
    `;
    await client.query(updateStatement, [newJobCount, id]);
  }
  
  // DELETE operation for Job Site Tracking
  async function deleteJobSiteTracking(client, id) {
    const deleteStatement = `DELETE FROM job_site_tracking WHERE _id = $1;`;
    await client.query(deleteStatement, [id]);
  }

// Run operations within retry logic
(async () => {
    const client = await pool.connect();
  
    try {
      // Insert NYSC Tracking entry
      await retryTxn(0, 15, client, (client) => insertNYSCTracking(client, "user@example.com", "Pending"));
  
      // Select NYSC Tracking entries
      const nyscRows = await retryTxn(0, 15, client, selectNYSCTracking);
      console.log("NYSC Tracking Records:", nyscRows);
  
      // Update NYSC Tracking status
      if (nyscRows.length > 0) {
        const nyscId = nyscRows[0]._id;
        await retryTxn(0, 15, client, (client) => updateNYSCTracking(client, nyscId, "Active"));
      }
  
      // Delete an NYSC Tracking record
      if (nyscRows.length > 0) {
        const nyscId = nyscRows[0]._id;
        await retryTxn(0, 15, client, (client) => deleteNYSCTracking(client, nyscId));
      }
  
      // Insert GitHub Repo Tracking entry
      await retryTxn(0, 15, client, (client) => insertGitHubRepoTracking(client, "user@example.com", "https://github.com/user/repo"));
  
      // Select GitHub Repo Tracking entries
      const githubRows = await retryTxn(0, 15, client, selectGitHubRepoTracking);
      console.log("GitHub Repo Tracking Records:", githubRows);
  
      // Update GitHub Repo Tracking
      if (githubRows.length > 0) {
        const githubId = githubRows[0]._id;
        const newIssueCount = 5; // Example new issue count
        await retryTxn(0, 15, client, (client) => updateGitHubRepoTracking(client, githubId, newIssueCount));
      }
  
      // Delete a GitHub Repo Tracking record
      if (githubRows.length > 0) {
        const githubId = githubRows[0]._id;
        await retryTxn(0, 15, client, (client) => deleteGitHubRepoTracking(client, githubId));
      }
  
      // Insert Job Site Tracking entry
      await retryTxn(0, 15, client, (client) => insertJobSiteTracking(client, "user@example.com", "https://example-job-site.com"));
  
      // Select Job Site Tracking entries
      const jobSiteRows = await retryTxn(0, 15, client, selectJobSiteTracking);
      console.log("Job Site Tracking Records:", jobSiteRows);
  
      // Update Job Site Tracking
      if (jobSiteRows.length > 0) {
        const jobSiteId = jobSiteRows[0]._id;
        const newJobCount = 10; // Example new job count
        await retryTxn(0, 15, client, (client) => updateJobSiteTracking(client, jobSiteId, newJobCount));
      }
  
      // Delete a Job Site Tracking record
      if (jobSiteRows.length > 0) {
        const jobSiteId = jobSiteRows[0]._id;
        await retryTxn(0, 15, client, (client) => deleteJobSiteTracking(client, jobSiteId));
      }
  
    } catch (err) {
      console.error("Transaction error:", err);
    } finally {
      client.release();
    }
  })();

  // Export functions
module.exports = {
  pool,
  retryTxn,
  insertNYSCTracking,
  selectNYSCTracking,
  updateNYSCTracking,
  deleteNYSCTracking,
  insertGitHubRepoTracking,
  selectGitHubRepoTracking,
  updateGitHubRepoTracking,
  deleteGitHubRepoTracking,
  insertJobSiteTracking,
  selectJobSiteTracking,
  updateJobSiteTracking,
  deleteJobSiteTracking,
};