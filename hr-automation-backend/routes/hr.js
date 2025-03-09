const express = require("express");
const Session = require("../models/Session");
const Applicant = require("../models/Applicant");
const { fetchResumes, sendEmail } = require("../utils/email");
const { generateQuestions } = require("../utils/questionGenerator");
const router = express.Router();
const { parseResume } = require("../utils/pdfParser");
// Define delay function to avoid rate limits
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper function to normalize email (extract email address from "Name <email>" format)
const normalizeEmail = (email) => {
    const match = email.match(/<(.+?)>/);
    return match ? match[1] : email.trim();
};

router.post("/create-session", async (req, res) => {
    try {
        const { hrEmail, startDate, endDate, jobDescription, testDateTime } = req.body;
        console.log("Creating session with:", { hrEmail, startDate, endDate });
        const session = new Session({ hrEmail, startDate, endDate, jobDescription, testDateTime });
        await session.save();

        if (new Date(endDate) <= new Date()) {
            console.log("Fetching resumes for range:", startDate, "to", endDate);
            const resumes = await fetchResumes(new Date(startDate), new Date(endDate));
            console.log("Found resumes:", resumes.length);

            const uniqueResumes = [];
            const seenEmails = new Set();
            for (const resume of resumes) {
                const normalizedEmail = normalizeEmail(resume.email);
                if (!seenEmails.has(normalizedEmail)) {
                    seenEmails.add(normalizedEmail);
                    uniqueResumes.push({ ...resume, email: normalizedEmail });
                } else {
                    console.log("Skipping duplicate resume for email:", normalizedEmail);
                }
            }

            for (const { email: normalizedEmail, pdfData } of uniqueResumes) {
                console.log("Processing normalized email:", normalizedEmail);
                const { extractedData, questions } = await parseResume(pdfData);
                if (!extractedData) {
                    console.log("Skipping email due to missing extracted data:", normalizedEmail);
                    continue;
                }

                const existingApplicant = await Applicant.findOne({ email: normalizedEmail });
                if (existingApplicant) {
                    console.log(`Applicant already exists for ${normalizedEmail}, sending reminder email`);
                    const password = Math.random().toString(36).slice(-8); // Generate new password
                    existingApplicant.password = password; // Update password (will be hashed by pre-save hook)
                    await existingApplicant.save();

                    const emailBody = `
                        Dear Applicant,

                        Your account already exists. Here are your updated login credentials and questions:

                        **Login Credentials:**
                        - Email: ${normalizedEmail}
                        - Password: ${password}

                        **Questions:**
                        ${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

                        Please log in at http://localhost:3000/applicant-login to submit your answers.

                        Best regards,
                        HR Team
                    `;
                    console.log(`Attempting to send reminder email to ${normalizedEmail}`);
                    await sendEmail(normalizedEmail, "Interview Invite - Updated Credentials", emailBody);
                    await delay(1000); // 1-second delay to avoid rate limits
                } else {
                    // New applicant
                    const password = Math.random().toString(36).slice(-8);
                    const applicant = new Applicant({
                        email: normalizedEmail,
                        password, // Will be hashed by the pre-save hook
                        extractedData,
                        questions,
                    });
                    await applicant.save();
                    session.applicants.push(applicant._id);
                    console.log("Added applicant:", normalizedEmail);

                    const emailBody = `
                        Dear Applicant,

                        You have been invited to participate in an interview process. Below are your login credentials and the questions you need to answer:

                        **Login Credentials:**
                        - Email: ${normalizedEmail}
                        - Password: ${password}

                        **Questions:**
                        ${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

                        Please log in at http://localhost:3000/applicant-login to submit your answers.

                        Best regards,
                        HR Team
                    `;
                    console.log(`Attempting to send invite email to ${normalizedEmail}`);
                    await sendEmail(normalizedEmail, "Interview Invite - Login Credentials and Questions", emailBody);
                    await delay(1000); // 1-second delay to avoid rate limits
                }
            }
            await session.save();
            console.log("Session saved with applicants:", session.applicants.length);
        } else {
            console.log("End date is in the future, skipping resume fetch.");
        }
        res.json({ success: true });
    } catch (err) {
        console.error("Error creating session:", err.message);
        res.status(500).json({ error: "Failed to create session" });
    }
});

router.get("/applicants", async (req, res) => {
    try {
        const hrEmail = req.query.hrEmail;
        if (!hrEmail) {
            return res.status(400).json({ error: "hrEmail is required" });
        }
        const session = await Session.findOne({ hrEmail }).populate("applicants");
        if (!session) {
            return res.status(200).json([]); // No session yet, return empty array
        }
        res.json(session.applicants);
    } catch (err) {
        console.error("Error fetching applicants:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/applicant-resume/:id", async (req, res) => {
    try {
        const applicant = await Applicant.findById(req.params.id);
        if (!applicant || !applicant.resumePDF) {
            return res.status(404).json({ error: "Resume not found" });
        }
        res.set("Content-Type", "application/pdf");
        res.send(applicant.resumePDF);
    } catch (err) {
        console.error("Error fetching resume:", err);
        res.status(500).json({ error: "Failed to fetch resume" });
    }
});
module.exports = router;

