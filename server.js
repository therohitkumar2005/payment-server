// server.js (with added debugging logs)

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

// =================================================================
// STEP 1: Health Check - Check if the server is alive
// =================================================================
app.get('/', (req, res) => {
    console.log("Health check endpoint was hit!");
    res.status(200).send('Server is alive and running!');
});


// =================================================================
// STEP 2: Create Order Endpoint with more logs
// =================================================================
app.post('/create-order', async (req, res) => {
    // Jasoosi Log 1: Check if the request reached here
    console.log("'/create-order' endpoint hit. Request body:", req.body);

    // Jasoosi Log 2: Check if API keys are loaded (only first 5 chars for security)
    console.log("CLIENT_ID loaded:", CLIENT_ID ? CLIENT_ID.substring(0, 5) + '...' : 'NOT LOADED');
    console.log("CLIENT_SECRET loaded:", CLIENT_SECRET ? CLIENT_SECRET.substring(0, 5) + '...' : 'NOT LOADED');

    try {
        const { amount, userId, name, email, phone } = req.body;

        // Check if essential data is missing
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
                // IMPORTANT: Change this to your actual return URL
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

        // Jasoosi Log 3: Log before calling Cashfree
        console.log("Calling Cashfree API with orderId:", orderId);
        const response = await axios.post(CASHFREE_API_URL, requestData, { headers });

        // Jasoosi Log 4: Log on successful response from Cashfree
        console.log("Successfully created order with Cashfree. Sending response to frontend.");
        res.status(200).json(response.data);

    } catch (error) {
        // This is the most important log for errors
        console.error('!!!!!! CASHFREE API ERROR !!!!!!');
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('Error Data:', error.response.data);
            console.error('Error Status:', error.response.status);
            console.error('Error Headers:', error.response.headers);
        } else if (error.request) {
            // The request was made but no response was received
            console.error('Error Request:', error.request);
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error Message:', error.message);
        }
        console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        res.status(500).json({ error: 'Failed to create payment order.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
