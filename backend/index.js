require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");


const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
    origin: [
        "https://depfront.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000"
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// MongoDB connection
mongoose.connect(
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/passkey"
)
.then(() => {
    console.log("DB Connected");
})
.catch((error) => {
    console.error("MongoDB connection failed:", error.message);
});

// Gmail transporter
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Email template
const emailTemplate = (message, recipient) => ({
    from: process.env.EMAIL_USER,
    to: recipient,
    subject: "You get Text Message from Your App!",
    text: message
});

// Send emails

async function sendMails({ message, emailList }) {
    for (const recipient of emailList) {
        const response = await fetch(
            "https://api.resend.com/emails",
            {
                method: "POST",
                headers: {
                    "Authorization":
                        `Bearer ${process.env.RESEND_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    from: process.env.EMAIL_FROM,
                    to: [recipient],
                    subject: "Message from BulkMail",
                    text: message
                })
            }
        );

        const result = await response.json();

        if (!response.ok) {
            console.error("Resend API error:", result);
            throw new Error(
                result.message || `Resend error: ${response.status}`
            );
        }

        console.log(
            `Email accepted for ${recipient}. ID: ${result.id}`
        );
    }

    return "Success";
}


// Test route
app.get("/", (req, res) => {
    res.send("Bulk Mail Backend is running!");
});

// Send email route
app.post("/sendemail", async (req, res) => {
    try {
        const { message, emailList } = req.body;

        if (
            typeof message !== "string" ||
            !message.trim() ||
            !Array.isArray(emailList) ||
            emailList.length === 0 ||
            !emailList.every(
                email => typeof email === "string" &&
                    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Provide a message and a valid email list."
            });
        }

        await sendMails({ message, emailList });

        res.json({
            success: true,
            message: "Emails sent successfully!"
        });
    } catch (error) {
        console.error("Error sending emails:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to send emails."
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server Started on port ${PORT}`);
});
