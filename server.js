// server.js (Final Corrected Version)

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

// Firebase Admin SDK ko initialize karna
const admin = require('firebase-admin');
// Environment variable se Firebase credentials lena
const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();

// IMPORTANT: Webhook ke liye raw body zaroori hai
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(cors());

const PORT = process.env.PORT || 3000;

// Cashfree API details
const CASHFREE_API_URL = 'https://api.cashfree.com/pg/orders';
const CLIENT_ID = process.env.CASHFREE_CLIENT_ID;
const CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET;

// Health Check endpoint
app.get('/', (req, res) => {
    res.status(200).send('Server is alive and running!');
});

// Create Order Endpoint
app.post('/create-order', async (req, res) => {
    try {
        const { amount, userId, name, email, phone } = req.body;
        const orderId = `TFZ-${userId}-${Date.now()}`;

        const requestData = {
            customer_details: { customer_id: userId, customer_email: email, customer_phone: phone, customer_name: name },
            order_meta: { return_url: `https://thefinalzoneg.web.app/addmoney.html?order_id={order_id}` },
            order_id: orderId,
            order_amount: amount,
            order_currency: "INR",
        };
        const headers = { 'Content-Type': 'application/json', 'x-api-version': '2022-09-01', 'x-client-id': CLIENT_ID, 'x-client-secret': CLIENT_SECRET };

        const response = await axios.post(CASHFREE_API_URL, requestData, { headers });
        res.status(200).json(response.data);

    } catch (error) {
        console.error('Create Order Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to create payment order.' });
    }
});


// =================================================================
// >> FINAL CORRECTED Webhook Endpoint <<
// =================================================================
app.post('/webhook', async (req, res) => {
    try {
        const signature = req.headers['x-webhook-signature'];
        const timestamp = req.headers['x-webhook-timestamp'];
        const payload = req.rawBody;

        // Step 1: Signature verify karna
        const secret = CLIENT_SECRET;
        const dataToVerify = timestamp + payload;
        const expectedSignature = crypto.createHmac('sha256', secret).update(dataToVerify).digest('base64');

        if (signature !== expectedSignature) {
            console.warn("Webhook signature verification failed!");
            return res.status(400).send('Invalid signature');
        }

        // Step 2: Payment status check karna
        const webhookData = JSON.parse(payload);
        
        // FIX: '.data' yahan se hata diya gaya hai
        if (webhookData.order.order_status === 'PAID') {
            
            console.log('Payment Successful Webhook Received:', webhookData.order.order_id);

            const order = webhookData.order;
            const userId = order.customer_details.customer_id;
            const amountPaid = order.order_amount;
            let finalBalance = 0;

            // Step 3: Firestore Database mein balance update karna
            const userRef = db.collection('users').doc(userId);
            const transactionRef = db.collection('addMoneyRequests').doc();

            await db.runTransaction(async (t) => {
                const userDoc = await t.get(userRef);
                if (!userDoc.exists) {
                    throw new Error(`User with ID ${userId} not found!`);
                }
                const currentBalance = userDoc.data().depositBalance || 0;
                const newBalance = currentBalance + amountPaid;
                finalBalance = newBalance;
                
                t.update(userRef, { depositBalance: newBalance });
                
                // Transaction record banana
                t.set(transactionRef, {
                    userId: userId,
                    amount: amountPaid,
                    orderId: order.order_id,
                    transactionId: webhookData.payment.cf_payment_id,
                    status: 'SUCCESS',
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            });

            console.log(`Successfully updated balance for user ${userId}. New balance: ${finalBalance}`);
        } else {
             console.log(`Webhook received with status: ${webhookData.order.order_status}`);
        }

        res.status(200).send('Webhook processed');

    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).send('Error processing webhook');
    }
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
