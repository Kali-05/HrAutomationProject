const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const ApplicantSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Store hashed password
  resumeData: { // Changed from extractedData
      name: { type: String, default: "Unknown" },
      email: { type: String, default: "Not Found" },
      phone: { type: String, default: "Not Found" },
      skills: { type: [String], default: [] },
      education: { type: [String], default: [] },
      experience: { type: [String], default: [] },
      projects: { type: [String], default: [] }, // Added projects
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
  resumePDF: { type: Buffer }, // Added for storing PDF
});

module.exports = mongoose.model("Applicant", ApplicantSchema);

// // Hash password before saving
// ApplicantSchema.pre("save", async function (next) {
//     if (this.isModified("password")) {
//         const salt = await bcrypt.genSalt(10);
//         this.password = await bcrypt.hash(this.password, salt);
//     }
//     next();
// });

// // Method to compare passwords during login
// ApplicantSchema.methods.comparePassword = async function (candidatePassword) {
//     return await bcrypt.compare(candidatePassword, this.password);
// };

// module.exports = mongoose.model("Applicant", ApplicantSchema);