require("dotenv").config();
const express = require("express");
const { mongoose, profileDB } = require("./db");
const path = require("path");
const Attendance = require("./models/Attendance");
const Profile = require("./models/Profile");
const fs = require("fs");
const { createObjectCsvWriter } = require("csv-writer");
const moment = require("moment");
const Absent = require("./models/Absent");

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

app.get("/absent", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    // Handle the date filter
    let searchDate = null;
    if (req.query.date) {
      searchDate = new Date(req.query.date);
      searchDate.setHours(0, 0, 0, 0);
      const endDate = new Date(searchDate);
      endDate.setHours(23, 59, 59, 999);

      // Apply the date range filter
      searchDate = { $gte: searchDate, $lt: endDate };
    }

    const searchBranch = req.query.branch || "";
    const searchBatch = req.query.batch || "";

    // Construct the query based on the filters
    const query = {
      ...(searchDate && { date: searchDate }),
      ...(searchBranch && { branch: searchBranch }),
      ...(searchBatch && { batch: searchBatch }),
    };

    // Fetch attendance data with pagination
    const attendances = await Absent.find(query).skip(skip).limit(limit);
    const totalAttendances = await Absent.countDocuments(query);
    const totalPages = Math.ceil(totalAttendances / limit);

    // Render the results with pagination
    res.render("absent", {
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

app.post("/calculate-absent", async (req, res) => {
  const { date, branch } = req.body;

  try {
    // Convert date to the correct format (e.g., YYYY-MM-DD)
    const formattedDate = moment(date).format("YYYY-MM-DD");

    // Convert the date to UTC start of day and end of day
    const startOfDay = moment(formattedDate).startOf("day").utc().toDate();
    const endOfDay = moment(formattedDate).endOf("day").utc().toDate();

    // Find all attendance records that match the branch and date
    const attendanceRecords = await Attendance.find({
      "branch.text": branch,
      time: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
    });

    // If a branch is provided, filter students from the Profile model by branch
    let students = [];
    if (branch) {
      // Extract the IDs from the attendance records
      const attendanceIds = attendanceRecords.map((record) => record.id);

      // Fetch all students from the Profile model where the Branch matches
      students = await Profile.find({
        Branch: branch,
      });

      // Filter out students whose ID matches any of the attendance IDs
      const filteredStudents = students.filter(
        (student) => !attendanceIds.includes(student._id.toString())
      );

      // Log the filtered students
      console.log("Filtered Students (Not in Attendance):", filteredStudents);

      // Save the filtered students into the Absent collection
      if (filteredStudents.length > 0) {
        // Create an array of absent records to match the schema
        const absentRecords = filteredStudents.map((student) => ({
          id: student.uid,
          address: student.Address || "",
          email: student.Email || "",
          FbLink: student.FbLink || "",
          FbName: student.FbName || "",
          HSC: student.HSC || "",
          Institution: student.Institution || "",
          Name: student.Name || "",
          Parent: student.Parent || "",
          Phone: student.Phone || "",
          roll: student.roll || "",
          time: startOfDay,
          branch: branch,
          status: "absent",
          date: formattedDate,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        console.log(absentRecords);
        // Insert the absent records into the Absent collection
        await Absent.insertMany(absentRecords);

        console.log("Absent students saved to the Absent collection.");
      }
    }

    // Send the response back
    res.status(200).json({
      message: "Absent students calculated and saved",
      data: students,
    });
  } catch (error) {
    console.error("Error calculating absent students:", error);
    res.status(500).json({ message: "Internal Server Error" });
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
