const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();

// ================= MIDDLEWARE =================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ================= MONGODB CONNECTION =================
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log("❌ MongoDB Error:", err));

// ================= SCHEMA =================
const leadSchema = new mongoose.Schema({
  fname: String,
  lname: String,
  email: String,
  phone: String,
  message: String,
  created_at: {
    type: Date,
    default: Date.now
  }
});

const Lead = mongoose.model("Lead", leadSchema);

// ================= EMAIL SETUP =================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ================= ROUTES =================

// Home route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ================= CONTACT API =================
app.post("/contact", async (req, res) => {
  try {
    const { fname, lname, email, phone, message } = req.body;

    // ================= VALIDATION =================
    if (!fname || !email || !message) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[6-9]\d{9}$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email" });
    }

    if (phone && !phoneRegex.test(phone)) {
      return res.status(400).json({ success: false, message: "Invalid phone" });
    }

    // ================= DUPLICATE CHECK =================
    const existing = await Lead.findOne({
      $or: [{ email }, { phone }]
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "duplicate"
      });
    }

    // ================= SAVE TO MONGODB =================
    const newLead = new Lead({
      fname,
      lname,
      email,
      phone,
      message
    });

    await newLead.save();
    console.log("✅ Lead saved to MongoDB:", email);

    // ================= EMAIL TO ADMIN =================
    await transporter.sendMail({
      from: `"Codesphere Agency" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: "🚀 New Lead Received",
      html: `
        <h2>New Lead</h2>
        <p><b>Name:</b> ${fname} ${lname}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Phone:</b> ${phone}</p>
        <p><b>Message:</b> ${message}</p>
      `
    });

    console.log("📩 Admin email sent");

    // ================= EMAIL TO USER =================
    await transporter.sendMail({
      from: `"Codesphere Agency" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "✅ We received your message",
      html: `
        <h2>Hi ${fname} 👋</h2>
        <p>Thank you for contacting Codesphere Agency.</p>
        <p>We will get back to you soon 🚀</p>
      `
    });

    console.log("📩 User email sent");

    // ================= FINAL RESPONSE =================
    return res.json({
      success: true,
      message: "Lead saved & emails sent"
    });

  } catch (err) {
    console.log("❌ CONTACT ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// ================= CHATBOT =================
app.post("/chat", (req, res) => {
  const msg = req.body.message.toLowerCase();

  let reply = "Sorry, I didn't understand.";

  if (msg.includes("hi") || msg.includes("hello")) {
    reply = "Hello 👋 Welcome to Codesphere!";
  } else if (msg.includes("price")) {
    reply = "Our plans start from $199 💰";
  } else if (msg.includes("services")) {
    reply = "We provide Web Dev, UI/UX, SEO 🚀";
  }

  res.json({ reply });
});

// ================= SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on port " + PORT);
});