const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  kind: { type: String, enum: ["registration", "order"], required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  amount: { type: Number, required: true },
  phone: String,
  merchantRequestId: String,
  checkoutRequestId: { type: String, unique: true, sparse: true },
  receipt: { type: String, unique: true, sparse: true },
  status: { type: String, enum: ["initiated", "pending", "success", "failed"], default: "initiated" },
  resultCode: String,
  rawCallback: mongoose.Schema.Types.Mixed
}, { timestamps: true });
module.exports = mongoose.model("Payment", schema);
