// server.js (with final debugging logs)

const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Cashfree API details
const CASHFREE_API_URL = 'https://api.cashfree.com/pg/orders';
const CLIENT_ID = process.env.CASHFREE_CLIENT_ID;
const CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET;

// Health Check endpoint
app.get('/', (req, res) => {
    res.status(200).send('Server is alive and running!');
});

// Create Order Endpoint with more detailed logs
app.post('/create-order', async (req, res) => {
    console.log("'/create-order' endpoint hit.");

    try {
        const { amount, userId, name, email, phone } = req.body;

        if (!CLIENT_ID || !CLIENT_SECRET) {
            console.error("FATAL: API Keys are not loaded from environment variables.");
            return res.status(500).json({ error: 'Server configuration error. API keys missing.' });
        }

        const orderId = `TFZ-${userId}-${Date.now()}`;

        const requestData = {
            customer_details: {
                customer_id: userId,
                customer_email: email,
                customer_phone: phone,
                customer_name: name,
            },
            order_meta: {
                return_url: `https://thefinalzoneg.web.app/addmoney.html?order_id={order_id}`,
            },
            order_id: orderId,
            order_amount: amount,
            order_currency: "INR",
        };

        const headers = {
            'Content-Type': 'application/json',
            'x-api-version': '2022-09-01',
            'x-client-id': CLIENT_ID,
            'x-client-secret': CLIENT_SECRET,
        };

        console.log("Calling Cashfree API...");
        const response = await axios.post(CASHFREE_API_URL, requestData, { headers });

        // ** YEH SABSE ZAROORI LOG HAI **
        // Cashfree se mile poore response ko print karna
        console.log("Full response from Cashfree:", JSON.stringify(response.data, null, 2));

        // Check karna ki response mein payment_session_id hai ya nahi
        if (response.data && response.data.payment_session_id) {
            console.log("Successfully got session ID. Sending response to frontend.");
            res.status(200).json(response.data);
        } else {
            console.error("Cashfree response OK, but payment_session_id is MISSING!");
            console.error("This could be due to incorrect API keys or other account issues on Cashfree's side.");
            res.status(500).json({ error: 'Failed to get session ID from payment gateway.' });
        }

    } catch (error) {
        console.error('!!!!!! CASHFREE API ERROR !!!!!!');
        if (error.response) {
            console.error('Error Data:', error.response.data);
            console.error('Error Status:', error.response.status);
        } else {
            console.error('Error Message:', error.message);
        }
        res.status(500).json({ error: 'Failed to create payment order.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
