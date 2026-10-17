// Contact form settings, available in templates as `contact`.
// The Turnstile site key is public (it goes in the page), so it lives here.
// For local testing on a hostname the widget doesn't allow (e.g. localhost), build with
// Cloudflare's always-pass test key: TURNSTILE_SITE_KEY=1x00000000000000000000AA npm run build
module.exports = {
  turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || "0x4AAAAAAFZfujs_cBG1vIQn",
  // Shown as a fallback when the form can't send
  email: "hi@ampvisualmedia.com",
};
