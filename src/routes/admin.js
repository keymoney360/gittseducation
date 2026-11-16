const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { requireAdmin } = require("../middleware/security");
const User = require("../models/User");
const Book = require("../models/Book");
const Payment = require("../models/Payment");
const Order = require("../models/Order");
const Withdrawal = require("../models/Withdrawal");
const Ledger = require("../models/Ledger");
const uploadDir = path.join(__dirname, "../../uploads");
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir, limits: { fileSize: 20 * 1024 * 1024 }, fileFilter: (_req, file, cb) => {
  if (file.mimetype === "application/pdf" || file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only PDF and image files are allowed."));
}});
router.use(requireAdmin);
router.get("/overview", async (_req, res) => {
  const [users, activeUsers, pendingUsers, books, payments, withdrawals, orders] = await Promise.all([
    User.countDocuments(), User.countDocuments({ status: "active" }), User.countDocuments({ status: "pending_payment" }),
    Book.countDocuments(), Payment.countDocuments({ status: "success" }), Withdrawal.countDocuments({ status: "pending" }), Order.countDocuments({ status: "paid" })
  ]);
  res.json({ users, activeUsers, pendingUsers, books, successfulPayments: payments, pendingWithdrawals: withdrawals, paidOrders: orders });
});
router.get("/users", async (req, res) => {
  const q = String(req.query.q || "");
  const filter = q ? { $or: [{ name: new RegExp(q, "i") }, { email: new RegExp(q, "i") }, { phone: new RegExp(q, "i") }, { referralCode: new RegExp(q, "i") }] } : {};
  res.json(await User.find(filter).select("-passwordHash -resetTokenHash").sort({ createdAt: -1 }).limit(300));
});
router.patch("/users/:id/status", async (req, res) => {
  if (!["active", "suspended"].includes(req.body.status)) return res.status(400).json({ error: "Invalid status." });
  const user = await User.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }).select("-passwordHash");
  res.json({ user });
});
router.get("/books", async (_req, res) => res.json(await Book.find().sort({ createdAt: -1 })));
router.post("/books", upload.fields([{ name: "pdf", maxCount: 1 }, { name: "cover", maxCount: 1 }]), async (req, res) => {
  if (!req.files?.pdf?.[0]) return res.status(400).json({ error: "PDF file is required." });
  const pdfUrl = `/uploads/${path.basename(req.files.pdf[0].path)}`;
  const coverUrl = req.files.cover?.[0] ? `/uploads/${path.basename(req.files.cover[0].path)}` : "";
  const book = await Book.create({ title: req.body.title, description: req.body.description, category: req.body.category, price: Number(req.body.price), pdfUrl, coverUrl });
  res.status(201).json({ book });
});
router.patch("/books/:id", async (req, res) => {
  const allowed = ["title", "description", "category", "price", "active"];
  const update = {}; for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];
  res.json({ book: await Book.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }) });
});
router.delete("/books/:id", async (req, res) => { await Book.findByIdAndUpdate(req.params.id, { active: false }); res.json({ message: "Book deactivated." }); });
router.get("/payments", async (_req, res) => res.json(await Payment.find().populate("user", "name email phone").sort({ createdAt: -1 }).limit(500)));
router.get("/withdrawals", async (_req, res) => res.json(await Withdrawal.find().populate("user", "name email phone").sort({ createdAt: -1 })));
router.patch("/withdrawals/:id", async (req, res) => {
  const { status, adminNote, mpesaReceipt } = req.body;
  if (!["approved", "rejected", "paid"].includes(status)) return res.status(400).json({ error: "Invalid withdrawal status." });
  const w = await Withdrawal.findById(req.params.id);
  if (!w) return res.status(404).json({ error: "Withdrawal not found." });
  if (w.status === "paid" || w.status === "rejected") return res.status(409).json({ error: "This request is already closed." });
  if (status === "paid" && !mpesaReceipt) return res.status(400).json({ error: "Enter the M-Pesa receipt after sending the withdrawal." });
  w.status = status; w.adminNote = adminNote || ""; w.mpesaReceipt = mpesaReceipt || ""; if (status === "paid") w.processedAt = new Date();
  await w.save();
  res.json({ withdrawal: w });
});
router.get("/ledger", async (_req, res) => res.json(await Ledger.find().populate("user", "name email").sort({ createdAt: -1 }).limit(1000)));
module.exports = router;
