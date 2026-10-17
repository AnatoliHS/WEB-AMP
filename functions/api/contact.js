// Contact form (Services page): checks the Turnstile challenge, validates the fields,
// then emails the message through Resend. Needs these in Cloudflare Pages >
// Settings > Variables and Secrets (or .dev.vars locally):
//   TURNSTILE_SECRET_KEY  Turnstile widget secret key
//   RESEND_API_KEY        Resend API key
// Optional overrides for the addresses below:
//   CONTACT_TO_EMAIL      where messages go (comma-separate for several)
//   CONTACT_FROM_EMAIL    sender; its domain must be verified in Resend

const DEFAULT_TO = "hi@ampvisualmedia.com";
// forms.ampvisualmedia.com is the domain verified in Resend
const DEFAULT_FROM = "AMP Website <website@forms.ampvisualmedia.com>";

// Same rule as the form: name@domain.tld, no spaces, one @, a dot in the domain, a 2+ letter ending
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

const LIMITS = { name: 200, email: 254, message: 5000 };

export async function onRequestPost({ request, env }) {
  const missing = ["TURNSTILE_SECRET_KEY", "RESEND_API_KEY"].filter(key => !env[key]);
  if (missing.length) {
    console.error(`Contact form is missing: ${missing.join(", ")}`);
    return json(500, { ok: false, error: "Our contact form isn't available right now." });
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return json(400, { ok: false, error: "We couldn't read that submission. Please try again." });
  }

  const name = clean(form.get("name"));
  const email = clean(form.get("email"));
  const message = String(form.get("message") || "").trim();
  const token = String(form.get("cf-turnstile-response") || "");

  const fields = validate({ name, email, message });
  if (Object.keys(fields).length) {
    return json(422, { ok: false, error: "Please fix the highlighted fields.", fields });
  }

  // Turnstile: confirm a real person passed the challenge on our site
  if (!token) {
    return json(400, { ok: false, error: "Please complete the verification check.", turnstile: true });
  }
  const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({
      secret: env.TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: request.headers.get("CF-Connecting-IP") || "",
    }),
  }).then(r => r.json()).catch(() => ({ success: false }));

  if (!verify.success) {
    console.warn("Turnstile rejected a contact submission", verify["error-codes"]);
    return json(403, { ok: false, error: "Verification failed. Please try again.", turnstile: true });
  }

  // Resend: the email goes to the team, with Reply-To set to the sender
  const sent = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.CONTACT_FROM_EMAIL || DEFAULT_FROM,
      to: (env.CONTACT_TO_EMAIL || DEFAULT_TO).split(",").map(address => address.trim()).filter(Boolean),
      reply_to: email,
      subject: `New website message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}\n\n(Sent from the contact form on ${new URL(request.url).host})`,
      html: `<p><strong>Name:</strong> ${escapeHtml(name)}<br><strong>Email:</strong> ${escapeHtml(email)}</p>
<p style="white-space:pre-wrap">${escapeHtml(message)}</p>
<p style="color:#888;font-size:12px">Sent from the contact form on ${escapeHtml(new URL(request.url).host)}</p>`,
    }),
  });

  if (!sent.ok) {
    console.error("Resend failed", sent.status, await sent.text().catch(() => ""));
    return json(502, { ok: false, error: "Your message couldn't be sent right now. Please try again in a moment." });
  }

  return json(200, { ok: true });
}

function validate({ name, email, message }) {
  const fields = {};
  if (!name) fields.name = "Please enter your name.";
  else if (name.length > LIMITS.name) fields.name = "That name is too long.";

  if (!email) fields.email = "Please enter your email.";
  else if (
    email.length > LIMITS.email ||
    email.split("@")[0].length > 64 ||
    !EMAIL_RE.test(email) ||
    email.includes("..")
  ) fields.email = "That email doesn't look right. Check for a typo (e.g. name@company.com).";

  if (message.length < 10) fields.message = "Tell us a little more (at least 10 characters).";
  else if (message.length > LIMITS.message) fields.message = `Please keep it under ${LIMITS.message} characters.`;
  return fields;
}

// Single-line text: trimmed, no line breaks (keeps names out of email headers' way)
const clean = value => String(value || "").replace(/[\r\n]+/g, " ").trim();

const escapeHtml = value => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
});
