
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration

const corsOptions = {
    origin: [
        "https://bulkmail-n2zx.vercel.app",
        "https://bulkmail-n2zx-git-main-sethumadhavan8008-coder.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000"
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
app.use(express.json());


// MongoDB connection
if (process.env.MONGODB_URI) {
    mongoose
        .connect(process.env.MONGODB_URI)
        .then(() => console.log("MongoDB connected successfully"))
        .catch((error) =>
            console.error("MongoDB connection failed:", error.message)
        );
} else {
    console.warn(
        "MONGODB_URI is not configured. Database features are unavailable."
    );
}

// Verify required Resend environment variables
function checkEmailConfiguration() {
    if (!process.env.RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY is not configured on the server.");
    }

    if (!process.env.EMAIL_FROM) {
        throw new Error("EMAIL_FROM is not configured on the server.");
    }
}

// Send emails using the Resend HTTPS API
async function sendMails({ message, emailList, subject }) {
    checkEmailConfiguration();

    for (const recipient of emailList) {
        const response = await fetch(
            "https://api.resend.com/emails",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    from: process.env.EMAIL_FROM,
                    to: [recipient],
                    subject: subject || "Message from BulkMail",
                    text: message
                })
            }
        );

        const result = await response.json();

        if (!response.ok) {
            console.error("Resend API error:", result);

            throw new Error(
                result.message || `Resend API returned status ${response.status}`
            );
        }

        console.log(
            `Email accepted for ${recipient}. Resend ID: ${result.id}`
        );
    }

    return true;
}

// Health-check route
app.get("/", (req, res) => {
    res.status(200).send("BulkMail Backend is running!");
});

// Send-email route
app.post("/sendemail", async (req, res) => {
    try {
        const { message, emailList, subject } = req.body;

        if (
            typeof message !== "string" ||
            !message.trim() ||
            !Array.isArray(emailList) ||
            emailList.length === 0 ||
            !emailList.every(
                (email) =>
                    typeof email === "string" &&
                    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Provide a message and a valid email list."
            });
        }

        // Remove duplicate addresses and surrounding whitespace
        const uniqueEmails = [
            ...new Set(emailList.map((email) => email.trim().toLowerCase()))
        ];

        await sendMails({
            message: message.trim(),
            emailList: uniqueEmails,
            subject:
                typeof subject === "string" && subject.trim()
                    ? subject.trim()
                    : undefined
        });

        return res.status(200).json({
            success: true,
            message: `Email requests accepted for ${uniqueEmails.length} recipient(s).`
        });
    } catch (error) {
        console.error("Error sending emails:", error.message);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to send emails."
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`BulkMail backend started on port ${PORT}`);
});
