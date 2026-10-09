// Decap CMS login, step 2: GitHub sends the admin back here with a code. We swap it
// for an access token and hand that to the CMS window that opened this popup.
// Needs GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET. ALLOWED_ORIGINS (optional,
// comma-separated) lists other sites allowed to receive the token, e.g. a custom domain.
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = (request.headers.get("Cookie") || "").match(/(?:^|;\s*)decap_oauth_state=([^;]+)/)?.[1];

  if (!code || !state || state !== cookieState) {
    return reply("error", { message: "Login expired or was started from another page. Please try again." });
  }

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": "decap-cms-auth" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/api/callback`,
    }),
  });
  const result = await response.json().catch(() => ({}));

  if (!result.access_token) {
    return reply("error", { message: result.error_description || "GitHub did not return an access token." });
  }

  const allowedOrigins = [url.origin, ...(env.ALLOWED_ORIGINS || "").split(",").map(o => o.trim()).filter(Boolean)];
  return reply("success", { token: result.access_token, provider: "github" }, allowedOrigins);
}

// JSON that is safe to place inside a <script> tag
const toScript = value => JSON.stringify(value).replace(/</g, "\\u003c");

// Decap's popup handshake: announce "authorizing:github", then post the result to
// the CMS window once it answers (only if it's one of our own sites).
function reply(status, content, allowedOrigins = []) {
  const message = `authorization:github:${status}:${JSON.stringify(content)}`;
  const html = `<!DOCTYPE html><html><body><p>${status === "success" ? "Logged in. You can close this window." : "Login failed."}</p>
<script>
  (function () {
    var allowed = ${toScript(allowedOrigins)};
    var message = ${toScript(message)};
    var isError = ${toScript(status !== "success")};
    window.addEventListener("message", function (e) {
      if (!isError && allowed.indexOf(e.origin) === -1) return;
      window.opener.postMessage(message, e.origin);
    }, false);
    window.opener && window.opener.postMessage("authorizing:github", "*");
  })();
</script></body></html>`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Set-Cookie": "decap_oauth_state=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
    },
  });
}
