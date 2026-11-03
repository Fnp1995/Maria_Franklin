# Maria_Franklin

Wedding invitation website for Franklin & Maria.

## RSVP response setup

RSVP responses are saved to a Google Sheet. A phone number can be used for one
response; the Apps Script checks for duplicates on the server before saving.

1. Create a standalone project at [Google Apps Script](https://script.google.com/).
2. Copy `google-apps-script/Code.gs` into the project and run `setup()` once.
   Authorize it, then open the execution log to get the response spreadsheet URL.
3. Deploy the Apps Script as a web app, executing as your account and allowing
   access to anyone. Copy the deployment URL ending in `/exec`.
4. In the Netlify site settings, add the environment variable
   `RSVP_GOOGLE_SCRIPT_URL` with that `/exec` URL, then redeploy the site.
5. View submitted responses in the spreadsheet URL printed by `setup()`.

The form requires a phone number so the server can reject duplicate replies.
It stores the phone number and other submitted RSVP details in the response
spreadsheet. Treat access to that spreadsheet as private.
