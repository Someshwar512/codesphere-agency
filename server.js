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

//Databse Connections Backend
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ DB Connection Failed:", err);
  } else {
    console.log("✅ MySQL Pool Connected");
    connection.release(); // IMPORTANT
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

// Mian Routes my Project
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

//Contact us API
app.post("/contact", (req, res) => {
  const { fname, lname, email, phone, message } = req.body;

  if (!fname || !email || !message) {
    return res.send("error");
  }

  //Email and Phone number frontend Vaildations
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[6-9]\d{9}$/;

  if (!emailRegex.test(email)) return res.send("error");
  if (phone && !phoneRegex.test(phone)) return res.send("error");

  // ✅ SEND RESPONSE FIRST (FAST)
  res.send("success");

  // ================= BACKGROUND WORK =================

  const checkQuery = `SELECT * FROM leads WHERE email = ? OR phone = ?`;

  db.query(checkQuery, [email, phone], (err, result) => {
    if (err) return console.log(err);

    if (result.length > 0) {
      return console.log("Duplicate entry");
    }

    const insertQuery = `
      INSERT INTO leads (fname, lname, email, phone, message)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.query(insertQuery, [fname, lname, email, phone, message], (err2) => {
      if (err2) return console.log(err2);

      // EMAIL IN BACKGROUND (NO WAIT)
  transporter.sendMail({
  from: `"Codesphere Agency" <${process.env.EMAIL_USER}>`,
  to: process.env.EMAIL_USER,
  subject: "🚀 New Lead Received",
  html: `
  <div style="font-family:Arial;padding:20px;background:#f4f4f4;">
    
    <div style="max-width:600px;margin:auto;background:white;padding:20px;border-radius:10px;">
      
      <h2 style="color:#2563eb;">New Client Inquiry</h2>
      
      <table style="width:100%;margin-top:15px;">
        <tr><td><b>Name:</b></td><td>${fname} ${lname}</td></tr>
        <tr><td><b>Email:</b></td><td>${email}</td></tr>
        <tr><td><b>Phone:</b></td><td>${phone || "Not provided"}</td></tr>
      </table>

      <div style="margin-top:20px;">
        <b>Message:</b>
        <p style="background:#f1f5f9;padding:10px;border-radius:6px;">
          ${message}
        </p>
      </div>

      <p style="margin-top:20px;font-size:12px;color:#666;">
        Received from Codesphere Website
      </p>

    </div>
  </div>
  `
}).catch(console.error);
     transporter.sendMail({
  from: `"Codesphere Agency" <${process.env.EMAIL_USER}>`,
  to: email,
  subject: "✅ We received your message",
  html: `
  <div style="font-family:Arial;padding:20px;background:#f4f4f4;">
    
    <div style="max-width:600px;margin:auto;background:white;padding:20px;border-radius:10px;">
      
      <h2 style="color:#2563eb;">Thank You, ${fname} 👋</h2>

      <p>We have received your message and our team will contact you  soon shortly.</p>

      <div style="margin-top:20px;">
        <b>Your Message:</b>
        <p style="background:#f1f5f9;padding:10px;border-radius:6px;">
          ${message}
        </p>
      </div>

      <hr style="margin:20px 0;">

      <p style="font-size:14px;">
        📧 Email: contact@codesphereagency.com <br>
        📞 Phone: +91 7028079359
      </p>

      <p style="margin-top:20px;font-size:12px;color:#666;">
        Codesphere Agency 🚀
      </p>

    </div>
  </div>
  `
}).catch(console.error);

    });
  });
});

// ChatBot API (Professional Version)
app.post("/chat", (req, res) => {
  const msg = req.body.message.toLowerCase();

  let reply = "I'm sorry, I didn't fully understand that. Could you please rephrase or contact our team directly? 😊";

  if (msg.includes("hi") || msg.includes("hello")) {
    reply = "Hello 👋 Welcome to Codesphere Agency! How can we assist you today?";
  }

  else if (msg.includes("price") || msg.includes("cost")) {
    reply = "Our website packages start from $199 💰. Pricing depends on your requirements. Would you like a custom quote?";
  }

  else if (msg.includes("services")) {
    reply = "We offer a range of services including:\n• Web Development 💻\n• UI/UX Design 🎨\n• E-commerce Solutions 🛒\n• SEO Optimization 📈\nHow can we help your business grow?";
  }

  else if (msg === "ok" || msg === "okay") {
    reply = "Great 👍 Please let us know if you'd like to proceed or need more details. We're here to help!";
  }

  else if (msg.includes("contact")) {
    reply = "You can reach us via our contact form or WhatsApp 📞 +91 7028079359. We typically respond within a few hours.";
  }

  else if (msg.includes("website")) {
    reply = "Yes, we specialize in building modern, responsive, and high-performance websites tailored to your business needs 🚀";
  }

  else if (msg.includes("time") || msg.includes("delivery")) {
    reply = "Our standard delivery time is 3–7 days depending on the project scope. We always aim for fast and quality delivery ⏱️";
  }

  else if (msg.includes("seo")) {
    reply = "Yes, we provide SEO services to help your website rank higher on Google and attract more customers 📈";
  }

  else if (msg.includes("portfolio") || msg.includes("work")) {
    reply = "We’d be happy to show you our recent projects! Please visit our portfolio section on the website or ask us for direct links 🔗";
  }

  else if (msg.includes("custom") || msg.includes("project")) {
    reply = "Great! We love working on custom projects 😊 Please share your requirements, and we’ll provide a tailored solution for you.";
  }

  else if (msg.includes("thanks") || msg.includes("thank you")) {
    reply = "You're welcome! 😊 If you have any more questions, feel free to ask anytime.";
  }

  res.json({ reply });
});

// Start Server
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on ports " + PORT);
});