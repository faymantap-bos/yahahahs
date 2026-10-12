import bulk from "../fixbulk.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({
      status: false,
      error: "Method not allowed"
    });
  }

  try {
    const bulkResult = await bulk(1);
    const account = bulkResult?.results?.[0];

    if (!account?.status) {
      throw new Error(account?.error || "Gagal membuat akun");
    }

    // Keep the current response shape while supporting older cached clients.
    const responseData = {
      ...account,
      inbox_link: account.inbox,
      membership: account.membershipStatus,
      plan: account.planName,
      subscription: account.orderId,
      valid_until: account.validUntil
    };

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(responseData);
  } catch (err) {
    return res.status(502).json({
      status: false,
      error: err?.message || "Gagal membuat akun"
    });
  }
}
