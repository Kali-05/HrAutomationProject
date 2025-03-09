const generateQuestions = (resumeData, jobDescription) => {
    console.log("Generating questions with resumeData:", resumeData); // Debug
    const skills = resumeData?.skills || []; // Fallback to empty array
    const questions = [];

    // Generate questions based on skills (if any)
    if (skills.length > 0) {
        skills.forEach((skill) => {
            questions.push(`How have you used ${skill} in a professional setting?`);
        });
    }

    // Add a generic question based on job description
    questions.push(`Why are you a good fit for this ${jobDescription || "unknown"} role?`);

    return questions;
};

module.exports = { generateQuestions };