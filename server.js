const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const nodemailer = require("nodemailer");
const cors = require("cors");
require("dotenv").config();

const app = express();

// ================= MIDDLEWARE =================
app.use(cors());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

// ================= MONGODB =================
mongoose.connect(process.env.MONGO_URI)
.then(() => {
  console.log("✅ MongoDB Connected");
})
.catch((err) => {
  console.log("❌ MongoDB Error:", err);
});

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
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// EMAIL VERIFY
transporter.verify((error, success) => {
  if (error) {
    console.log("❌ EMAIL ERROR:", error);
  } else {
    console.log("✅ EMAIL SERVER READY");
  }
});

// ================= HOME ROUTE =================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ================= CONTACT API =================
app.post("/contact", async (req, res) => {

  try {

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

    // CHECK DUPLICATE
    const existing = await Lead.findOne({
      $or: [{ email }, { phone }]
    });

    if (existing) {
      return res.send("duplicate");
    }

    // SAVE DATABASE
    const newLead = new Lead({
      fname,
      lname,
      email,
      phone,
      message
    });

    

    await newLead.save();

    console.log("✅ Data Saved sucessfully");

    // SEND EMAIL TO ADMIN
    transporter.sendMail({
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
    }, (err, info) => {

      if (err) {
        console.log("❌ Admin Email Error:", err);
      } else {
        console.log("✅ Admin Email Sent");
      }

    });

    // SEND EMAIL TO USER
  // SEND EMAIL TO USER
transporter.sendMail({
  from: `"Codesphere Agency" <${process.env.EMAIL_USER}>`,
  to: email,
  replyTo: process.env.EMAIL_USER,
  subject: "We received your message - Codesphere Agency",
  html: `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6;">

        <h2>Thank You ${fname}!</h2>

        <p>We have received your message successfully.</p>

        <p>
          Our team at <strong>Codesphere Agency</strong>
          will review your request and contact you soon.
        </p>

        <br>

        <p>Regards,</p>
        <p><strong>Codesphere Agency</strong></p>

      </body>
    </html>
  `
}, (err, info) => {

  if (err) {
    console.log("❌ User Email Error:", err);
  } else {
    console.log("✅ User Email Sent:", info.messageId);
  }

});


    // resizeBy.arguments();
    // FINAL SUCCESS RESPONSE
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
  }
  else if (msg.includes("price")) {
    reply = "Our plans start from $199 💰";
  }
  else if (msg.includes("services")) {
    reply = "We provide Web Development, UI/UX Design & SEO 🚀";
  }

  res.json({ reply });

});

// ================= SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on port " + PORT);
});