const express = require("express");
const Session = require("../models/Session");
const Applicant = require("../models/Applicant");
const { fetchResumes, sendEmail } = require("../utils/email");
const { generateQuestions } = require("../utils/questionGenerator");
const router = express.Router();

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

            for (const { email, resumeText, resumeVectors, extractedData } of resumes) {
                const existingApplicant = await Applicant.findOne({ email });
                if (existingApplicant) {
                    console.log(`Applicant already exists, skipping: ${email}`);
                    session.applicants.push(existingApplicant._id);
                    continue;
                }

                const password = Math.random().toString(36).slice(-8);
                const questions = generateQuestions({ resumeText, extractedData }, jobDescription); // Use extracted data
                const applicant = new Applicant({ 
                    email, 
                    resumeText,
                    resumeVectors,
                    extractedData,
                    questions,
                    password,
                });
                await applicant.save();
                session.applicants.push(applicant._id);
                console.log("Added applicant:", email);
                await sendEmail(
                    email,
                    "Interview Invite",
                    `Login with Email: ${email}, Password: ${password}\nQuestions: ${questions.join("\n")}`
                );
            }
            await session.save();
            console.log("Session saved with applicants:", session.applicants.length);
        } else {
            console.log("End date is in the future, skipping resume fetch.");
        }
        res.json({ success: true });
    } catch (err) {
        console.error("Error creating session:", err);
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

