# No Dulling: Never Miss Important Updates

**No Dulling** is a tracking service designed to help users stay informed about changes to services and opportunities that matter to them. Whether it's the NYSC registration, GitHub repository issues, or new job listings on popular job sites, No Dulling automates the process of checking updates and notifies users immediately when changes occur.

---
**Live Site:** https://emptycodes.wixstudio.io/nodulling
**Hosted API:** ttps://nodulling.onrender.com/
**Demo Link:** https://drive.google.com/file/d/1_rO9ufWEKPU7FPUbSmvYlox4qOl4t7na/view?usp=sharing

## Features

### Options to Track

1. **NYSC Registration (Default)**
   - **Description**: Receive notifications when NYSC registration status changes.
   - **Trigger**: Tracks the NYSC registration page every 9 minutes, notifying users when the status changes from "No Active Registration” to "Mobilization Batch ........".

2. **GitHub Repository Issues**
   - **Description**: Track new issues in a GitHub repository.
   - **Input**: Users provide a repository URL and an email.
   - **Trigger**: Checks each hour (and 11 minutes) for new issues in the specified GitHub repository and notifies subscribed users.

3. **Job Listings on Company Sites**
   - **Description**: Monitor job openings on supported company sites (greenhouse.io, smartrecruiters.com, zohorecruit.com, seamlesshiring.com)
   - **Input**: Users provide the company job site URL and an email.
   - **Trigger**: Performs a daily (~= 23.7 hours) check for new job postings on the provided job site.
---

## API Structure

It is currently hosted at: https://nodulling.onrender.com/. I recommend running the cron jobs on your localhost as it is expensive to do so on a hosted site.

### Endpoints

1. **NYSC Registration Endpoint**
   - **`POST /subscribe/nysc`**
   - Accepts an email and adds the user to a list of subscribers for the NYSC portal registration page. The system checks every 9 minutes, and users are notified if the registration status changes.

2. **GitHub Repository Issues Endpoint**
   - **`POST /subscribe/github`**
   - Accepts a GitHub repository URL and an email. The system monitors the repository for new issues every hour and notifies the subscribed user if new issues are detected.

3. **Job Listings Endpoint**
   - **`POST /subscribe/jobs`**
   - Accepts a job site URL and an email. The system performs a daily check for job postings on the site and notifies the user when new listings are available.

### Internal Scheduling and Checks
   - **NYSC Check**: Every 9 minutes, checks the NYSC registration status.
   - **GitHub Repos Check**: Every hour, iterates through tracked repositories to check for new issues.
   - **Job Sites Check**: Every 23.7 hours, reviews job sites for new listings.
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
   - Configure CockroachDB and update credentials in your .env file.
   - Set up Gmail/SMTP in Nodemailer.

3. **Running the Application**
   - Start the server: `node app.js`
   - The endpoints will be accessible as per the configurations, with regular cron jobs for monitoring.

---

## Disclaimer

> This service only works with publicly accessible pages that do not require authentication.
>
> This project includes functionality that extracts publicly available information from websites for the purpose of notification services. This scraping process respects the intellectual property rights of the site owners and aims to adhere to all applicable laws and terms of service. The data collected is limited to publicly accessible content necessary for providing timely updates to subscribed users. No proprietary information, private data, or copyrighted material is stored or reproduced in this project.
>
> Please note:
>
> This project does not intend to replicate or misappropriate the original content, user interface, or any other proprietary aspects of the scraped websites. If any website owner has concerns regarding this process or would prefer their site to be excluded from such activity, please contact us, and we will promptly cease scraping that website. By using this project, users agree to act responsibly and comply with the terms of service of any third-party site from which data is collected

---

## Contributing

If you'd like to contribute to No Dulling, please create a pull request with a description of your proposed changes.
