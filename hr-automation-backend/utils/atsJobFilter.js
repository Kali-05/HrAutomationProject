// hr-automation-backend/utils/atsJobFilter.js
const isATSFriendlyAndJobRelevant = (text, extractedData, jobDescription) => {
    // Step 1: Check ATS-friendliness
    // 1.1 Text Extractability
    if (!text || text.length < 50) {
        console.log("Resume failed ATS check: No extractable text or text too short");
        return false;
    }

    // 1.2 Structure: Check for key sections (Skills, Experience, Education)
    const hasKeySections = extractedData && (
        (extractedData.skills && extractedData.skills.length > 0) ||
        (extractedData.experience && extractedData.experience.length > 0) ||
        (extractedData.education && extractedData.education.length > 0)
    );
    if (!hasKeySections) {
        console.log("Resume failed ATS check: Missing key sections (Skills, Experience, Education)");
        return false;
    }

    // 1.3 Formatting: Check for excessive special characters
    const nonAlphanumericCount = (text.match(/[^a-zA-Z0-9\s]/g) || []).length;
    const totalChars = text.length;
    const specialCharRatio = nonAlphanumericCount / totalChars;
    if (specialCharRatio > 0.1) {
        console.log(`Resume failed ATS check: Too many special characters (${(specialCharRatio * 100).toFixed(2)}%)`);
        return false;
    }

    // Step 2: Check Job Relevance
    if (!jobDescription || jobDescription === "Default job description") {
        console.log("No valid job description provided; skipping job relevance check");
        return true; // If no job description, consider it ATS-friendly but not job-relevant
    }

    // 2.1 Extract keywords from job description (simple tokenization)
    const jobKeywords = jobDescription
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\s]/g, "") // Remove special characters
        .split(/\s+/)
        .filter(word => word.length > 3 && !["with", "this", "that", "from", "have"].includes(word)); // Remove stop words

    if (jobKeywords.length === 0) {
        console.log("No keywords extracted from job description; skipping job relevance check");
        return true;
    }

    // 2.2 Extract text from resume data (skills, experience, education)
    let resumeText = "";
    if (extractedData.skills) resumeText += extractedData.skills.join(" ");
    if (extractedData.experience) resumeText += " " + extractedData.experience.join(" ");
    if (extractedData.education) resumeText += " " + extractedData.education.join(" ");
    resumeText = resumeText.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, "");

    // 2.3 Calculate keyword match score
    let matchCount = 0;
    for (const keyword of jobKeywords) {
        if (resumeText.includes(keyword)) {
            matchCount++;
        }
    }
    const matchScore = (matchCount / jobKeywords.length) * 100;
    console.log(`Job description match score: ${matchScore.toFixed(2)}%`);

    // 2.4 Require at least 10% keyword match (lowered from 50%)
    if (matchScore < 10) {
        console.log("Resume failed job relevance check: Match score below 10%");
        return false;
    }

    console.log("Resume passed integrated ATS and job relevance check");
    return true;
};

module.exports = { isATSFriendlyAndJobRelevant };