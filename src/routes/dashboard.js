const router = require("express").Router();
const { requireAuth } = require("../middleware/security");
const User = require("../models/User");
const Commission = require("../models/Commission");
const Ledger = require("../models/Ledger");
const Withdrawal = require("../models/Withdrawal");
const Order = require("../models/Order");
router.get("/", requireAuth, async (req, res) => {
  const id = req.session.userId;
  const user = await User.findById(id);
  const direct = await User.countDocuments({ referredBy: id, status: "active" });
  const directUsers = await User.find({ referredBy: id }).select("_id");
  const second = await User.countDocuments({ referredBy: { $in: directUsers.map(x => x._id) }, status: "active" });
  const commissions = await Commission.find({ beneficiary: id }).sort({ createdAt: -1 }).populate("sourceUser", "name");
  const credits = await Ledger.aggregate([{ $match: { user: user._id, type: "commission" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]);
  const paid = await Withdrawal.aggregate([{ $match: { user: user._id, status: "paid" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]);
  const held = await Withdrawal.aggregate([{ $match: { user: user._id, status: { $in: ["pending", "approved"] } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]);
  const earned = credits[0]?.total || 0, withdrawn = paid[0]?.total || 0, pending = held[0]?.total || 0;
  const orders = await Order.find({ user: id }).sort({ createdAt: -1 });
  res.json({
    user: { name: user.name, referralCode: user.referralCode, referralLink: `${process.env.BASE_URL || ""}/?ref=${user.referralCode}` },
    referrals: { direct, secondLevel: second, total: direct + second },
    earnings: { total: earned, withdrawn, pending, available: Math.max(0, earned - withdrawn - pending) },
    commissions, orders
  });
});
module.exports = router;
