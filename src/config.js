const fee = (key, fallback) => Number(process.env[key] || fallback);
module.exports = {
  registrationFee: fee("REGISTRATION_FEE", 300),
  directCommission: fee("DIRECT_REFERRAL_COMMISSION", 50),
  secondCommission: fee("SECOND_LEVEL_COMMISSION", 30),
  minWithdrawal: fee("MIN_WITHDRAWAL", 100)
};
