require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

// Set up MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Middleware to parse JSON
app.use(express.json());

// Set EJS as templating engine
app.set('view engine', 'ejs');

// Define schema for MongoDB data
const studentSchema = new mongoose.Schema({
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
});

// Create MongoDB model
const Student = mongoose.model('Student', studentSchema);

// Route to render data table
app.get('/', async (req, res) => {
  try {
    const students = await Student.find({});
    res.render('index', { students });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving data');
  }
});

// Set server to listen on PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});