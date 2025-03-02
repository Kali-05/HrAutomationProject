const express = require("express");
const jwt = require("jsonwebtoken");
const Applicant = require("../models/Applicant");
const router = express.Router();

router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const applicant = await Applicant.findOne({ email, password });
    if (!applicant) return res.status(401).json({ success: false });

    const token = jwt.sign({ id: applicant._id }, process.env.JWT_SECRET);
    res.json({ success: true, token });
});

router.post("/submit-exam", async (req, res) => {
    const { token, answers } = req.body;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const applicant = await Applicant.findById(decoded.id);
    applicant.answers = answers;
    applicant.score = answers.length * 10; // Placeholder scoring (improve later)
    await applicant.save();
    res.json({ success: true });
});

router.get("/questions", async (req, res) => {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const applicant = await Applicant.findById(decoded.id);
    res.json({ questions: applicant.questions });
});

module.exports = router;