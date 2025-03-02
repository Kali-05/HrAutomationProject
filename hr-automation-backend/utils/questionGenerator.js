const generateQuestions = (resumeData, jobDescription) => {
    const { resumeText, extractedData } = resumeData;
    const { skills = [], organizations = [], experience = [], jobTitles = [] } = extractedData;

    const personalized = [];
    // Skill-based questions
    if (skills.length > 0) {
        personalized.push(`Can you describe a project where you used ${skills[0]} in a professional setting?`);
        if (skills.length > 1) {
            personalized.push(`How have you combined ${skills[0]} and ${skills[1]} in your work?`);
        }
    }

    // Experience-based questions
    if (experience.length > 0) {
        personalized.push(`Your resume mentions experience around ${experience[0]}. Can you elaborate on your role during that time?`);
    }

    // Job title-based questions
    if (jobTitles.length > 0) {
        personalized.push(`As a ${jobTitles[0]}, what was your most significant achievement?`);
    }

    // Organization-based questions
    if (organizations.length > 0) {
        personalized.push(`Tell us about your time at ${organizations[0]}. What skills did you develop there?`);
    }

    const general = [
        "Why are you interested in this role?",
        `How does your background align with: ${jobDescription.slice(0, 50)}...?`,
    ];

    return [...personalized.slice(0, 3), ...general.slice(0, 2)]; // Limit to 5 questions
};
module.exports = { generateQuestions };