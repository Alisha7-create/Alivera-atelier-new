const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
admin.initializeApp();

// Configure your email transporter (e.g., Gmail SMTP or SendGrid configured with hello@aliveraatelier.in)
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "hello@aliveraatelier.in",
        pass: "Alishaaa@7"
    }
});

// Triggered whenever an order document is updated in Firestore
exports.sendOrderStatusEmail = functions.firestore
    .document("atelier_orders/{orderId}")
    .onUpdate(async (change, context) => {
        const beforeData = change.before.data();
        const afterData = change.after.data();

        // Check if the status has changed
        if (beforeData.status !== afterData.status) {
            const clientEmail = afterData.clientEmail;
            const newStatus = afterData.status;
            const orderName = afterData.items.map(i => i.name).join(", ");

            let subject = `Update on your Alivéra Atelier Order: ${newStatus}`;
            let htmlContent = `
                <div style="background-color: #050505; color: #f5f5f4; padding: 30px; font-family: sans-serif;">
                    <h2 style="color: #bf953f; font-family: serif;">Alivéra Atelier</h2>
                    <p>Dear ${afterData.clientName},</p>
                    <p>Your order for <strong>${orderName}</strong> has been updated by the studio.</p>
                    <p>Current Status: <strong style="color: #bf953f;">${newStatus}</strong></p>
                    <p style="margin-top: 20px; font-size: 12px; color: #888;">If you wish to cancel, you may do so within 24 hours of placement. For queries, reply to hello@aliveraatelier.in</p>
                </div>
            `;

            const mailOptions = {
                from: '"Alivéra Atelier" <hello@aliveraatelier.in>',
                to: clientEmail,
                subject: subject,
                html: htmlContent
            };

            try {
                await transporter.sendMail(mailOptions);
                console.log(`Email sent successfully to ${clientEmail} for status ${newStatus}`);
            } catch (error) {
                console.error("Error sending email:", error);
            }
        }
        return null;
    });
