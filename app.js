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
    const formattedDate = moment(date).format("YYYY-MM-DD");
    const startOfDay = moment(formattedDate).startOf("day").utc().toDate();
    const endOfDay = moment(formattedDate).endOf("day").utc().toDate();

    const attendanceRecords = await Attendance.find({
      "branch.text": branch,
      time: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
    });

    let students = [];
    if (branch) {
      const attendanceIds = attendanceRecords.map((record) => record.id);
      students = await Profile.find({ Branch: branch });

      const filteredStudents = students.filter(
        (student) => !attendanceIds.includes(student._id.toString())
      );

      if (filteredStudents.length > 0) {
        let absentRecords = [];

        // Iterate over each filtered student
        filteredStudents.forEach((student) => {
          // console.log(student.Courses);
          if (student.Courses && Array.isArray(student.Courses)) {
            // Create an absent record for each course in the Courses array
            student.Courses.forEach((course) => {
              absentRecords.push({
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
                branch: student.Branch || "",
                course: course.course || "",
                batch: course.batch || "",
                status: "absent",
                date: formattedDate,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            });
          }
        });

        console.log(absentRecords);
        await Absent.insertMany(absentRecords);
        console.log("Absent students saved to the Absent collection.");
      }
    }

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
    const { date, branch, batch, key } = req.query; // Extract query parameters
    const searchDate = date ? new Date(date) : null;
    const searchBranch = branch || "";
    const searchBatch = batch || "";

    // Validate the key to decide which model to use
    const Model =
      key === "absent" ? Absent : key === "attendance" ? Attendance : null;

    if (!Model) {
      return res.status(400).send("Invalid key. Use 'absent' or 'attendance'.");
    }

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

    // Fetch records from the selected model
    const recordsData = await Model.find(query);

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

    const records = recordsData.map((record) => ({
      Name: record.Name,
      roll: record.roll,
      Phone: record.Phone,
      batch: record.batch,
      branchName: record.branch?.text || "N/A",
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
