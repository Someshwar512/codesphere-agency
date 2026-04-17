const express = require("express");
const mysql = require("mysql2");
const path = require("path");
const nodemailer = require("nodemailer");
const app = express();
require("dotenv").config();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

db.connect((err) => {
    if (err) {
        console.error("❌ Database connection failed:", err);
    } else {
        console.log("✅ Connected to MySQL");
    }
});

// Create table (FIXED)
const createTableQuery = `
CREATE TABLE IF NOT EXISTS leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fname VARCHAR(50),
    lname VARCHAR(50),
    email VARCHAR(100),
    phone VARCHAR(20),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
`;

db.query(createTableQuery, (err) => {
    if (err) {
        console.log("Table Error:", err);
    } else {
        console.log("Server running");
    }
});

// EMAIL SETUP
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Routes
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/contact", (req, res) => {
  const { fname, lname, email, phone, message } = req.body;

  // VALIDATION
  if (!fname || !email || !message) {
    return res.send("error");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[6-9]\d{9}$/;

  if (!emailRegex.test(email)) {
    return res.send("error");
  }

  if (phone && !phoneRegex.test(phone)) {
    return res.send("error");
  }

  // CHECK DUPLICATE
  const checkQuery = `
    SELECT * FROM leads 
    WHERE email = ? OR phone = ?
  `;

  db.query(checkQuery, [email, phone], (err, result) => {
    if (err) return res.send("error");

    if (result.length > 0) {
      return res.send("duplicate");
    }

    // INSERT DATA
    const insertQuery = `
      INSERT INTO leads (fname, lname, email, phone, message)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.query(insertQuery, [fname, lname, email, phone, message], async (err2) => {
      if (err2) return res.send("error");

      // ================= EMAIL PART =================

      try {
        // 1. EMAIL TO YOU (NEW LEAD)
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: process.env.EMAIL_USER,
          subject: "🚀 New Lead - Codesphere",
          html: `
            <h2>New Client Inquiry</h2>
            <p><b>Name:</b> ${fname} ${lname}</p>
            <p><b>Email:</b> ${email}</p>
            <p><b>Phone:</b> ${phone}</p>
            <p><b>Message:</b> ${message}</p>
          `
        });

        // 2. EMAIL TO CLIENT (CONFIRMATION)
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: "✅ We received your message - Codesphere",
          html: `
            <h2>Hello ${fname},</h2>
            <p>Thank you for contacting <b>Codesphere Agency</b>.</p>
            <p>We have received your message and will contact you soon.</p>
            <br>
            <p><b>Your Message:</b></p>
            <p>${message}</p>
            <br>
            <p>Regards,<br>Codesphere Team 🚀</p>
          `
        });

      } catch (mailErr) {
        console.log("Mail Error:", mailErr);
      }

      res.send("success");
    });
  });
});

app.post("/chat", (req, res) => {
  const msg = req.body.message.toLowerCase();

  let reply = "Sorry, I didn’t understand. Please contact us.";

  if(msg.includes("hi") || msg.includes("hello")){
    reply = "Hello 👋 Welcome to Codesphere Agency!";
  }
  else if(msg.includes("price")){
    reply = "Our pricing starts from $199 💰";
  }
  else if(msg.includes("services")){
    reply = "We offer Web Development, UI/UX, Ecommerce & SEO 🚀";
  }
  else if(msg.includes("contact")){
    reply = "You can contact us via form or WhatsApp 📞 7028079359";
  }
  else if(msg.includes("website")){
    reply = "Yes, we build modern websites for businesses 💻";
  }

  res.json({ reply });
});

// Start Server
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port " + PORT);
});