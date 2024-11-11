const nodemailer = require("nodemailer");
const axios = require("axios");
const cheerio = require("cheerio");

const {
    insertNYSCTracking,
    selectNYSCTracking,
    updateNYSCTracking,
    deleteNYSCTracking,
    pool, // Import the database connection pool
  } = require("../db");

const NYSC_URLS = [
    "https://portal.nysc.org.ng/nysc/",
    "https://portal.nysc.org.ng/nysc1/",
    "https://portal.nysc.org.ng/nysc2/",
    "https://portal.nysc.org.ng/nysc3/",
    "https://portal.nysc.org.ng/nysc4/"
  ];

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

// Create new tracking
exports.createNYSCTracking = async (req, res) => {
    const client = await pool.connect(); // Get a client from the pool
    try {
      const { email, ownerId } = req.body; // Assuming ownerId is provided in the request
      let status = null; // Set initial status as NULL

      const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      };
    
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email format." });
      }

      // Check each NYSC URL for the current registration text
      for (const url of NYSC_URLS) {
        try {
          const response = await axios.get(url);
          const $ = cheerio.load(response.data);
          const registrationText = $("#ctl00_ContentPlaceHolder1_pActiveReg").text().trim();

          if (registrationText.includes("Mobilization Batch")) {
            checkNYSCRegistrationPage();
          }
          else {
            status = registrationText;
            console.log(`Fetched current registration status: ${registrationText}`);
            break;  // Exit loop once the first registration status is found
          }
        } catch (error) {
          console.error(`Error fetching registration status from ${url}:`, error);
        }
      }
      await insertNYSCTracking(client, email, status, ownerId);

      // Send email notification after successful subscription
      const subMailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.NOT_EMAIL, 
        subject: 'New NYSC Subscription',
        text: `A new user has subscribed to NYSC tracking.}.`,
      };

      // Send email without affecting subscription logic
      transporter.sendMail(subMailOptions, (error, info) => {
        if (error) {
          console.error("Error sending email: ", error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });

      res.status(201).json({ message: "NYSC tracking created." });
    } catch (error) {
      console.error("Error creating NYSC tracking:", error);
      res.status(500).json({ error: "Error creating NYSC tracking." });
    } finally {
      client.release(); // Always release the client back to the pool
    }
  };

// Retrieve all tracking
exports.getNYSCTracking = async (req, res) => {
    const client = await pool.connect();
    try {
      const data = await selectNYSCTracking(client);
      res.status(200).json(data);
    } catch (error) {
      console.error("Error retrieving NYSC tracking:", error);
      res.status(500).json({ error: "Error retrieving NYSC tracking." });
    } finally {
      client.release();
    }
  };

// Update tracking
exports.updateNYSCTracking = async (req, res) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const { newStatus } = req.body;
      await updateNYSCTracking(client, id, newStatus);
      res.status(200).json({ message: "NYSC tracking updated." });
    } catch (error) {
      console.error("Error updating NYSC tracking:", error);
      res.status(500).json({ error: "Error updating NYSC tracking." });
    } finally {
      client.release();
    }
  };

// Delete tracking
exports.deleteNYSCTracking = async (req, res) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      await deleteNYSCTracking(client, id);
      res.status(200).json({ message: "NYSC tracking deleted." });
    } catch (error) {
      console.error("Error deleting NYSC tracking:", error);
      res.status(500).json({ error: "Error deleting NYSC tracking." });
    } finally {
      client.release();
    }
  };
  

// Send email notifications to NYSC subscribers
async function notifySubscribers(emailList, message) {
  for (const email of emailList) {
    const unsubscribeLink = `https://emptycodes.wixstudio.io/nodulling/unsubscribe?type=nysc&email=${encodeURIComponent(email)}`;

    const personalizedMessage = `${message}\n\nIf you would like to unsubscribe, click here: ${unsubscribeLink}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "NYSC Registration Update",
      text: personalizedMessage,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`NYSC registration update notification sent to ${email}`);
    } catch (error) {
      console.error(`Error sending NYSC registration update email to ${email}:`, error);
    }
  }
}



// Check NYSC registration page and notify subscribers if there's a status change
exports.checkNYSCRegistrationPage = async () => {
    try {
      for (const url of NYSC_URLS) {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        const registrationText = $("#ctl00_ContentPlaceHolder1_pActiveReg").text().trim();
  
        if (registrationText.includes("Mobilization Batch")) {
          console.log(`Registration active on ${url}: ${registrationText}`);
  
          // Fetch subscribers whose last known status is outdated
          const subscribersToNotify = await pool.connect()
            .then(client => selectOutdatedNYSCSubscribers(client, registrationText).finally(() => client.release()));
  
          if (subscribersToNotify.length > 0) {
            const emailList = subscribersToNotify.map(subscriber => subscriber.email);
            await notifySubscribers(emailList, `NYSC Registration is now Active on https://portal.nysc.org.ng/nysc/ : ${registrationText}`);
  
            // Update the last known status for notified subscribers
          const client = await pool.connect();
          await Promise.all(subscribersToNotify.map(subscriber =>
            updateNYSCTracking(client, subscriber._id, registrationText)
          ));
          client.release();
          }
        } else {
          console.log(`No active registration on ${url}`);
        };
      }
    } catch (error) {
      console.error("Error checking NYSC registration page:", error);
    }
  };

  async function selectOutdatedNYSCSubscribers(client, currentStatus) {
    const selectStatement = `
      SELECT * FROM nysc_tracking 
      WHERE last_known_status IS NULL OR last_known_status <> $1;
    `;
    const result = await client.query(selectStatement, [currentStatus]);
    return result.rows;
  }