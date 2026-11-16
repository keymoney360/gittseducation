const axios = require("axios");

function baseUrl() {
  return process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}
async function accessToken() {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) throw new Error("Daraja consumer key/secret are not configured.");
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const { data } = await axios.get(`${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` }, timeout: 20000
  });
  return data.access_token;
}
async function stkPush({ phone, amount, accountReference, transactionDesc }) {
  const token = await accessToken();
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const callback = process.env.MPESA_CALLBACK_URL;
  if (!shortcode || !passkey || !callback) throw new Error("Daraja shortcode, passkey and callback URL are required.");
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
  const normalized = String(phone).replace(/^0/, "254").replace(/^\\+/, "");
  const body = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: process.env.MPESA_TRANSACTION_TYPE || "CustomerBuyGoodsOnline",
    Amount: Math.ceil(amount),
    PartyA: normalized,
    PartyB: process.env.MPESA_TILL_NUMBER || shortcode,
    PhoneNumber: normalized,
    CallBackURL: callback,
    AccountReference: accountReference.slice(0, 12),
    TransactionDesc: transactionDesc.slice(0, 13)
  };
  const { data } = await axios.post(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, body, {
    headers: { Authorization: `Bearer ${token}` }, timeout: 25000
  });
  return data;
}
module.exports = { stkPush };
