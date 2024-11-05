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
        switch (type) {
            case 'nysc':
                await deleteNYSCTrackingByEmail(client, email);
                break;
            case 'github':
                await deleteGitHubRepoTrackingByEmail(client, email);
                break;
            case 'job_site':
                await deleteJobSiteTrackingByEmail(client, email);
                break;
            default:
                return res.status(400).json({ message: 'Invalid type.' });
        }

        res.status(200).json({ message: `Successfully unsubscribed ${email} from ${type} notifications.` });
    } catch (error) {
        console.error('Error during unsubscribe process:', error);
        res.status(500).json({ message: 'An error occurred while unsubscribing. Please try again later.' });
    } finally {
        if (client) {
            client.release(); 
        }
    }
};