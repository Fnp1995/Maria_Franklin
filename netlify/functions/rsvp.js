function jsonResponse(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed." });
  }

  var scriptUrl = process.env.RSVP_GOOGLE_SCRIPT_URL;
  if (!scriptUrl) {
    return jsonResponse(503, { ok: false, error: "RSVP submissions are not configured yet." });
  }

  var payload;
  try {
    var body = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64").toString("utf8")
      : event.body || "";
    payload = JSON.parse(body);
  } catch (error) {
    return jsonResponse(400, { ok: false, error: "Invalid form submission." });
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonResponse(400, { ok: false, error: "Invalid form submission." });
  }

  try {
    var upstream = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow"
    });
    var result = await upstream.json();

    if (result.code === "duplicate_phone") {
      return jsonResponse(409, result);
    }
    if (result.ok) {
      return jsonResponse(200, result);
    }
    if (result.code === "invalid_submission") {
      return jsonResponse(400, result);
    }
    if (result.code === "not_configured" || result.code === "busy") {
      return jsonResponse(503, result);
    }
    return jsonResponse(500, { ok: false, error: "The RSVP could not be saved." });
  } catch (error) {
    console.error("RSVP backend request failed:", error.message);
    return jsonResponse(502, { ok: false, error: "The RSVP service is temporarily unavailable." });
  }
};
