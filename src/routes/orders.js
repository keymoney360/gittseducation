const router = require("express").Router();
const Order = require("../models/Order");
const Book = require("../models/Book");
const Payment = require("../models/Payment");
const { requireAuth } = require("../middleware/security");
const { stkPush } = require("../services/daraja");
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { items, phone } = req.body;
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: "Cart is empty." });
    const normalized = [];
    for (const item of items) {
      const book = await Book.findOne({ _id: item.bookId, active: true });
      if (!book) return res.status(400).json({ error: "A selected book is unavailable." });
      normalized.push({ book: book._id, title: book.title, price: book.price, quantity: Math.max(1, Math.min(10, Number(item.quantity) || 1)) });
    }
    const total = normalized.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const order = await Order.create({ user: req.session.userId, items: normalized, total });
    const payment = await Payment.create({ user: req.session.userId, kind: "order", order: order._id, amount: total, phone, status: "initiated" });
    const result = await stkPush({ phone, amount: total, accountReference: `ORD${order._id.toString().slice(-8)}`, transactionDesc: "GITTS Books" });
    payment.merchantRequestId = result.MerchantRequestID; payment.checkoutRequestId = result.CheckoutRequestID; payment.status = "pending";
    await payment.save();
    res.status(201).json({ message: "STK Push sent. Complete payment on your phone.", orderId: order._id });
  } catch (e) { next(e); }
});
router.get("/mine", requireAuth, async (req, res) => res.json(await Order.find({ user: req.session.userId }).sort({ createdAt: -1 })));
module.exports = router;
