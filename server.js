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

// main Home route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ================= CONTACT API =================
app.post("/contact", async (req, res) => {
  const { fname, lname, email, phone, message } = req.body;

  // REQUIRED FIELDS
  if (!fname || !email || !message) {
    return res.send("error");
  }

  // VALIDATION
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[6-9]\d{9}$/;

  if (!emailRegex.test(email)) {
    return res.send("error");
  }

  if (phone && !phoneRegex.test(phone)) {
    return res.send("error");
  }

  try {

    // CHECK DUPLICATE
    const existing = await Lead.findOne({
      $or: [{ email }, { phone }]
    });

    if (existing) {
      return res.send("duplicate");
    }

    // SAVE DATA
    const newLead = new Lead({
      fname,
      lname,
      email,
      phone,
      message
    });

    await newLead.save();

    console.log("✅ Data Saved");

    // SEND ADMIN EMAIL
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "🚀 New Lead Received",
      html: `
        <h2>New Lead Received</h2>

        <p><b>First Name:</b> ${fname}</p>
        <p><b>Last Name:</b> ${lname}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Phone:</b> ${phone}</p>
        <p><b>Message:</b> ${message}</p>
      `
    });

    console.log("✅ Admin Email Sent");

    // SEND USER EMAIL
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "✅ We Received Your Message",
      html: `
        <h2>Thank You ${fname}</h2>

        <p>Your message has been received successfully.</p>

        <p>Our team will contact you soon.</p>

        <br>

        <p>Regards,</p>
        <p>Codesphere Agency</p>
      `
    });

    console.log("✅ User Email Sent");

    // FINAL SUCCESS
    res.send("success");

  } catch (err) {

    console.log("❌ CONTACT ERROR:", err);

    res.send("error");
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