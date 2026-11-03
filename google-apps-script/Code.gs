var RESPONSE_SHEET_NAME = "RSVP Responses";
var RESPONSE_HEADERS = [
  "Submitted At",
  "Name",
  "RSVP",
  "Guests",
  "Phone",
  "Message",
  "Party",
  "Event"
];

function setup() {
  var properties = PropertiesService.getScriptProperties();
  var spreadsheetId = properties.getProperty("RSVP_SPREADSHEET_ID");
  var spreadsheet = spreadsheetId
    ? SpreadsheetApp.openById(spreadsheetId)
    : SpreadsheetApp.create("Franklin & Maria - Wedding RSVPs");
  var sheet = spreadsheet.getSheetByName(RESPONSE_SHEET_NAME) ||
    spreadsheet.insertSheet(RESPONSE_SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(RESPONSE_HEADERS);
    sheet.setFrozenRows(1);
  }
  properties.setProperty("RSVP_SPREADSHEET_ID", spreadsheet.getId());
  Logger.log("RSVP response sheet: " + spreadsheet.getUrl());
}

function doPost(event) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return jsonResponse({ ok: false, code: "busy", error: "Please try again shortly." });
  }

  try {
    var spreadsheetId = PropertiesService.getScriptProperties()
      .getProperty("RSVP_SPREADSHEET_ID");
    if (!spreadsheetId) {
      return jsonResponse({
        ok: false,
        code: "not_configured",
        error: "RSVP submissions are not configured yet."
      });
    }

    var payload = JSON.parse(event.postData.contents);
    var submission = validateSubmission(payload);
    if (!submission.ok) {
      return jsonResponse({
        ok: false,
        code: "invalid_submission",
        error: submission.error
      });
    }

    var sheet = SpreadsheetApp.openById(spreadsheetId)
      .getSheetByName(RESPONSE_SHEET_NAME);
    if (!sheet) {
      throw new Error("RSVP response sheet is missing.");
    }

    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var existingPhones = sheet.getRange(2, 5, lastRow - 1, 1).getDisplayValues();
      var duplicate = existingPhones.some(function (row) {
        return normalizePhone(row[0]) === submission.value.phoneKey;
      });
      if (duplicate) {
        return jsonResponse({
          ok: false,
          code: "duplicate_phone",
          error: "A reply from this phone number has already been received."
        });
      }
    }

    sheet.appendRow([
      new Date(),
      submission.value.name,
      submission.value.attending,
      submission.value.guests,
      submission.value.phone,
      submission.value.message,
      submission.value.side,
      submission.value.event
    ]);
    return jsonResponse({ ok: true });
  } catch (error) {
    console.error("RSVP submission failed:", error.message);
    return jsonResponse({
      ok: false,
      code: "server_error",
      error: "The RSVP could not be saved."
    });
  } finally {
    lock.releaseLock();
  }
}

function validateSubmission(payload) {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Invalid form submission." };
  }

  var name = String(payload.name || "").trim();
  var phone = String(payload.phone || "").trim();
  var attending = payload.attending;
  var guests = Number(payload.guests);
  var message = String(payload.message || "").trim();
  var side = String(payload.side || "").trim();
  var event = String(payload.event || "").trim();
  var phoneKey = normalizePhone(phone);

  if (!name || name.length > 120 || !phoneKey || phoneKey.length < 7 ||
      phoneKey.length > 15 || (attending !== "yes" && attending !== "no") ||
      (attending === "yes" && (!Number.isInteger(guests) || guests < 1 || guests > 30)) ||
      message.length > 1000 || side.length > 120 || event.length > 240) {
    return { ok: false, error: "Please check your name, phone number, and guest count." };
  }

  return {
    ok: true,
    value: {
      name: name,
      attending: attending,
      guests: attending === "yes" ? guests : 0,
      phone: phone,
      phoneKey: phoneKey,
      message: message,
      side: side,
      event: event
    }
  };
}

function normalizePhone(phone) {
  var digits = String(phone || "").replace(/\D/g, "");
  if (digits.indexOf("00") === 0) {
    digits = digits.slice(2);
  }
  if (digits.length === 12 && digits.indexOf("91") === 0) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.charAt(0) === "0") {
    digits = digits.slice(1);
  }
  return digits;
}

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
