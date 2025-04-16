// server.js

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { google } = require("googleapis");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;

// Google Sheets Setup
const auth = new google.auth.GoogleAuth({
  keyFile: "service-account.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

const SHEET_ID = process.env.SHEET_ID;
const sheets = google.sheets({ version: "v4", auth });

// Mpesa Access Token (for Live Environment)
let mpesaToken = null;

const getMpesaToken = async () => {
  const { MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET } = process.env;
  const authBuffer = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString("base64");

  try {
    const res = await axios.get("https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
      headers: {
        Authorization: `Basic ${authBuffer}`,
      },
    });
    mpesaToken = res.data.access_token;
  } catch (error) {
    console.error("Error getting Mpesa token:", error);
  }
};

// Simulated Reward Payment (replace with actual Mpesa B2C or STK push logic)
const rewardUser = async (phone, amount) => {
  await getMpesaToken();
  // Placeholder for actual reward logic using Mpesa
  console.log(`Rewarding ${phone} with Ksh ${amount}`);
  return true; // Simulate successful transaction
};

// Get Questions From Google Sheet
app.get("/api/questions/:section", async (req, res) => {
  const section = req.params.section.toUpperCase();
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${section}!A2:B11`,
    });
    const rows = response.data.values;
    const questions = rows.map(([question], index) => ({
      id: index + 1,
      question,
    }));
    const answers = rows.map(([_, answer]) => answer);
    res.json({ questions, answers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch questions." });
  }
});

// Handle Quiz Submission
app.post("/api/submit", async (req, res) => {
  const { section, userAnswers, phone } = req.body;

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${section.toUpperCase()}!B2:B11`,
    });
    const correctAnswers = response.data.values.map((row) => row[0]);

    let score = 0;
    for (let i = 0; i < correctAnswers.length; i++) {
      if (
        userAnswers[i] &&
        userAnswers[i].toString().trim().toLowerCase() === correctAnswers[i].trim().toLowerCase()
      ) {
        score++;
      }
    }

    if (score >= 8) {
      // If user wins, reward them with Ksh 200
      await rewardUser(phone, 200);
      return res.json({ success: true, score, message: "Congratulations! You won Ksh 200." });
    } else {
      return res.json({ success: false, score, message: "You did not reach the target. Try again." });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to evaluate answers." });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
