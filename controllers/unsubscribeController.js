const { Pool } = require("pg");
const { deleteNYSCTrackingByEmail, deleteJobSiteTrackingByEmail, deleteGitHubRepoTrackingByEmail, pool } = require("../db");

exports.unsubscribeUser = async (req, res) => {
    const { email, type } = req.body;

    if (!email || !type) {
        return res.status(400).json({ message: 'Email and tracking type are required.' });
    }

    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      };
    
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email format." });
      }

    let client;
    try {
        client = await pool.connect(); 
        let unsubscribeSuccess = false;

        switch (type) {
            case 'nysc':
                unsubscribeSuccess = await deleteNYSCTrackingByEmail(client, email);
                break;
            case 'github':
                unsubscribeSuccess = await deleteGitHubRepoTrackingByEmail(client, email);
                break;
            case 'job_site':
                unsubscribeSuccess = await deleteJobSiteTrackingByEmail(client, email);
                break;
            default:
                return res.status(400).json({ message: 'Invalid type.' });
        }

        if (unsubscribeSuccess) {
            return res.status(200).json({ message: `Successfully unsubscribed ${email} from ${type} notifications.` });
        } else {
            return res.status(404).json({ message: `${email} not found for ${type} subscription.` });
        }
    } catch (error) {
        console.error('Error during unsubscribe process:', error);
        res.status(500).json({ message: 'An error occurred while unsubscribing. Please try again later.' });
    } finally {
        if (client) {
            client.release(); 
        }
    }
};