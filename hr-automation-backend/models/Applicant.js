const mongoose = require("mongoose");

const ApplicantSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    resumeText: { type: String, required: false }, // Raw extracted text
    resumeVectors: { type: [Number], required: false }, // Vectorized representation
    extractedData: { type: Object, required: false }, // Structured data (e.g., skills, experience)
    questions: [{ type: String }],
    answers: [{ question: String, answer: String }],
    score: { type: Number, default: 0 },
    password: { type: String },
});

module.exports = mongoose.model("Applicant", ApplicantSchema);