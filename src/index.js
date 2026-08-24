import loginHandler from '../api/auth/login.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Handle Login API endpoint
    if (url.pathname === '/api/auth/login' && request.method === 'POST') {
      return loginHandler(request, env, ctx);
    }

    // 2. Handle User Session Check API endpoint
    if (url.pathname === '/api/auth/me') {
      return Response.json({ user: null });
    }

    // 3. Catch-all for unmatched API routes
    if (url.pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: "API Route not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 4. Fallback to Cloudflare's static assets for homepage, login page, and images
    return env.ASSETS.fetch(request);
  }
};
