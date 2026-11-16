require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../src/models/User");
(async () => {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12) {
    throw new Error("Set ADMIN_EMAIL and a strong ADMIN_PASSWORD (at least 12 characters) in .env first.");
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const email = process.env.ADMIN_EMAIL.toLowerCase();
  const exists = await User.findOne({ email });
  if (exists) {
    exists.role = "admin"; exists.status = "active"; await exists.save();
    console.log("Existing user promoted to admin:", email);
  } else {
    await User.create({
      name: process.env.ADMIN_NAME || "GITTS Administrator", email,
      phone: "254700000000", passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
      role: "admin", status: "active", referralCode: "ADMIN" + Date.now().toString().slice(-5)
    });
    console.log("Admin created:", email);
  }
  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
