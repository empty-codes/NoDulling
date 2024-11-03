const nodemailer = require("nodemailer");
const axios = require("axios");
const cheerio = require("cheerio");

const { retryTxn, insertNYSCTracking, selectNYSCTracking, updateNYSCTracking, deleteNYSCTracking } = require("../db");

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

exports.createNYSCTracking = async (req, res) => {
  try {
    const { email, status } = req.body;
    await retryTxn(async (client) => insertNYSCTracking(client, email, status));
    res.status(201).send("NYSC tracking created.");
  } catch (error) {
    res.status(500).send("Error creating NYSC tracking.");
  }
};

exports.getNYSCTracking = async (req, res) => {
  try {
    const data = await retryTxn(async (client) => selectNYSCTracking(client));
    res.status(200).json(data);
  } catch (error) {
    res.status(500).send("Error retrieving NYSC tracking.");
  }
};

exports.updateNYSCTracking = async (req, res) => {
  try {
    const { id } = req.params;
    const { newStatus } = req.body;
    await retryTxn(async (client) => updateNYSCTracking(client, id, newStatus));
    res.status(200).send("NYSC tracking updated.");
  } catch (error) {
    res.status(500).send("Error updating NYSC tracking.");
  }
};

exports.deleteNYSCTracking = async (req, res) => {
  try {
    const { id } = req.params;
    await retryTxn(async (client) => deleteNYSCTracking(client, id));
    res.status(200).send("NYSC tracking deleted.");
  } catch (error) {
    res.status(500).send("Error deleting NYSC tracking.");
  }
};

async function notifySubscribers(emailList, message) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: emailList,
    subject: "NYSC Registration Update",
    text: message,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Notifications sent to subscribers");
  } catch (error) {
    console.error("Error sending email notifications:", error);
  }
}

exports.checkNYSCRegistrationPage = async () => {
    try {
      for (const url of NYSC_URLS) {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
  
        const registrationText = $("#ctl00_ContentPlaceHolder1_pActiveReg").text().trim();
  
        if (registrationText.includes("Mobilization Batch")) {
          console.log(`Registration active on ${url}: ${registrationText}`);
  
          // Fetch subscribers whose last known status is outdated
          const subscribersToNotify = await retryTxn(async (client) =>
            selectOutdatedNYSCSubscribers(client, registrationText)
          );
  
          if (subscribersToNotify.length > 0) {
            const emailList = subscribersToNotify.map(subscriber => subscriber.email);
            await notifySubscribers(emailList, `NYSC Registration Update: ${registrationText}`);
  
            // Update the last known status for notified subscribers
            await retryTxn(async (client) =>
              updateNYSCStatusForSubscribers(client, subscribersToNotify, registrationText)
            );
          }
        } else {
          console.log(`No active registration on ${url}`);
        }
      }
    } catch (error) {
      console.error("Error checking NYSC registration page:", error);
    }
  };  