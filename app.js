require("dotenv").config();
const express = require("express");
const { mongoose, profileDB } = require("./db");
const path = require("path");
const Attendance = require("./models/Attendance");
const Profile = require("./models/Profile");
const fs = require("fs");
const { createObjectCsvWriter } = require("csv-writer");

const app = express();

// Set EJS as the template engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware to parse JSON
app.use(express.json());

// Branch and batch lists
const branches = [
  { branchName: "Rangpur Rangers" },
  { branchName: "Mymensingh Warriors" },
  { branchName: "Barisal Predators" },
  { branchName: "Sylhet Sultans" },
  { branchName: "Mirpur Gladiators" },
  { branchName: "Uttara Raptors" },
  { branchName: "Rajshahi Royals" },
  { branchName: "Chattogram Vikings" },
  { branchName: "Motijheel Monarchs" },
  { branchName: "Bogura Titans" },
  { branchName: "Kushtia Kings" },
  { branchName: "Farmgate Falcons" },
];

// List of batches
const batches = [
  { batchName: "AchieveVarsity24" },
  { batchName: "AchieveMedical24" },
  { batchName: "AchieveEngineering24" },
  { batchName: "AchieveAgriculture24" },
];

// Route to fetch attendance records with pagination and optional search
app.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const searchDate = req.query.date ? new Date(req.query.date) : null;
    const searchBranch = req.query.branch || "";
    const searchBatch = req.query.batch || "";

    const query = {
      ...(searchDate && {
        time: {
          $gte: searchDate,
          $lt: new Date(searchDate.getTime() + 86400000),
        },
      }),
      ...(searchBranch && { "branch.text": searchBranch }),
      ...(searchBatch && { batch: searchBatch }),
    };

    const attendances = await Attendance.find(query).skip(skip).limit(limit);
    const totalAttendances = await Attendance.countDocuments(query);
    const totalPages = Math.ceil(totalAttendances / limit);

    res.render("index", {
      students: attendances,
      currentPage: page,
      totalPages,
      branches,
      batches,
      search: {
        date: req.query.date || "",
        branch: searchBranch,
        batch: searchBatch,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving attendance data");
  }
});

// Route to fetch absent students
app.get("/absent", async (req, res) => {
  try {
    const searchDate = req.query.date ? new Date(req.query.date) : null;
    if (!searchDate)
      return res
        .status(400)
        .json({ error: "Date is required for absence check" });

    // Assuming "allStudents" has all registered students with the Profile model
    const allStudents = await Profile.find({});
    const presentStudents = await Attendance.find({
      time: {
        $gte: searchDate,
        $lt: new Date(searchDate.getTime() + 86400000),
      },
    });

    const presentIds = new Set(presentStudents.map((student) => student.uid));
    const absentStudents = allStudents.filter(
      (student) => !presentIds.has(student.uid)
    );

    res.json({ absent: absentStudents });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching absent students");
  }
});

// Route to export filtered data as CSV
app.get("/export-csv", async (req, res) => {
  try {
    const searchDate = req.query.date ? new Date(req.query.date) : null;
    const searchBranch = req.query.branch || "";
    const searchBatch = req.query.batch || "";

    const query = {
      ...(searchDate && {
        time: {
          $gte: searchDate,
          $lt: new Date(searchDate.getTime() + 86400000),
        },
      }),
      ...(searchBranch && { "branch.text": searchBranch }),
      ...(searchBatch && { batch: searchBatch }),
    };

    const attendances = await Attendance.find(query);

    const csvWriter = createObjectCsvWriter({
      path: "exported_attendances.csv",
      header: [
        { id: "Name", title: "Name" },
        { id: "roll", title: "Roll" },
        { id: "Phone", title: "Phone" },
        { id: "batch", title: "Batch" },
        { id: "branchName", title: "Branch Name" },
      ],
    });

    const records = attendances.map((att) => ({
      Name: att.Name,
      roll: att.roll,
      Phone: att.Phone,
      batch: att.batch,
      branchName: att.branch?.text || "N/A",
    }));

    await csvWriter.writeRecords(records);

    res.download("exported_attendances.csv", "attendance_data.csv", (err) => {
      if (err) {
        console.error("Error while downloading CSV:", err);
        res.status(500).send("Error while exporting data");
      }
      fs.unlinkSync("exported_attendances.csv");
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error exporting data to CSV");
  }
});

// Set server to listen on PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
