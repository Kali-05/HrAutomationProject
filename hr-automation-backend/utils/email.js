const imapSimple = require("imap-simple");
const nodemailer = require("nodemailer");
const pdf = require("pdf-parse");
const { pipeline } = require("@huggingface/transformers");


// Initialize NLP pipelines
const nerPipeline = pipeline("ner", "dslim/bert-base-NER"); // NER for entity extraction
const embedder = pipeline("feature-extraction", "sentence-transformers/all-MiniLM-L6-v2"); // Better embeddings

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
            const resumeData = await processEmail(message, from, connection);
            if (resumeData) resumes.push(resumeData);
        }
    }
    console.log("Found resumes:", resumes.length);
    connection.end();
    return resumes;
};

const processEmail = async (message, from, connection) => {
    if (message.attributes.struct) {
        const allStructParts = flattenStruct(message.attributes.struct);
        const attachments = allStructParts.filter(
            (part) => (part.disposition?.type === "ATTACHMENT" || part.disposition?.type === "INLINE") &&
                      (part.subtype === "pdf" || part.type === "application/pdf" || part.type === "application/octet-stream")
        );
        console.log("PDF attachments found:", attachments.length);
        for (const attachment of attachments) {
            const partData = await connection.getPartData(message, attachment);
            console.log("Processing attachment from:", from);
            const pdfData = await pdf(partData);
            const resumeText = pdfData.text;

            // Enhanced NLP analysis
            const nerResults = await (await nerPipeline)(resumeText);
            const extractedData = {
                skills: nerResults.filter(r => r.entity_group === "SKILL").map(r => r.word),
                organizations: nerResults.filter(r => r.entity_group === "ORG").map(r => r.word),
                experience: nerResults.filter(r => r.entity_group === "DATE").map(r => r.word), // Rough proxy for experience
                jobTitles: nerResults.filter(r => r.entity_group === "TITLE").map(r => r.word),
            };

            const embeddings = await (await embedder)(resumeText, { pooling: "mean", normalize: true });
            const resumeVectors = embeddings[0]; // Mean-pooled vector

            console.log("Resume text extracted (first 100 chars):", resumeText.substring(0, 100));
            console.log("Extracted entities:", JSON.stringify(extractedData, null, 2));
            console.log("Resume extracted from:", from);
            return { email: from, resumeText, resumeVectors, extractedData };
        }
    } else {
        console.log("No struct data for email from:", from);
    }
    return null;
};
// const fetchResumes = async (startDate, endDate) => {
//     const config = {
//         imap: {
//             user: process.env.HR_EMAIL,
//             password: process.env.HR_PASSWORD,
//             host: "imap.gmail.com",
//             port: 993,
//             tls: true,
//             tlsOptions: { rejectUnauthorized: false }, // Bypass SSL check
//             authTimeout: 3000,
//         },
//     };

//     const connection = await imapSimple.connect(config);
//     await connection.openBox("INBOX");

//     const searchCriteria = [
//         ["SINCE", startDate.toISOString().split("T")[0]],
//         ["BEFORE", endDate.toISOString().split("T")[0]],
//     ];
//     const fetchOptions = { bodies: ["HEADER", "TEXT"], struct: true };

//     const messages = await connection.search(searchCriteria, fetchOptions);
//     const resumes = [];

//     for (const message of messages) {
//         const header = message.parts.find((part) => part.which === "HEADER").body;
//         if (/resume|cv/i.test(header.subject[0])) {
//             const parts = await connection.getParts(message.attributes.struct);
//             for (const part of parts) {
//                 if (part.disposition?.type === "ATTACHMENT" && part.subtype === "pdf") {
//                     const pdfData = await connection.getPartData(message, part);
//                     const resumeData = await parseResume(pdfData);
//                     resumes.push({ email: header.from[0], resumeData });
//                 }
//             }
//         }
//     }
//     connection.end();
//     return resumes;
// };

const sendEmail = async (to, subject, text) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.HR_EMAIL, pass: process.env.HR_PASSWORD },
    });
    await transporter.sendMail({ from: process.env.HR_EMAIL, to, subject, text });
};

module.exports = { fetchResumes, sendEmail };