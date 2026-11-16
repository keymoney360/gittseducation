const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [{ book: { type: mongoose.Schema.Types.ObjectId, ref: "Book" }, title: String, price: Number, quantity: Number }],
  total: { type: Number, required: true },
  status: { type: String, enum: ["awaiting_payment", "paid", "cancelled"], default: "awaiting_payment" }
}, { timestamps: true });
module.exports = mongoose.model("Order", schema);
