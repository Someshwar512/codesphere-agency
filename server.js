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
  const { fname, lname, email, phone, message } = req.body;

  if (!fname || !email || !message) {
    return res.send("error");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[6-9]\d{9}$/;

  if (!emailRegex.test(email)) return res.send("error");
  if (phone && !phoneRegex.test(phone)) return res.send("error");

  res.send("success");

  try {
    // Check duplicate
    const existing = await Lead.findOne({
      $or: [{ email }, { phone }]
    });

    if (existing) {
      return console.log("Duplicate entry");
    }

    // Save data
    const newLead = new Lead({
      fname,
      lname,
      email,
      phone,
      message
    });

    await newLead.save();

    // Send email to admin
    transporter.sendMail({
      from: `"Codesphere Agency" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: "🚀 New Lead Received",
      html: `
        <h2>New Lead</h2>
        <p>Name: ${fname} ${lname}</p>
        <p>Email: ${email}</p>
        <p>Phone: ${phone}</p>
        <p>Message: ${message}</p>
      `
    }).catch(console.error);

    // Send email to user
    transporter.sendMail({
      from: `"Codesphere Agency" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "✅ We received your message",
      html: `
        <h2>Thank You ${fname}</h2>
        <p>We will contact you soon.</p>
      `
    }).catch(console.error);

  } catch (err) {
    console.log(err);
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