const router = require("express").Router();
const path = require("path");
const Book = require("../models/Book");
const Order = require("../models/Order");
const { requireAuth } = require("../middleware/security");
router.get("/", async (_req, res) => res.json(await Book.find({ active: true }).select("-pdfUrl").sort({ createdAt: -1 })));
router.get("/mine", requireAuth, async (req, res) => {
  const orders = await Order.find({ user: req.session.userId, status: "paid" }).populate("items.book", "title pdfUrl");
  res.json(orders.flatMap(o => o.items.map(i => ({ title: i.title, bookId: i.book?._id, downloadAvailable: !!i.book?.pdfUrl }))));
});
router.get("/:id/download", requireAuth, async (req, res) => {
  const owns = await Order.exists({ user: req.session.userId, status: "paid", "items.book": req.params.id });
  if (!owns) return res.status(403).json({ error: "Purchase required." });
  const book = await Book.findById(req.params.id);
  if (!book) return res.status(404).json({ error: "Book not found." });
  if (book.pdfUrl.startsWith("/private/")) {\n    const filePath = path.join(__dirname, "../../uploads", path.basename(book.pdfUrl));\n    return res.download(filePath, `${book.title.replace(/[^a-z0-9-_]/gi, "_")}.pdf`);\n  }\n  return res.redirect(book.pdfUrl);
});
module.exports = router;
