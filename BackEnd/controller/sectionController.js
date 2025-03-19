const Section = require("../models/sectionModel");

// Get all sections (standalone - not tied to exams)
const getSections = async (req, res) => {
  try {
    const sections = await Section.find({ isActive: true }).sort({ order: 1 });
    res.status(200).json(sections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single section by ID
const getSection = async (req, res) => {
  try {
    const { id } = req.params;
    const section = await Section.findById(id);
    
    if (!section) {
      return res.status(404).json({ error: "Section not found" });
    }
    
    res.status(200).json(section);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a section (standalone)
const createSection = async (req, res) => {
  try {
    const sectionData = req.body;
    
    // Validate required fields
    if (!sectionData.name || !sectionData.title) {
      return res.status(400).json({ error: "Section name and title are required" });
    }
    
    // Ensure only "English" or "Math" are allowed
    if (!["English", "Math"].includes(sectionData.name)) {
      return res.status(400).json({ error: "Section name must be 'English' or 'Math'" });
    }
    
    const section = await Section.create(sectionData);
    res.status(201).json({
      message: "Section created successfully",
      section,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a section
const updateSection = async (req, res) => {
  try {
    const { id } = req.params;
    const section = await Section.findByIdAndUpdate(id, req.body, { new: true });
    
    if (!section) {
      return res.status(404).json({ error: "Section not found" });
    }
    
    res.status(200).json(section);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a section
const deleteSection = async (req, res) => {
  try {
    const { id } = req.params;
    const section = await Section.findByIdAndDelete(id);
    
    if (!section) {
      return res.status(404).json({ error: "Section not found" });
    }
    
    res.status(200).json({ message: "Section deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getSections,
  getSection,
  createSection,
  updateSection,
  deleteSection,
};
