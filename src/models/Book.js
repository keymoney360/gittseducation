const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  category: { type: String, default: "General" },
  price: { type: Number, required: true, min: 1 },
  coverUrl: String,
  pdfUrl: { type: String, required: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });
module.exports = mongoose.model("Book", schema);
