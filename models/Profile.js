// models/Profile.js
const { profileDB } = require("../db"); // Import profileDB connection
const mongoose = require("mongoose");

// Define schema for profile data
const profileSchema = new mongoose.Schema(
  {
    uid: String,
    Address: String,
    Email: String,
    FbLink: String,
    FbName: String,
    HSC: String,
    Institution: String,
    Name: String,
    Parent: String,
    Phone: String,
    roll: String,
    photo: String,
    created_at: Date,
    updated_at: Date,
  },
  { collection: "profiles" }
);

// Create Profile model from the separate connection
const Profile = profileDB.model("Profile", profileSchema);

module.exports = Profile;
