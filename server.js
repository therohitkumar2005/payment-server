// server.js

const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config(); // API keys ko load karne ke liye

const app = express();
app.use(cors()); // Cross-Origin Resource Sharing enable karein
app.use(express.json()); // JSON data ko samajhne ke liye

const PORT = process.env.PORT || 3000;

// Cashfree API details
const CASHFREE_API_URL = 'https://api.cashfree.com/pg/orders';
const CLIENT_ID = process.env.CASHFREE_CLIENT_ID;
const CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET;

// Endpoint jisse aapki HTML file call karegi
app.post('/create-order', async (req, res) => {
    try {
        const { amount, userId, name, email, phone } = req.body;

        // Ek unique Order ID banayein (timestamp + userId)
        const orderId = `TFZ-${userId}-${Date.now()}`;

        const requestData = {
            customer_details: {
                customer_id: userId,
                customer_email: email,
                customer_phone: phone,
                customer_name: name,
            },
            order_meta: {
                return_url: "https://your-website.com/return?order_id={order_id}", // Payment ke baad user yahan redirect hoga
            },
            order_id: orderId,
            order_amount: amount,
            order_currency: "INR",
        };

        const headers = {
            'Content-Type': 'application/json',
            'x-api-version': '2022-09-01', // Cashfree ka recommended version
            'x-client-id': CLIENT_ID,
            'x-client-secret': CLIENT_SECRET,
        };

        // Cashfree API ko call karke order banayein
        const response = await axios.post(CASHFREE_API_URL, requestData, { headers });

        // Cashfree se mila payment_session_id frontend ko bhejein
        res.status(200).json(response.data);

    } catch (error) {
        console.error('Error creating order:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to create payment order.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});