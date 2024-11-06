const { Pool } = require("pg");
const { v4: uuidv4 } = require("uuid");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  application_name: "tracking_app",
  port: process.env.DB_PORT,
});

// Initial connection attempt
const connectWithRetry = () => {
  pool.connect()
    .then(client => {
      console.log("Connected to the database");
      client.release(); // Release the client after successful connection
    })
    .catch(err => {
      console.error("Database connection error:", err);
      console.log("Retrying connection in 5 seconds...");
      setTimeout(connectWithRetry, 5000); // Retry after 5 seconds
    });
};

// Start the connection attempt
connectWithRetry();


/* //const backoffInterval = 100; // milliseconds
//const maxTries = 5;

// Retry wrapper function
async function retryTxn(operation) {
  let tries = 0;

  while (true) {
    const client = await pool.connect();
    tries++;

    try {
      await client.query('BEGIN;');
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
    client.release();
  }
} */

// CRUD Operations

// INSERT operation for NYSC Tracking
async function insertNYSCTracking(client, email, status, ownerId) {
  const id = uuidv4();
  const defaultOwnerId = '09292c6b-60fa-42e6-ac73-041d2af69609';

// Use the parameter if it is not null; otherwise, use the hardcoded value
  const effectiveOwnerId = ownerId || defaultOwnerId;

  const insertStatement = `
    INSERT INTO nysc_tracking (_id, _createdDate, _updatedDate, _owner, email, last_known_status)
    VALUES ($1, current_timestamp, current_timestamp, $2, $3, $4)
  `;
  await client.query(insertStatement, [id,  effectiveOwnerId, email, status]);
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
async function insertGitHubRepoTracking(client, email, repoUrl, ownerId) {
    const id = uuidv4();
    const defaultOwnerId = '09292c6b-60fa-42e6-ac73-041d2af69609';

// Use the parameter if it is not null; otherwise, use the hardcoded value
    const effectiveOwnerId = ownerId || defaultOwnerId;

    const insertStatement = `
      INSERT INTO github_repo_tracking (_id, _createdDate, _updatedDate, _owner, email, repo_url, last_issue_count, last_closed_count)
      VALUES ($1, current_timestamp, current_timestamp, $2, $3, $4, 0, 0)
  `;
  await client.query(insertStatement, [id, effectiveOwnerId, email, repoUrl]);

  return id;
}

// SELECT operation for GitHub Repo Tracking
async function selectGitHubRepoTracking(client) {
    const selectStatement = `SELECT * FROM github_repo_tracking;`;
    const result = await client.query(selectStatement);
    return result.rows;
  }
  
 // UPDATE operation for GitHub Repo Tracking
async function updateGitHubRepoTracking(client, id, newIssueCount, newClosedCount) {
    const updateStatement = `
      UPDATE github_repo_tracking 
      SET last_issue_count = $1, last_closed_count = $2, _updatedDate = current_timestamp 
      WHERE _id = $3;
    `;
    await client.query(updateStatement, [newIssueCount, newClosedCount, id]);
  }
  
  
  // DELETE operation for GitHub Repo Tracking
  async function deleteGitHubRepoTracking(client, id) {
    const deleteStatement = `DELETE FROM github_repo_tracking WHERE _id = $1;`;
    await client.query(deleteStatement, [id]);
  }

  // INSERT operation for Job Site Tracking
async function insertJobSiteTracking(client, email, siteUrl, ownerId, initialJobCount) {
    const id = uuidv4();
    const defaultOwnerId = '09292c6b-60fa-42e6-ac73-041d2af69609';

// Use the parameter if it is not null; otherwise, use the hardcoded value
    const effectiveOwnerId = ownerId || defaultOwnerId;

    const insertStatement = `
      INSERT INTO job_site_tracking (_id, _createdDate, _updatedDate, _owner, email, site_url, last_job_count)
      VALUES ($1, current_timestamp, current_timestamp, $2, $3, $4, $5)
    `;
    await client.query(insertStatement, [id, effectiveOwnerId, email, siteUrl, initialJobCount]);
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

// DELETE operation for NYSC Tracking by email
async function deleteNYSCTrackingByEmail(client, email) {
  const deleteStatement = `DELETE FROM nysc_tracking WHERE email = $1;`;
  const result = await client.query(deleteStatement, [email]);
  return result.rowCount > 0; // Returns true if a row was deleted, otherwise false
}

// DELETE operation for GitHub Repo Tracking by email
async function deleteGitHubRepoTrackingByEmail(client, email) {
  const deleteStatement = `DELETE FROM github_repo_tracking WHERE email = $1;`;
  const result = await client.query(deleteStatement, [email]);
  return result.rowCount > 0; 
}

// DELETE operation for Job Site Tracking by email
async function deleteJobSiteTrackingByEmail(client, email) {
  const deleteStatement = `DELETE FROM job_site_tracking WHERE email = $1;`;
  const result = await client.query(deleteStatement, [email]);
  return result.rowCount > 0; 
}



/* // Run operations without retry logic
(async () => {
    const client = await pool.connect();
    
    try {
      // Insert NYSC Tracking entry
      await client.query('BEGIN;');
      await insertNYSCTracking(client, email, status, ownerId);
      await client.query('COMMIT;');
    
      // Select NYSC Tracking entries
      const nyscRows = await selectNYSCTracking(client);
      console.log("NYSC Tracking Records:", nyscRows);
    
      // Update NYSC Tracking status
      if (nyscRows.length > 0) {
        const nyscId = nyscRows[0]._id;
        await client.query('BEGIN;');
        await updateNYSCTracking(client, nyscId, "Active");
        await client.query('COMMIT;');
      }
    
      // Delete an NYSC Tracking record
      if (nyscRows.length > 0) {
        const nyscId = nyscRows[0]._id;
        await client.query('BEGIN;');
        await deleteNYSCTracking(client, nyscId);
        await client.query('COMMIT;');
      }
    
      // Insert GitHub Repo Tracking entry
      await client.query('BEGIN;');
      await insertGitHubRepoTracking(client, "user@example.com", "https://github.com/user/repo");
      await client.query('COMMIT;');
    
      // Select GitHub Repo Tracking entries
      const githubRows = await selectGitHubRepoTracking(client);
      console.log("GitHub Repo Tracking Records:", githubRows);
    
      // Update GitHub Repo Tracking
      if (githubRows.length > 0) {
        const githubId = githubRows[0]._id;
        const newIssueCount = 5; // Example new issue count
        await client.query('BEGIN;');
        await updateGitHubRepoTracking(client, githubId, newIssueCount);
        await client.query('COMMIT;');
      }
    
      // Delete a GitHub Repo Tracking record
      if (githubRows.length > 0) {
        const githubId = githubRows[0]._id;
        await client.query('BEGIN;');
        await deleteGitHubRepoTracking(client, githubId);
        await client.query('COMMIT;');
      }
    
      // Insert Job Site Tracking entry
      await client.query('BEGIN;');
      await insertJobSiteTracking(client, "user@example.com", "https://example-job-site.com");
      await client.query('COMMIT;');
    
      // Select Job Site Tracking entries
      const jobSiteRows = await selectJobSiteTracking(client);
      console.log("Job Site Tracking Records:", jobSiteRows);
    
      // Update Job Site Tracking
      if (jobSiteRows.length > 0) {
        const jobSiteId = jobSiteRows[0]._id;
        const newJobCount = 10; // Example new job count
        await client.query('BEGIN;');
        await updateJobSiteTracking(client, jobSiteId, newJobCount);
        await client.query('COMMIT;');
      }
    
      // Delete a Job Site Tracking record
      if (jobSiteRows.length > 0) {
        const jobSiteId = jobSiteRows[0]._id;
        await client.query('BEGIN;');
        await deleteJobSiteTracking(client, jobSiteId);
        await client.query('COMMIT;');
      }
    
    } catch (err) {
      console.error("Transaction error:", err);
    } finally {
      client.release();
    }
  })(); */

  // Export functions
module.exports = {
  pool,
  insertNYSCTracking,
  selectNYSCTracking,
  updateNYSCTracking,
  deleteNYSCTracking,
  deleteNYSCTrackingByEmail,
  insertGitHubRepoTracking,
  selectGitHubRepoTracking,
  updateGitHubRepoTracking,
  deleteGitHubRepoTracking,
  deleteGitHubRepoTrackingByEmail,
  insertJobSiteTracking,
  selectJobSiteTracking,
  updateJobSiteTracking,
  deleteJobSiteTracking,
  deleteJobSiteTrackingByEmail,
};