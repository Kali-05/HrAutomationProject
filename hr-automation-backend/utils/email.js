const imapSimple = require("imap-simple");
const nodemailer = require("nodemailer");
const { parseResume } = require("./pdfParser");

const path = require("path"); // Import the path module
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
// Helper to flatten nested struct array
const flattenStruct = (struct) => {
    const parts = [];
    const traverse = (node) => {
        if (Array.isArray(node)) {
            node.forEach(traverse);
        } else if (node && typeof node === "object") {
            parts.push(node);
            if (node.parts) traverse(node.parts);
        }
    };
    traverse(struct);
    return parts;
};

const fetchResumes = async (startDate, endDate) => {
    const config = {
        imap: {
            user: process.env.HR_EMAIL,
            password: process.env.HR_PASSWORD,
            host: "imap.gmail.com",
            port: 993,
            tls: true,
            tlsOptions: { rejectUnauthorized: false },
            authTimeout: 3000,
        },
    };
    console.log("IMAP Config:", config.imap);
    const connection = await imapSimple.connect(config);
    await connection.openBox("INBOX");

    const searchCriteria = [
        ["SINCE", startDate.toISOString().split("T")[0]],
        ["BEFORE", endDate.toISOString().split("T")[0]],
    ];
    const fetchOptions = { bodies: ["HEADER"], struct: true };
    const messages = await connection.search(searchCriteria, fetchOptions);
    console.log("Messages found:", messages.length);

    const resumes = [];
    for (const message of messages) {
        const headerPart = message.parts.find((part) => part.which === "HEADER");
        if (!headerPart || !headerPart.body) {
            console.log("Skipping email: Missing header part");
            continue;
        }
        const header = headerPart.body;
        const subject = header.subject && header.subject[0] ? header.subject[0] : "";
        const from = header.from && header.from[0] ? header.from[0] : "Unknown";
        console.log("Email subject:", subject, "From:", from);
        if (/resume|cv/i.test(subject)) {
            console.log("Matched resume email from:", from);
            await processEmail(message, from, resumes, connection);
        }
    }
    console.log("Found resumes:", resumes.length);
    connection.end();
    return resumes;
};

const processEmail = async (message, from, resumes, connection) => {
    if (message.attributes.struct) {
        const allStructParts = flattenStruct(message.attributes.struct);
        const attachments = allStructParts.filter(
            (part) => (part.disposition?.type === "ATTACHMENT" || part.disposition?.type === "INLINE") &&
                      (part.subtype === "pdf" || part.type === "application/pdf" || part.type === "application/octet-stream")
        );
        console.log("PDF attachments found:", attachments.length);
        for (const attachment of attachments) {
            const partData = await connection.getPartData(message, attachment);
            const resumeData = await parseResume(partData);
            resumes.push({ email: from, resumeData, pdfData: partData });
            console.log("Resume extracted from:", from);
        }
    } else {
        console.log("No struct data for email from:", from);
    }
};

const sendEmail = async (to, subject, text) => {
    try {
        // Validate environment variables
        if (!process.env.HR_EMAIL || !process.env.HR_PASSWORD) {
            throw new Error("HR_EMAIL or HR_PASSWORD is missing in .env file");
        }

        console.log(`Attempting to send email to: ${to}, Subject: ${subject}`);
        console.log("Email body:", text);

        // Configure nodemailer transporter
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.HR_EMAIL,
                pass: process.env.HR_PASSWORD,
            },
        });

        // Send email
        const info = await transporter.sendMail({
            from: process.env.HR_EMAIL,
            to,
            subject,
            text,
        });

        console.log(`Email sent successfully to ${to}:`, info.response);
        return info;
    } catch (err) {
        console.error(`Failed to send email to ${to}:`, err.message);
        throw new Error(`Failed to send email: ${err.message}`);
    }
};

module.exports = { fetchResumes, processEmail, sendEmail };