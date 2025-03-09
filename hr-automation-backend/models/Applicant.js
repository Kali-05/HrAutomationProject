const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const ApplicantSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Store hashed password
    extractedData: {
        name: { type: String, default: "" },
        email: { type: String, default: "" },
        phone: { type: String, default: "" },
        skills: { type: [String], default: [] },
        education: { type: [String], default: [] },
        experience: { type: [String], default: [] }
    },
    questions: [{ type: String }],
  responses: [
    {
      question: { type: String, required: true },
      answer: { type: String, required: true },
    },
  ],
  totalScore: {
    type: Number,
    default: 0,
  },
});

// Hash password before saving
ApplicantSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    next();
});

// Method to compare passwords during login
ApplicantSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("Applicant", ApplicantSchema);