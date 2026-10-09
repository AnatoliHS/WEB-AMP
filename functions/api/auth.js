// Decap CMS login, step 1: send the admin to GitHub to approve access.
// Needs GITHUB_CLIENT_ID (Cloudflare Pages > Settings > Variables and Secrets).
export async function onRequestGet({ request, env }) {
  if (!env.GITHUB_CLIENT_ID) {
    return new Response("GITHUB_CLIENT_ID is not configured", { status: 500 });
  }

  const origin = new URL(request.url).origin;
  const state = crypto.randomUUID();

  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", `${origin}/api/callback`);
  authorize.searchParams.set("scope", "repo,user");
  authorize.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorize.toString(),
      // Checked in the callback so the login can't be started from another site
      "Set-Cookie": `decap_oauth_state=${state}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
}
