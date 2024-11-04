require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();

// Set up MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Set EJS as the template engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware to parse JSON
app.use(express.json());

// Define schema for attendance data based on your data structure
const attendanceSchema = new mongoose.Schema(
  {
    id: String,
    exam_id: String,
    address: String,
    email: String,
    FbLink: String,
    FbName: String,
    HSC: String,
    Institution: String,
    Name: String,
    Parent: String,
    Phone: String,
    roll: String,
    batch: String,
    time: Date,
    branch: {
      text: String,
      address: String,
      coach: String,
      tagline: String,
      instruction: String,
      photo: String,
      id: String,
    },
    createdAt: Date,
    updatedAt: Date,
  },
  { collection: "attendances" }
);

const Attendance = mongoose.model("Attendance", attendanceSchema);

// Route to fetch attendance records with pagination
app.get("/", async (req, res) => {
  try {
    // Get page query parameter, default to 1 if not provided
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    // Fetch attendance records with pagination
    const attendances = await Attendance.find().skip(skip).limit(limit);
    const totalAttendances = await Attendance.countDocuments();
    const totalPages = Math.ceil(totalAttendances / limit);

    // Render the EJS template with pagination data
    res.render("index", {
      students: attendances,
      currentPage: page,
      totalPages: totalPages,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving attendance data");
  }
});

// Set server to listen on PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
