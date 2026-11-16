const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  phone: { type: String, required: true },
  amount: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ["pending", "approved", "rejected", "paid"], default: "pending" },
  adminNote: String,
  mpesaReceipt: String,
  processedAt: Date
}, { timestamps: true });
module.exports = mongoose.model("Withdrawal", schema);
