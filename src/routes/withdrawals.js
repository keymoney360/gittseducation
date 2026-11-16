const router = require("express").Router();
const mongoose = require("mongoose");
const Withdrawal = require("../models/Withdrawal");
const Ledger = require("../models/Ledger");
const { requireAuth } = require("../middleware/security");
const { minWithdrawal } = require("../config");
router.get("/", requireAuth, async (req, res) => res.json(await Withdrawal.find({ user: req.session.userId }).sort({ createdAt: -1 })));
router.post("/", requireAuth, async (req, res) => {
  const amount = Number(req.body.amount), phone = String(req.body.phone || "");
  if (!Number.isFinite(amount) || amount < minWithdrawal) return res.status(400).json({ error: `Minimum withdrawal is KSh ${minWithdrawal}.` });
  if (!/^(?:2547|2541|07|01)\\d{8}$/.test(phone.replace(/\\s/g, ""))) return res.status(400).json({ error: "Enter a valid M-Pesa phone number." });
  const session = await mongoose.startSession();
  let created;
  try {
    await session.withTransaction(async () => {
      const userId = new mongoose.Types.ObjectId(req.session.userId);
      const earned = await Ledger.aggregate([{ $match: { user: userId, type: "commission" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]).session(session);
      const used = await Withdrawal.aggregate([{ $match: { user: userId, status: { $in: ["pending", "approved", "paid"] } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]).session(session);
      const available = (earned[0]?.total || 0) - (used[0]?.total || 0);
      if (amount > available) throw new Error("Insufficient available balance.");
      [created] = await Withdrawal.create([{ user: userId, phone, amount }], { session });
    });
  } catch (e) { await session.endSession(); return res.status(400).json({ error: e.message }); }
  await session.endSession(); res.status(201).json({ message: "Withdrawal request submitted.", withdrawal: created });
});
module.exports = router;
