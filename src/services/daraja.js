const axios = require("axios");

function baseUrl() {
  const env = String(process.env.MPESA_ENV || "sandbox").trim().toLowerCase();
  if (env === "production") return "https://api.safaricom.co.ke";
  if (env === "sandbox") return "https://sandbox.safaricom.co.ke";
  throw new Error("Invalid MPESA_ENV. Use exactly production or sandbox.");
}

function cleanEnv(name) {
  return String(process.env[name] || "").trim();
}

async function accessToken() {
  const key = cleanEnv("MPESA_CONSUMER_KEY");
  const secret = cleanEnv("MPESA_CONSUMER_SECRET");
  if (!key || !secret) {
    throw new Error("Daraja consumer key/secret are not configured.");
  }

  const auth = Buffer.from(`${key}:${secret}`, "utf8").toString("base64");
  const url = `${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json"
      },
      timeout: 20000
    });
    if (!response.data?.access_token) {
      throw new Error("Safaricom OAuth response did not contain access_token.");
    }
    return response.data.access_token;
  } catch (error) {
    const status = error.response?.status;
    const responseData = error.response?.data;
    // Never log the Consumer Key, Consumer Secret, Basic header or access token.
    console.error("[Daraja OAuth failure]", {
      environment: cleanEnv("MPESA_ENV").toLowerCase(),
      host: new URL(url).host,
      status: status || null,
      response: responseData || null,
      message: error.message
    });
    const detail = responseData
      ? (typeof responseData === "string" ? responseData : JSON.stringify(responseData))
      : error.message;
    throw new Error(`Daraja OAuth failed${status ? ` (HTTP ${status})` : ""}: ${detail}`);
  }
}

async function stkPush({ phone, amount, accountReference, transactionDesc }) {
  const token = await accessToken();
  const shortcode = cleanEnv("MPESA_SHORTCODE");
  const passkey = cleanEnv("MPESA_PASSKEY");
  const callback = cleanEnv("MPESA_CALLBACK_URL") || cleanEnv("CALLBACK_URL");
  if (!shortcode || !passkey || !callback) {
    throw new Error("Daraja shortcode, passkey and MPESA_CALLBACK_URL are required. CALLBACK_URL is accepted as a temporary alias.");
  }

  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
  const normalized = String(phone || "")
    .trim()
    .replace(/\s/g, "")
    .replace(/^\+/, "")
    .replace(/^0/, "254");

  if (!/^254(?:7|1)\d{8}$/.test(normalized)) {
    throw new Error("Invalid phone number. Use 07XXXXXXXX, 01XXXXXXXX or 2547XXXXXXXX format.");
  }

  const body = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: cleanEnv("MPESA_TRANSACTION_TYPE") || "CustomerBuyGoodsOnline",
    Amount: Math.ceil(Number(amount)),
    PartyA: normalized,
    PartyB: cleanEnv("MPESA_TILL_NUMBER") || shortcode,
    PhoneNumber: normalized,
    CallBackURL: callback,
    AccountReference: String(accountReference || "GITTS").slice(0, 12),
    TransactionDesc: String(transactionDesc || "GITTS Payment").slice(0, 13)
  };

  const { data } = await axios.post(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, body, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    timeout: 25000
  });
  return data;
}

module.exports = { stkPush };
