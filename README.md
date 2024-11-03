# No Dulling: Never Miss Important Updates

**No Dulling** is a tracking service designed to help users stay informed about changes to services and opportunities that matter to them. Whether it's the NYSC registration, GitHub repository issues, or new job listings on popular job sites, No Dulling automates the process of checking updates and notifies users immediately when changes occur.

---

## Features

### Options to Track

1. **NYSC Registration (Default)**
   - **Description**: Receive notifications when NYSC registration status changes.
   - **Trigger**: Tracks the NYSC registration page every 10 minutes, notifying users when the status changes to “Active Registration.”

2. **GitHub Repository Issues**
   - **Description**: Track new issues in a GitHub repository.
   - **Input**: Users provide a repository URL and an email.
   - **Trigger**: Checks each hour for new issues in the specified GitHub repository and notifies subscribed users.

3. **Job Listings on Company Sites**
   - **Description**: Monitor job openings on supported company sites.
   - **Input**: Users provide the company job site URL and an email.
   - **Trigger**: Performs a daily check for new job postings on the provided job site.
---

## API Structure

### Endpoints

1. **NYSC Registration Endpoint**
   - **`POST /subscribe/nysc`**
   - Accepts an email and adds the user to a list of subscribers for the NYSC registration page. The system checks every 10 minutes, and users are notified if the registration status changes.

2. **GitHub Repository Issues Endpoint**
   - **`POST /subscribe/github`**
   - Accepts a GitHub repository URL and an email. The system monitors the repository for new issues every hour and notifies the subscribed user if new issues are detected.

3. **Job Listings Endpoint**
   - **`POST /subscribe/jobsite`**
   - Accepts a job site URL and an email. The system performs a daily check for job postings on the site and notifies the user when new listings are available.

### Internal Scheduling and Checks
   - **NYSC Check**: Every 10 minutes, checks the NYSC registration status.
   - **GitHub Repos Check**: Every hour, iterates through tracked repositories to check for new issues.
   - **Job Sites Check**: Every 24 hours, reviews job sites for new listings.
   - Scheduled using `node-cron` to ensure consistent updates.

---

## Database Structure

The application uses a CockroachDB database to store user subscriptions, tracking entries, and last updated statuses:
1. **Tracking Tables**
   - Separate tables for NYSC, GitHub, and job sites, capturing the necessary details for each tracking type and allowing efficient checks and updates.

---

## Notifications

Notifications are sent using Nodemailer, configured with Gmail/SMTP. Each endpoint has logic for detecting changes and alerting users, ensuring they only receive updates when relevant information changes.

---

## Getting Started

1. **Prerequisites**
   - Node.js
   - CockroachDB
   - Nodemailer (for email notifications)

2. **Installation**
   - Clone the repository.
   - Install dependencies with `npm install`.
   - Configure CockroachDB and update credentials in the `config.js` file.
   - Set up Gmail/SMTP in Nodemailer.

3. **Running the Application**
   - Start the server: `node server.js`
   - The endpoints will be accessible as per the configurations, with regular cron jobs for monitoring.

---

## Disclaimer

> This service only works with publicly accessible pages that do not require authentication.

---

## Contributing

If you'd like to contribute to No Dulling, please create a pull request with a description of your proposed changes.