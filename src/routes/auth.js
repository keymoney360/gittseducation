const router = require("express").Router();
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { nanoid } = require("nanoid");
const User = require("../models/User");
const Payment = require("../models/Payment");
const { stkPush } = require("../services/daraja");
const { registrationFee } = require("../config");
const { authLimiter, requireAuth } = require("../middleware/security");
const { sendResetEmail } = require("../services/mailer");

router.post("/register", authLimiter, async (req, res, next) => {
  try {
    const { name, email, phone, password, referralCode, county, town } = req.body;
    if (!name || !email || !phone || !password || password.length  6) return res.status(400).json({ error: "Complete all required fields. Password must be at least 6 characters." });

    // FIXED: Accept 07..., 01..., 254..., +254... and normalize to 254... for M-Pesa
    let cleanPhone = String(phone || "").replace(/[\s-]/g, "");
    if (cleanPhone.startsWith("+")) cleanPhone = cleanPhone.slice(1);
    if (/^0[17]\d{8}$/.test(cleanPhone)) cleanPhone = "254" + cleanPhone.slice(1);
    if (!/^254[17]\d{8}$/.test(cleanPhone)) return res.status(400).json({ error: "Enter a valid Kenyan phone number." });

    if (await User.findOne({ $or: [{ email: email.toLowerCase() }, { phone: cleanPhone }] })) return res.status(409).json({ error: "Email or phone number already registered." });
    let referrer = null;
    if (referralCode) {
      referrer = await User.findOne({ referralCode, status: "active" });
      if (!referrer) return res.status(400).json({ error: "Referral code is invalid." });
    }
    const user = await User.create({
      name, email, phone: cleanPhone, passwordHash: await bcrypt.hash(password, 12),
      referralCode: nanoid(9).toUpperCase(), referredBy: referrer?._id || null,
      county, town, status: "pending_payment"
    });
    const payment = await Payment.create({ user: user._id, kind: "registration", amount: registrationFee, phone: cleanPhone, status: "initiated" });
    try {
      const result = await stkPush({ phone: cleanPhone, amount: registrationFee, accountReference: `REG${user._id.toString().slice(-8)}`, transactionDesc: "GITTS Registration" });
      payment.merchantRequestId = result.MerchantRequestID;
      payment.checkoutRequestId = result.CheckoutRequestID;
      payment.status = "pending";
      await payment.save();
      res.status(201).json({ message: "Registration saved. Complete the M-Pesa prompt to activate your account.", checkoutRequestId: result.CheckoutRequestID });
    } catch (e) {
      await User.deleteOne({ _id: user._id });
      await Payment.deleteOne({ _id: payment._id });
      throw e;
    }
  } catch (e) { next(e); }
});

router.post("/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email || "").toLowerCase() });
  if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) return res.status(401).json({ error: "Invalid email or password." });
  if (user.status === "suspended") return res.status(403).json({ error: "Account suspended. Contact support." });
  if (user.status !== "active") return res.status(403).json({ error: "Your registration payment is not yet confirmed." });
  req.session.userId = user._id.toString(); req.session.role = user.role;
  res.json({ message: "Logged in", user: { name: user.name, role: user.role } });
});
router.post("/logout", requireAuth, (req, res) => req.session.destroy(() => res.json({ message: "Logged out" })));
router.get("/me", requireAuth, async (req, res) => {
  const u = await User.findById(req.session.userId).select("name email phone role status referralCode county town");
  res.json({ user: u });
});
router.post("/forgot-password", authLimiter, async (req, res, next) => {
  try {
    const user = await User.findOne({ email: String(req.body.email || "").toLowerCase() });
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      user.resetTokenHash = crypto.createHash("sha256").update(token).digest("hex");
      user.resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();
      await sendResetEmail(user.email, `${process.env.BASE_URL}/reset-password.html?token=${token}&email=${encodeURIComponent(user.email)}`);
    }
    res.json({ message: "If that email exists, a password reset link has been sent." });
  } catch (e) { next(e); }
});
router.post("/reset-password", authLimiter, async (req, res) => {
  const { email, token, password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });
  const hash = crypto.createHash("sha256").update(String(token || "")).digest("hex");
  const user = await User.findOne({ email: String(email || "").toLowerCase(), resetTokenHash: hash, resetTokenExpires: { $gt: new Date() } });
  if (!user) return res.status(400).json({ error: "Reset link is invalid or expired." });
  user.passwordHash = await bcrypt.hash(password, 12); user.resetTokenHash = undefined; user.resetTokenExpires = undefined;
  await user.save(); res.json({ message: "Password changed. You can now log in." });
});
module.exports = router;