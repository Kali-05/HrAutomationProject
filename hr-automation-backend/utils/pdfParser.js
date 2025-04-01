const pdf = require("pdf-parse");
const { spawn } = require("child_process");
const path = require("path");

const parseResume = async (pdfBuffer, jobDescription) => {
    try {
        // Extract text from PDF
        const data = await pdf(pdfBuffer);
        const text = data.text.trim();
        console.log("Extracted text length:", text.length);

        if (!text) {
            console.error("No text extracted from PDF");
            return {
                extractedData: null,
                questions: [],
            };
        }

        // Spawn Python process to extract resume information
        const extractProcess = spawn("python", [
            path.join(__dirname, "../python_scripts/extract_resume_info.py"),
        ]);

        let extractOutput = "";
        let extractError = "";

        extractProcess.stdout.on("data", (data) => {
            extractOutput += data.toString();
            console.log("Extract stdout:", data.toString().trim());
        });

        extractProcess.stderr.on("data", (data) => {
            extractError += data.toString();
            console.error("Extract stderr:", data.toString().trim());
        });

        extractProcess.stdin.write(text);
        extractProcess.stdin.end();

        const extractedData = await new Promise((resolve, reject) => {
            extractProcess.on("close", (code) => {
                if (code === 0) {
                    try {
                        const lines = extractOutput.split("\n").filter(line => line.trim());
                        const jsonLine = lines.find(line => line.trim().startsWith("{"));
                        if (!jsonLine) {
                            throw new Error("No valid JSON found in output");
                        }
                        const parsedData = JSON.parse(jsonLine);
                        console.log("Parsed extracted data:", parsedData);
                        resolve(parsedData);
                    } catch (err) {
                        console.error("Failed to parse extract JSON:", err.message);
                        resolve(null);
                    }
                } else {
                    console.error(`Extract script exited with code ${code}: ${extractError}`);
                    resolve(null);
                }
            });
        });

        if (!extractedData) {
            return { extractedData: null, questions: [] };
        }

        // Spawn Python process to generate questions
        const questionProcess = spawn("python", [
            path.join(__dirname, "../python_scripts/generate_questions.py"),
        ]);

        let questionOutput = "";
        let questionError = "";

        questionProcess.stdout.on("data", (data) => {
            questionOutput += data.toString();
            console.log("Question stdout:", data.toString().trim());
        });

        questionProcess.stderr.on("data", (data) => {
            questionError += data.toString();
            console.error("Question stderr:", data.toString().trim());
        });

        const dataToSend = JSON.stringify({
            extracted_data: extractedData,
            job_description: jobDescription || "Default job description",
        });

        questionProcess.stdin.write(dataToSend);
        questionProcess.stdin.end();

        const questions = await new Promise((resolve, reject) => {
            questionProcess.on("close", (code) => {
                if (code === 0) {
                    try {
                        const lines = questionOutput.split("\n").filter(line => line.trim());
                        const jsonLine = lines.find(line => line.trim().startsWith("["));
                        if (!jsonLine) {
                            throw new Error("No valid JSON found in output");
                        }
                        const parsedQuestions = JSON.parse(jsonLine);
                        console.log("Parsed questions:", parsedQuestions);
                        resolve(parsedQuestions);
                    } catch (err) {
                        console.error("Failed to parse question JSON:", err.message);
                        resolve([]);
                    }
                } else {
                    console.error(`Question script exited with code ${code}: ${questionError}`);
                    resolve([]);
                }
            });
        });

        return { extractedData, questions };
    } catch (err) {
        console.error("PDF parsing error:", err.message);
        return {
            extractedData: null,
            questions: [],
        };
    }
};

module.exports = { parseResume };