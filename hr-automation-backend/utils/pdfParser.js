const pdf = require("pdf-parse");

const parseResume = async (pdfBuffer) => {
    const data = await pdf(pdfBuffer);
    const text = data.text;
    const emailMatch = text.match(/[\w\.-]+@[\w\.-]+\.\w+/);
    const skillsMatch = text.match(/skills:(.+)/i); // Basic regex, improve as needed
    return {
        email: emailMatch ? emailMatch[0] : null,
        skills: skillsMatch ? skillsMatch[1].split(",").map((s) => s.trim()) : [],
    };
};

module.exports = { parseResume };