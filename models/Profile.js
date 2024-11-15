const { profileDB } = require("../db"); // Import profileDB connection
const mongoose = require("mongoose");

// Define schema for profile data
const profileSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true },
    Address: { type: String },
    Email: { type: String },
    FbLink: { type: String },
    FbName: { type: String },
    HSC: { type: String },
    Institution: { type: String },
    Name: { type: String },
    Parent: { type: String },
    Phone: { type: String },
    roll: { type: String },
    photo: { type: String },
    Branch: { type: String },
    Courses: [
      {
        course: { type: String },
        code: { type: String },
        branchCode: { type: String },
        branch: { type: String },
        batchCode: { type: String },
        batch: { type: String },
        date: { type: String },
        access: { type: String },
      },
    ],
    offline: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { collection: "profiles" }
);

// Middleware to set `updated_at` before saving
profileSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

// Create Profile model from the separate connection
const Profile = profileDB.model("Profile", profileSchema);

module.exports = Profile;
