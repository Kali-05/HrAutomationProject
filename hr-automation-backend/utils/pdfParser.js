const pdf = require("pdf-parse");
const { spawn } = require("child_process");

const parseResume = async (pdfBuffer) => {
    try {
        // Extract text using pdf-parse
        const data = await pdf(pdfBuffer);
        const text = data.text;
        console.log("Extracted text length:", text.length);

        // Extract information
        const extractProcess = spawn("python", ["python_scripts/extract_resume_info.py"]);
        let extractOutput = "";
        extractProcess.stdout.on("data", (data) => {
            extractOutput += data.toString();
            console.log("Extract stdout:", data.toString());
        });
        extractProcess.stderr.on("data", (data) => {
            console.error("Extract error:", data.toString());
        });

        extractProcess.stdin.write(text);
        extractProcess.stdin.end();

        const extractResult = await new Promise((resolve, reject) => {
            extractProcess.on("close", (code) => {
                if (code === 0) {
                    try {
                        const parsedData = JSON.parse(extractOutput);
                        console.log("Parsed extracted data:", parsedData); // Debug log
                        resolve(parsedData);
                    } catch (err) {
                        reject(new Error("Failed to parse extract JSON: " + err.message));
                    }
                } else {
                    reject(new Error(`Extract script exited with code ${code}`));
                }
            });
        });

        if (extractResult.error) {
            console.error("Extraction failed:", extractResult.error);
            return { extractedData: { name: "", email: null, phone: "", skills: [], education: [], experience: [] }, questions: [] };
        }

        const extractedData = extractResult;

        // Generate questions
        const questionProcess = spawn("python", ["python_scripts/generate_questions.py"]);
        let questionOutput = "";
        questionProcess.stdout.on("data", (data) => {
            questionOutput += data.toString();
            console.log("Question stdout:", data.toString());
        });
        questionProcess.stderr.on("data", (data) => {
            console.error("Question generation error:", data.toString());
        });

        const dataToSend = JSON.stringify(extractedData); // Debug the string being sent
        console.log("Data sent to question generator:", dataToSend);
        questionProcess.stdin.write(dataToSend);
        questionProcess.stdin.end();

        const questionResult = await new Promise((resolve, reject) => {
            questionProcess.on("close", (code) => {
                if (code === 0) {
                    try {
                        const parsedQuestions = JSON.parse(questionOutput);
                        resolve(parsedQuestions);
                    } catch (err) {
                        reject(new Error("Failed to parse question JSON: " + err.message));
                    }
                } else {
                    reject(new Error(`Question script exited with code ${code}`));
                }
            });
        });

        if (questionResult.error) {
            console.error("Question generation failed:", questionResult.error);
            return { extractedData, questions: [] };
        }

        return { extractedData, questions: questionResult };
    } catch (err) {
        console.error("PDF parsing error:", err);
        return { extractedData: { name: "", email: null, phone: "", skills: [], education: [], experience: [] }, questions: [] };
    }
};

module.exports = { parseResume };