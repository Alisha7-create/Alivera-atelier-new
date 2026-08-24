import loginHandler from '../api/auth/login.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Handle Login API endpoint
    if (url.pathname === '/api/auth/login') {
      return loginHandler(request, env, ctx);
    }

    // 2. Handle User Session Check API endpoint
    if (url.pathname === '/api/auth/me') {
      return Response.json({ user: null });
    }

    // 3. For any other API routes, return a standard API 404
    if (url.pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: "API Route not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Note: For regular website paths (like "/" and "/login"), 
    // Cloudflare's assets configuration handles serving your HTML files automatically.
  }
};
