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
      return Response.json({ user: null });
    }

    // 3. Serve Frontend Pages via Cloudflare Static Assets
    if (env.ASSETS) {
      // If visiting homepage root, serve index.html
      if (url.pathname === '/') {
        return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
      }
      // If visiting /login, serve login.html
      if (url.pathname === '/login') {
        return env.ASSETS.fetch(new Request(new URL('/login.html', request.url), request));
      }
      // Serve any other static assets (images, css, etc.)
      return env.ASSETS.fetch(request);
    }

    // Fallback error if assets binding isn't configured
    return new Response(JSON.stringify({ error: "Route not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
};
