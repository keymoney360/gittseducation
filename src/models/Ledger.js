const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["commission", "withdrawal_hold", "withdrawal_release", "withdrawal_paid"], required: true },
  amount: { type: Number, required: true },
  reference: { type: mongoose.Schema.Types.ObjectId, required: true },
  note: String
}, { timestamps: true });
schema.index({ type: 1, reference: 1, user: 1 }, { unique: true });
module.exports = mongoose.model("Ledger", schema);
