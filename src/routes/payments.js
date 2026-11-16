const router = require("express").Router();
const mongoose = require("mongoose");
const Payment = require("../models/Payment");
const User = require("../models/User");
const Order = require("../models/Order");
const { awardRegistrationCommissions } = require("../services/commission");

// Safaricom callback: validate every field and match the original checkout request.
// Do not expose this endpoint to browser clients.
router.post("/mpesa/callback", async (req, res) => {
  try {
    const callback = req.body?.Body?.stkCallback;
    if (!callback?.CheckoutRequestID) return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
    const payment = await Payment.findOne({ checkoutRequestId: callback.CheckoutRequestID });
    if (!payment || payment.status === "success") return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
    payment.rawCallback = req.body;
    payment.resultCode = String(callback.ResultCode);
    if (Number(callback.ResultCode) !== 0) {
      payment.status = "failed"; await payment.save();
      return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }
    const items = callback.CallbackMetadata?.Item || [];
    const get = name => items.find(x => x.Name === name)?.Value;
    const amount = Number(get("Amount"));
    const receipt = String(get("MpesaReceiptNumber") || "");
    if (!receipt || amount !== payment.amount) {
      payment.status = "failed"; await payment.save();
      return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }
    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      payment.status = "success"; payment.receipt = receipt; await payment.save({ session });
      if (payment.kind === "registration") {
        const user = await User.findById(payment.user).session(session);
        if (user && user.status === "pending_payment") {
          user.status = "active"; await user.save({ session });
          await awardRegistrationCommissions(user, payment, session);
        }
      } else if (payment.kind === "order" && payment.order) {
        await Order.updateOne({ _id: payment.order }, { $set: { status: "paid" } }, { session });
      }
    });
    await session.endSession();
    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (e) {
    console.error("M-Pesa callback error", e);
    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
});
module.exports = router;
