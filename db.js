// db.js
const mongoose = require("mongoose");
require("dotenv").config();

// Set up main MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Set up MongoDB connection for Profile
const profileDB = mongoose.createConnection(
  "mongodb+srv://View:gC9wOjsXc0YPp2Id@apars.jz9ac.mongodb.net/Profile?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

profileDB.on("connected", () => console.log("Connected to Profile DB"));
profileDB.on("error", (err) =>
  console.error("Profile DB connection error:", err)
);

module.exports = { mongoose, profileDB };
