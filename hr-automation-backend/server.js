const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const applicantRoutes = require("./routes/applicant");
const hrRoutes = require("./routes/hr");

dotenv.config();
const app = express();
app.use(express.json());

const cors = require("cors");
app.use(cors());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.log(err));

app.use("/api/applicant", applicantRoutes);
app.use("/api/hr", hrRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

