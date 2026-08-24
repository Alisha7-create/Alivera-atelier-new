import loginHandler from '../api/auth/login.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Handle API Login
    if (url.pathname === '/api/auth/login') {
      return loginHandler(request, env, ctx);
    }

    // 2. Handle Auth Session Check Endpoint
    if (url.pathname === '/api/auth/me') {
      // Return unauthenticated by default, or check session cookies/tokens if implemented
      return Response.json({ user: null });
    }

    // 3. Serve Frontend Pages (via Cloudflare Workers Static Assets binding)
    if (env.ASSETS) {
      // If someone visits /login, rewrite the request to serve login.html
      if (url.pathname === '/login') {
        return env.ASSETS.fetch(new Request(new URL('/login.html', request.url), request));
      }
      return env.ASSETS.fetch(request);
    }

    // Fallback if assets aren't bound
    return new Response(JSON.stringify({ error: "Route not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
};
