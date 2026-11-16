const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["customer", "admin"], default: "customer" },
  status: { type: String, enum: ["pending_payment", "active", "suspended"], default: "pending_payment" },
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  county: String,
  town: String,
  resetTokenHash: String,
  resetTokenExpires: Date
}, { timestamps: true });
module.exports = mongoose.model("User", userSchema);
