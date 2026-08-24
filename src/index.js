export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    try {
      // 1. Handle Login API endpoint
      if (url.pathname === '/api/auth/login' && request.method === 'POST') {
        const { email, password } = await request.json();
        const cleanEmail = (email || "").trim().toLowerCase();

        if (!cleanEmail || !password) {
          return Response.json({ error: "Email and password are required" }, { status: 400 });
        }

        if (!env.DB) {
          return Response.json({ error: "Database binding 'DB' not found in Wrangler config" }, { status: 500 });
        }

        // Query D1 Database
        const user = await env.DB.prepare(
          "SELECT * FROM users WHERE LOWER(email) = ?"
        ).bind(cleanEmail).first();

        if (!user || user.password !== password) {
          return Response.json({ error: "Invalid email or password" }, { status: 401 });
        }

        const cookieVal = encodeURIComponent(cleanEmail);
        return Response.json(
          { success: true, user: { email: cleanEmail, name: user.name || "Admin" } },
          {
            status: 200,
            headers: {
              "Set-Cookie": `alivera_session=${cookieVal}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
            }
          }
        );
      }

      // 2. Handle User Session Check API endpoint
      if (url.pathname === '/api/auth/me') {
        const cookieHeader = request.headers.get('Cookie') || '';
        const match = cookieHeader.match(/alivera_session=([^;]+)/);

        if (match && env.DB) {
          const email = decodeURIComponent(match[1]);
          const user = await env.DB.prepare("SELECT name, email FROM users WHERE LOWER(email) = LOWER(?)").bind(email).first();
          if (user) {
            return Response.json({ user });
          }
        }
        return Response.json({ user: null });
      }

      // 3. Handle Logout API endpoint
      if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
        return Response.json(
          { success: true },
          {
            headers: {
              "Set-Cookie": "alivera_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
            }
          }
        );
      }

      // 4. Catch-all for other unmatched /api/ routes
      if (url.pathname.startsWith('/api/')) {
        return Response.json({ error: "API Route not found" }, { status: 404 });
      }

      // 5. Serve static assets (HTML, images, CSS) from public folder
      return env.ASSETS.fetch(request);

    } catch (err) {
      // Catch any unexpected crashes and return the error text for easy debugging
      return Response.json({ error: "Server Exception: " + err.message }, { status: 500 });
    }
  }
};
