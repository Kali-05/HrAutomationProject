const express = require("express");
const Session = require("../models/Session");
const Applicant = require("../models/Applicant");
const HR = require("../models/HR"); // Import HR model
const { fetchResumes, sendEmail } = require("../utils/email");
const { parseResume } = require("../utils/pdfParser");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { spawn } = require("child_process");
const bcrypt = require("bcrypt"); // Add this import
console.log("HR routes loaded");

// Define delay function to avoid rate limits
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Updated normalizeEmail to extract just the email address
const normalizeEmail = (email) => {
    const match = email.match(/<(.+?)>/);
    const extractedEmail = match ? match[1] : email.trim();
    return extractedEmail.toLowerCase();
};

// HR Signup
router.post("/signup", async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const existingHR = await HR.findOne({ email });
        if (existingHR) {
            return res.status(400).json({ error: "HR with this email already exists" });
        }

        // Manually hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log("Hashed password during signup:", hashedPassword);

        const hr = new HR({ email, password: hashedPassword, name: name || "HR" });
        await hr.save();
        console.log("HR user saved with password:", hr.password); // Should be hashed

        const token = jwt.sign(
            { id: hr._id, email: hr.email, role: "hr" },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.json({
            success: true,
            token,
            hr: { email: hr.email, name: hr.name },
        });
    } catch (err) {
        console.error("HR signup error:", err.message);
        res.status(500).json({ error: "Failed to sign up" });
    }
});

// HR Login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const hr = await HR.findOne({ email });
        if (!hr) {
            console.log(`Login failed: No HR user found with email ${email}`);
            return res.status(401).json({ error: "Invalid email or password" });
        }

        console.log("Stored password in database:", hr.password); // Debug: Check if hashed
        const isMatch = await hr.comparePassword(password);
        console.log("Password match result:", isMatch); // Debug: Check comparison result
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const token = jwt.sign(
            { id: hr._id, email: hr.email, role: "hr" },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.json({
            success: true,
            token,
            hr: { email: hr.email, name: hr.name },
        });
    } catch (err) {
        console.error("HR login error:", err.message);
        res.status(500).json({ error: "Failed to log in" });
    }
});

// router.post("/create-session", async (req, res) => {
//     try {
//         console.log("Create session endpoint hit");
//         const { hrEmail, startDate, endDate, jobDescription, testDateTime } = req.body;
//         console.log("Creating session with:", { hrEmail, startDate, endDate, jobDescription, testDateTime });

//         if (!hrEmail || !startDate || !endDate || !jobDescription || !testDateTime) {
//             return res.status(400).json({ error: "All fields (hrEmail, startDate, endDate, jobDescription, testDateTime) are required" });
//         }

//         const session = new Session({
//             hrEmail,
//             startDate,
//             endDate,
//             jobDescription,
//             testDateTime,
//         });
//         await session.save();
//         console.log("Session saved initially:", session._id);

//         if (new Date(endDate) <= new Date()) {
//             console.log("Fetching resumes for range:", startDate, "to", endDate);
//             const resumes = await fetchResumes(new Date(startDate), new Date(endDate));
//             console.log("Found resumes:", resumes.length);

//             const uniqueResumes = [];
//             const seenEmails = new Set();

//             for (const resume of resumes) {
//                 const normalizedEmail = normalizeEmail(resume.email);
//                 if (!seenEmails.has(normalizedEmail)) {
//                     seenEmails.add(normalizedEmail);
//                     uniqueResumes.push({ ...resume, email: normalizedEmail });
//                 } else {
//                     console.log("Skipping duplicate resume for email:", normalizedEmail);
//                 }
//             }

//             for (const { email: normalizedEmail, pdfData } of uniqueResumes) {
//                 console.log("Processing normalized email:", normalizedEmail);
//                 const { extractedData, questions } = await parseResume(pdfData, jobDescription);
//                 console.log("Extracted data:", extractedData);
//                 console.log("Questions:", questions);
//                 if (!extractedData) {
//                     console.log("Skipping email due to missing extracted data:", normalizedEmail);
//                     continue;
//                 }

//                 const existingApplicant = await Applicant.findOne({ email: normalizedEmail });
//                 const password = Math.random().toString(36).slice(-8);
//                 console.log("Generated password for", normalizedEmail, ":", password);

//                 if (existingApplicant) {
//                     console.log(`Applicant already exists for ${normalizedEmail}, sending reminder email`);
//                     existingApplicant.password = password;
//                     existingApplicant.questions = questions || [];
//                     await existingApplicant.save();
//                     console.log("Updated applicant:", existingApplicant._id);
//                     session.applicants.push(existingApplicant._id);
//                 } else {
//                     const applicant = new Applicant({
//                         email: normalizedEmail,
//                         password,
//                         resumeData: extractedData,
//                         questions: questions || [],
//                         resumePDF: pdfData,
//                     });
//                     console.log("Saving new applicant with password:", password);
//                     await applicant.save();
//                     console.log("Saved applicant:", applicant._id);
//                     session.applicants.push(applicant._id);
//                     console.log("Added applicant:", normalizedEmail);
//                 }

//                 const emailBody = `
//                     Dear Applicant,

//                     You have been invited to participate in an interview process. Below are your login credentials and the questions you need to answer:

//                     **Login Credentials:**
//                     - Email: ${normalizedEmail}
//                     - Password: ${password}

//                     **Questions:**
//                     ${questions?.map((q, i) => `${i + 1}. ${q}`).join("\n") || "No questions assigned yet"}

//                     Please log in at http://localhost:3000/ to submit your answers.

//                     Best regards,
//                     HR Team
//                 `;
//                 console.log(`Attempting to send invite email to ${normalizedEmail}`);
//                 await sendEmail(normalizedEmail, "Interview Invite - Login Credentials and Questions", emailBody);
//                 await delay(1000);
//             }

//             await session.save();
//             console.log("Session saved with applicants:", session.applicants.length);
//         } else {
//             console.log("End date is in the future, skipping resume fetch.");
//         }

//         const updatedApplicants = await Applicant.find({ _id: { $in: session.applicants } });
//         res.json({ success: true, sessionId: session._id, applicants: updatedApplicants });
//     } catch (err) {
//         console.error("Error creating session:", err.message, err.stack);
//         res.status(500).json({ error: "Failed to create session", details: err.message });
//     }
// });
router.post("/create-session", async (req, res) => {
    try {
        console.log("Create session endpoint hit");
        const { hrEmail, startDate, endDate, jobDescription, testDateTime } = req.body;
        console.log("Creating session with:", { hrEmail, startDate, endDate, jobDescription, testDateTime });

        if (!hrEmail || !startDate || !endDate || !jobDescription || !testDateTime) {
            return res.status(400).json({ error: "All fields (hrEmail, startDate, endDate, jobDescription, testDateTime) are required" });
        }

        const session = new Session({
            hrEmail,
            startDate,
            endDate,
            jobDescription,
            testDateTime,
        });
        await session.save();
        console.log("Session saved initially:", session._id);

        if (new Date(endDate) <= new Date()) {
            console.log("Fetching resumes for range:", startDate, "to", endDate);
            const resumes = await fetchResumes(new Date(startDate), new Date(endDate), jobDescription);
            console.log("Found resumes:", resumes.length);

            // Filter resumes based on ATS-friendliness and job relevance
            const filteredResumes = resumes.filter(resume => {
                const passesFilter = resume.resumeData.isATSFriendlyAndJobRelevant;
                if (!passesFilter) {
                    console.log(`Resume from ${resume.email} filtered out: Not ATS-friendly or not job-relevant`);
                }
                return passesFilter;
            });
            console.log(`Filtered resumes (ATS-friendly and job-relevant): ${filteredResumes.length}`);

            const uniqueResumes = [];
            const seenEmails = new Set();

            for (const resume of filteredResumes) {
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
                const { extractedData, questions } = await parseResume(pdfData, jobDescription);
                console.log("Extracted data:", extractedData);
                console.log("Questions:", questions);
                if (!extractedData) {
                    console.log("Skipping email due to missing extracted data:", normalizedEmail);
                    continue;
                }

                const existingApplicant = await Applicant.findOne({ email: normalizedEmail });
                const password = Math.random().toString(36).slice(-8);
                console.log("Generated password for", normalizedEmail, ":", password);

                if (existingApplicant) {
                    console.log(`Applicant already exists for ${normalizedEmail}, sending reminder email`);
                    existingApplicant.password = password;
                    existingApplicant.questions = questions || [];
                    await existingApplicant.save();
                    console.log("Updated applicant:", existingApplicant._id);
                    session.applicants.push(existingApplicant._id);
                } else {
                    const applicant = new Applicant({
                        email: normalizedEmail,
                        password,
                        resumeData: extractedData,
                        questions: questions || [],
                        resumePDF: pdfData,
                    });
                    console.log("Saving new applicant with password:", password);
                    await applicant.save();
                    console.log("Saved applicant:", applicant._id);
                    session.applicants.push(applicant._id);
                    console.log("Added applicant:", normalizedEmail);
                }

                const emailBody = `
                    Dear Applicant,

                    You have been invited to participate in an interview process. Below are your login credentials and the questions you need to answer:

                    **Login Credentials:**
                    - Email: ${normalizedEmail}
                    - Password: ${password}

                    **Questions:**
                    ${questions?.map((q, i) => `${i + 1}. ${q}`).join("\n") || "No questions assigned yet"}

                    Please log in at http://localhost:3000/ to submit your answers.

                    Best regards,
                    HR Team
                `;
                console.log(`Attempting to send invite email to ${normalizedEmail}`);
                await sendEmail(normalizedEmail, "Interview Invite - Login Credentials and Questions", emailBody);
                await delay(1000);
            }

            await session.save();
            console.log("Session saved with applicants:", session.applicants.length);
        } else {
            console.log("End date is in the future, skipping resume fetch.");
        }

        const updatedApplicants = await Applicant.find({ _id: { $in: session.applicants } });
        res.json({ success: true, sessionId: session._id, applicants: updatedApplicants });
    } catch (err) {
        console.error("Error creating session:", err.message, err.stack);
        res.status(500).json({ error: "Failed to create session", details: err.message });
    }
});

// HR Applicants Endpoint
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
        // Map applicants to include name from resumeData
        const applicantsWithName = session.applicants.map(applicant => ({
            ...applicant._doc, // Spread the applicant document
            name: applicant.resumeData?.name || "Unknown Applicant" // Extract name from resumeData, fallback to "Unknown Applicant"
        }));
        res.json(applicantsWithName);
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
// Fetch questions for a session
router.get("/session/:sessionId/questions", async (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        const session = await Session.findById(sessionId).populate("applicants");

        if (!session) {
            return res.status(404).json({ error: "Session not found" });
        }

        // Fetch questions from the first applicant (assuming all applicants have the same questions)
        const applicant = session.applicants[0];
        if (!applicant) {
            return res.status(404).json({ error: "No applicants found in this session" });
        }

        const questions = applicant.questions || [];
        res.json(questions);
    } catch (err) {
        console.error("Error fetching session questions:", err.message);
        res.status(500).json({ error: "Failed to fetch session questions" });
    }
});

module.exports = router;