const mongoose = require("mongoose");

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
module.exports = Attendance;
