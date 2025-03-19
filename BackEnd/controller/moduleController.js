const Module = require("../models/moduleModel");

// Get all modules (standalone - not tied to exams)
const getModules = async (req, res) => {
  try {
    const { sectionName } = req.query;
    
    let query = { isActive: true };
    if (sectionName) {
      query.sectionName = sectionName;
    }
    
    const modules = await Module.find(query).sort({ sectionName: 1, order: 1 });
    res.status(200).json(modules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single module by ID
const getModule = async (req, res) => {
  try {
    const { id } = req.params;
    const module = await Module.findById(id);
    
    if (!module) {
      return res.status(404).json({ error: "Module not found" });
    }
    
    res.status(200).json(module);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a module (standalone)
const createModule = async (req, res) => {
  try {
    const moduleData = req.body;
    
    // Validate required fields
    if (!moduleData.name || !moduleData.title || !moduleData.sectionName) {
      return res.status(400).json({ 
        error: "Module name, title, and sectionName are required" 
      });
    }
    
    // Ensure sectionName is valid
    if (!["English", "Math"].includes(moduleData.sectionName)) {
      return res.status(400).json({ 
        error: "sectionName must be 'English' or 'Math'" 
      });
    }
    
    const module = await Module.create(moduleData);
    res.status(201).json({
      message: "Module created successfully",
      module,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a module
const updateModule = async (req, res) => {
  try {
    const { id } = req.params;
    const module = await Module.findByIdAndUpdate(id, req.body, { new: true });
    
    if (!module) {
      return res.status(404).json({ error: "Module not found" });
    }
    
    res.status(200).json(module);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a module
const deleteModule = async (req, res) => {
  try {
    const { id } = req.params;
    const module = await Module.findByIdAndDelete(id);
    
    if (!module) {
      return res.status(404).json({ error: "Module not found" });
    }
    
    res.status(200).json({ message: "Module deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getModules,
  getModule,
  createModule,
  updateModule,
  deleteModule,
};
