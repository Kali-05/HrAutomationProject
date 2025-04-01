const mongoose = require("mongoose");

const SessionSchema = new mongoose.Schema({
    hrEmail: { type: String, required: true },
    // hrId: { type: mongoose.Schema.Types.ObjectId, ref: "HR", required: true }, // Add HR reference
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    jobDescription: { type: String },
    testDateTime: { type: Date },
    applicants: [{ type: mongoose.Schema.Types.ObjectId, ref: "Applicant" }],
});

module.exports = mongoose.model("Session", SessionSchema);