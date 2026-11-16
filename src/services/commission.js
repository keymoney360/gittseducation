const Commission = require("../models/Commission");
const Ledger = require("../models/Ledger");
const User = require("../models/User");
const { directCommission, secondCommission } = require("../config");

async function awardRegistrationCommissions(newUser, payment, session) {
  const fresh = await User.findById(newUser._id).session(session);
  if (!fresh || !fresh.referredBy) return;
  const direct = await User.findById(fresh.referredBy).session(session);
  if (!direct || direct.status !== "active") return;
  const entries = [{ beneficiary: direct, level: 1, amount: directCommission }];
  if (direct.referredBy) {
    const second = await User.findById(direct.referredBy).session(session);
    if (second && second.status === "active") entries.push({ beneficiary: second, level: 2, amount: secondCommission });
  }
  for (const entry of entries) {
    const commission = await Commission.create([{
      beneficiary: entry.beneficiary._id, sourceUser: fresh._id,
      payment: payment._id, level: entry.level, amount: entry.amount
    }], { session });
    await Ledger.create([{
      user: entry.beneficiary._id, type: "commission",
      amount: entry.amount, reference: commission[0]._id,
      note: `Level ${entry.level} referral commission`
    }], { session });
  }
}
module.exports = { awardRegistrationCommissions };
