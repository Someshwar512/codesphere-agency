const express = require("express");
const mysql = require("mysql2");
const path = require("path");

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// MySQL Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "root123",
    database: process.env.DB_NAME || "agency_db"
});

db.connect((err) => {
    if (err) {
        console.log("DB Error:", err);
    } else {
        console.log("DB Connected");
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

// Routes
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/contact", (req, res) => {
    const { fname, lname, email, phone, message } = req.body;

    const sql = `
        INSERT INTO leads (fname, lname, email, phone, message)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(sql, [fname, lname, email, phone, message], (err) => {
        if (err) {
            console.log("Insert Error:", err);
            return res.status(500).send("error");
        }
        return res.send("success");
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
app.listen(3000, "0.0.0.0", () => {
    console.log("Server running on port 3000");
});