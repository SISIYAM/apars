const mongoose = require("mongoose");

// Define schema for absent students
const absentSchema = new mongoose.Schema(
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
    course: String,
    time: Date,
    branch: String,
    status: { type: String, default: "absent" }, // Mark the status as absent
    date: Date, // Date of absence
    createdAt: Date,
    updatedAt: Date,
  },
  { collection: "absents" } // Store in the "absents" collection
);

const Absent = mongoose.model("Absent", absentSchema);
module.exports = Absent;
