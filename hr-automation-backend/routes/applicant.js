// const express = require("express");
// const jwt = require("jsonwebtoken");
// const Applicant = require("../models/Applicant");
// const { spawn } = require("child_process"); // Add this import
// const path = require("path");
// require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

// const router = express.Router();

// router.get("/test", (req, res) => {
//   res.send("Applicant test route working");
// });

// router.post("/login", async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     if (!email || !password) {
//       return res.status(400).json({ error: "Email and password are required" });
//     }

//     const applicant = await Applicant.findOne({ email });
//     if (!applicant) {
//       return res.status(401).json({ error: "Invalid email or password" });
//     }

//     const isMatch = await applicant.comparePassword(password);
//     if (!isMatch) {
//       return res.status(401).json({ error: "Invalid email or password" });
//     }

//     const token = jwt.sign(
//       { id: applicant._id, email: applicant.email },
//       process.env.JWT_SECRET,
//       { expiresIn: "1h" }
//     );

//     res.json({
//       success: true,
//       token,
//       applicant: {
//         email: applicant.email,
//         name: applicant.extractedData.name,
//         questions: applicant.questions,
//       },
//     });
//   } catch (err) {
//     console.error("Login error:", err.message);
//     res.status(500).json({ error: "Failed to log in" });
//   }
// });

// router.get("/questions", async (req, res) => {
//   try {
//     const authHeader = req.headers.authorization;
//     console.log("Authorization header for questions:", authHeader);
//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       return res.status(401).json({ error: "No valid token provided" });
//     }

//     const token = authHeader.split(" ")[1];
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     console.log("Decoded token for questions:", decoded);

//     const applicant = await Applicant.findById(decoded.id);
//     if (!applicant) {
//       return res.status(404).json({ error: "Applicant not found" });
//     }

//     res.json({ questions: applicant.questions });
//   } catch (err) {
//     console.error("Get questions error:", err.message);
//     res.status(401).json({ error: "Invalid token" });
//   }
// });

// router.post("/submit-exam", async (req, res) => {
//   try {
//     const authHeader = req.headers.authorization;
//     console.log("Authorization header for submit-exam:", authHeader);
//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       return res.status(401).json({ error: "No valid token provided" });
//     }

//     const token = authHeader.split(" ")[1];
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     console.log("Decoded token for submit-exam:", decoded);

//     const { question, answer } = req.body;
//     console.log("Received submission data:", { question, answer });

//     if (!question || !answer) {
//       return res.status(400).json({ error: "Question and answer are required" });
//     }

//     const applicant = await Applicant.findById(decoded.id);
//     if (!applicant) {
//       return res.status(404).json({ error: "Applicant not found" });
//     }

//     const pythonProcess = spawn("python", [
//       path.join(__dirname, "../utils/evaluate_model.py"),
//       question,
//       answer,
//     ]);
//     let evaluationResult = "";
//     for await (const chunk of pythonProcess.stdout) {
//       evaluationResult += chunk.toString();
//     }
//     pythonProcess.on("error", (err) => console.error("Python error:", err));
//     pythonProcess.on("close", (code) => {
//       if (code !== 0) {
//         console.error("Python process exited with code:", code);
//         return res.status(500).json({ error: "Evaluation failed" });
//       }
//       const scoreMatch = evaluationResult.match(/Evaluated score: (\d+\.\d+)/);
//       const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0;
//       console.log("Evaluated score:", score);

//       applicant.responses = applicant.responses || [];
//       applicant.responses.push({ question, answer, score });
//       applicant.save();

//       console.log("Updated applicant with new response:", applicant);
//       res.json({ success: true, message: "Answer submitted and evaluated successfully", score });
//     });
//   } catch (err) {
//     console.error("Submit exam error:", err.message);
//     res.status(500).json({ error: "Failed to save answer to database" });
//   }
// });

// module.exports = router;


// router.get("/questions", async (req, res) => {
//     try {
//       const authHeader = req.headers.authorization;
//       const token = authHeader.split(" ")[1];
//       const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
//       const applicant = await Applicant.findById(decoded.id);
//       if (!applicant) {
//         return res.status(404).json({ error: "Applicant not found" });
//       }
  
//       // Fetch session to get job description
//       const session = await Session.findOne({ applicants: applicant._id });
//       const jobDescription = session ? session.jobDescription : "Generic job description";
  
//       const extractedData = applicant.extractedData || { ... };
//       const inputData = JSON.stringify({ extracted_data: extractedData, job_description: jobDescription });
  
//       const pythonProcess = spawn("python", [
//         path.join(__dirname, "../python_scripts/generate_questions.py"),
//       ]);
  
//       pythonProcess.stdin.write(inputData + "\n");
//       pythonProcess.stdin.end();
  
//       let questionsResult = "";
//       for await (const chunk of pythonProcess.stdout) {
//         questionsResult += chunk.toString();
//       }
  
//       pythonProcess.on("close", (code) => {
//         if (code !== 0) {
//           console.error("Python process exited with code:", code, "Output:", questionsResult);
//           return res.status(500).json({ error: "Failed to generate questions" });
//         }
//         let questions = JSON.parse(questionsResult);
//         applicant.questions = questions;
//         await applicant.save(); // Ensure async save
//         res.json({ questions });
//       });
//     } catch (err) {
//       console.error("Get questions error:", err.message);
//       res.status(401).json({ error: "Invalid token" });
//     }
//   });
const express = require("express");
const jwt = require("jsonwebtoken");
const Applicant = require("../models/Applicant");
const { spawn } = require("child_process");
const Session = require("../models/Session"); // Add this line
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const router = express.Router();

router.get("/test", (req, res) => {
  res.send("Applicant test route working");
});

// router.post("/login", async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     if (!email || !password) {
//       return res.status(400).json({ error: "Email and password are required" });
//     }

//     const applicant = await Applicant.findOne({ email });
//     if (!applicant) {
//       return res.status(401).json({ error: "Invalid email or password" });
//     }

//     const isMatch = await applicant.comparePassword(password);
//     if (!isMatch) {
//       return res.status(401).json({ error: "Invalid email or password" });
//     }

//     const token = jwt.sign(
//       { id: applicant._id, email: applicant.email },
//       process.env.JWT_SECRET,
//       { expiresIn: "1h" }
//     );

//     res.json({
//       success: true,
//       token,
//       applicant: {
//         email: applicant.email,
//         name: applicant.extractedData.name,
//         questions: applicant.questions,
//       },
//     });
//   } catch (err) {
//     console.error("Login error:", err.message);
//     res.status(500).json({ error: "Failed to log in" });
//   }
// });
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log("Login attempt with:", { email, password });

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const applicant = await Applicant.findOne({ email });
        console.log("Found applicant:", applicant ? applicant.email : "none");
        if (!applicant) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const isMatch = applicant.password === password; // Direct comparison
        console.log("Password match:", isMatch, "Stored:", applicant.password, "Provided:", password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const token = jwt.sign(
            { id: applicant._id, email: applicant.email },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.json({
            success: true,
            token,
            applicant: {
                email: applicant.email,
                name: applicant.resumeData?.name || "Applicant",
                questions: applicant.questions,
            },
        });
    } catch (err) {
        console.error("Login error:", err.message);
        res.status(500).json({ error: "Failed to log in" });
    }
});


router.get("/questions", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      console.log("Authorization header:", authHeader);
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No valid token provided" });
      }
  
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded token:", decoded);
  
      const applicant = await Applicant.findById(decoded.id);
      if (!applicant) {
        return res.status(404).json({ error: "Applicant not found" });
      }
  
      // Fetch questions from the database
      if (!applicant.questions || applicant.questions.length === 0) {
        return res.status(400).json({ error: "No questions available for this applicant" });
      }
  
      console.log("Fetched questions from DB:", applicant.questions);
      res.json({ questions: applicant.questions });
    } catch (err) {
      console.error("Get questions error:", err.message);
      res.status(500).json({ error: "Server error" });
    }
  });
router.post("/submit-exam", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      console.log("Authorization header for submit-exam:", authHeader);
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No valid token provided" });
      }
  
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded token for submit-exam:", decoded);
  
      const { question, answer } = req.body;
      console.log("Received submission data:", { question, answer });
  
      if (!question || !answer) {
        return res.status(400).json({ error: "Question and answer are required" });
      }
  
      const applicant = await Applicant.findById(decoded.id);
      if (!applicant) {
        return res.status(404).json({ error: "Applicant not found" });
      }
  
      const pythonProcess = spawn("python", [
        path.join(__dirname, "../python_scripts/evaluate_model.py"),
        question,
        answer,
      ]);
  
      let evaluationResult = "";
      let errorOutput = "";
  
      for await (const chunk of pythonProcess.stdout) {
        evaluationResult += chunk.toString();
      }
  
      for await (const chunk of pythonProcess.stderr) {
        errorOutput += chunk.toString();
      }
  
      const result = await new Promise((resolve) => {
        pythonProcess.on("error", (err) => {
          console.error("Python error:", err.message);
          resolve({ error: "Failed to run evaluation script" });
        });
  
        pythonProcess.on("close", (code) => {
          if (code !== 0) {
            console.error("Python process exited with code:", code, "Output:", evaluationResult, "Error:", errorOutput);
            resolve({ error: "Evaluation failed" });
          } else {
            const scoreMatch = evaluationResult.match(/Evaluated score: (\d+\.\d+)\/10/);
            const score = scoreMatch ? parseFloat(scoreMatch[1]) / 10 : 0;
            resolve({ score });
          }
        });
      });
  
      if (result.error) {
        console.warn(`Evaluation failed for question "${question}": ${result.error}`);
        return res.status(500).json({ error: result.error });
      }
  
      const score = result.score;
  
      // Atomically update the applicant document using findOneAndUpdate
      const updatedApplicant = await Applicant.findOneAndUpdate(
        { _id: decoded.id },
        {
          $push: { responses: { question, answer, score } },
          $inc: { totalScore: score }, // Increment totalScore
        },
        { new: true } // Return the updated document
      );
  
      if (!updatedApplicant) {
        return res.status(404).json({ error: "Failed to update applicant" });
      }
  
      console.log(`Score for question "${question}": ${score}`);
      console.log(`Total score for applicant ${updatedApplicant.email}: ${updatedApplicant.totalScore}`);
  
      res.json({
        success: true,
        message: "Answer submitted and evaluated successfully",
        score,
      });
    } catch (err) {
      console.error("Submit exam error:", err.message);
      res.status(500).json({ error: "Failed to save answer to database" });
    }
  });

  // Add the /results endpoint
  // hr-automation-backend/routes/applicant.js (updated /results endpoint)
router.get("/results", async (req, res) => {
  try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return res.status(401).json({ error: "No valid token provided" });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded HR token for results:", decoded);

      if (!decoded.role || decoded.role !== "hr") {
          return res.status(403).json({ error: "Unauthorized access" });
      }

      const applicants = await Applicant.find({}, "email totalScore _id").sort({ totalScore: -1 });
      res.json({ applicants });
  } catch (err) {
      console.error("Get results error:", err.message);
      if (err.name === "TokenExpiredError") {
          return res.status(401).json({ error: "Token expired. Please log in again." });
      }
      if (err.name === "JsonWebTokenError") {
          return res.status(401).json({ error: "Invalid token. Please log in again." });
      }
      res.status(500).json({ error: "Failed to fetch results" });
  }
});

module.exports = router;