const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const google = require('googleapis');
const { googleAuth } = require('google-auth-library');
const { googleSheets } = require('./googleSheets');
const mpesaPayment = require('./mpesaPayment');
require('dotenv').config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 5000;

// ✅ UPDATED CORS: allow multiple frontends
const allowedOrigins = [
  'https://peron-tips-frontend.vercel.app',
  'https://the-ancient-cross-stv.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps, curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Middleware for parsing JSON and form data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Google Sheets API (Example to get data)
app.get('/questions', async (req, res) => {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'service-account.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const range = 'A1:J10';
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    res.json(response.data.values);
  } catch (error) {
    console.error('Error fetching data from Google Sheets:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Example MPesa payment route
app.post('/mpesa/payment', async (req, res) => {
  const { phoneNumber, amount } = req.body;

  try {
    const paymentResponse = await mpesaPayment.initiatePayment(phoneNumber, amount);

    if (paymentResponse.status === 'success') {
      res.json({ message: 'Payment successful', paymentDetails: paymentResponse });
    } else {
      res.status(400).json({ message: 'Payment failed', error: paymentResponse });
    }
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Serve frontend static files (for production)
app.use(express.static(path.join(__dirname, 'frontend')));

// Fallback route to serve the frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
