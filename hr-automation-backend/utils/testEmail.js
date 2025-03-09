const { sendEmail } = require("./email");

const testEmail = async () => {
    try {
        const emailBody = `
            Dear Applicant,

            This is a test email to verify email sending functionality.

            Best regards,
            HR Team
        `;
        await sendEmail("kalidasp80@gmail.com", "Test Email", emailBody);
        console.log("Test email sent successfully!");
    } catch (err) {
        console.error("Failed to send test email:", err.message);
    }
};

testEmail();