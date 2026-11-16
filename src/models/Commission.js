const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  sourceUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true },
  level: { type: Number, enum: [1, 2], required: true },
  amount: { type: Number, required: true }
}, { timestamps: true });
schema.index({ payment: 1, level: 1 }, { unique: true });
module.exports = mongoose.model("Commission", schema);
