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
          return Response.json({ error: "Database binding 'DB' not found" }, { status: 500 });
        }

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

      // 4. API catch-all
      if (url.pathname.startsWith('/api/')) {
        return Response.json({ error: "API Route not found" }, { status: 404 });
      }

      // 5. Explicit HTML page routing
      if (url.pathname === '/' || url.pathname === '') {
        return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
      }
      if (url.pathname === '/login') {
        return env.ASSETS.fetch(new Request(new URL('/login.html', request.url), request));
      }

      // 6. Default fallback for assets (images, css, etc.)
      return env.ASSETS.fetch(request);

    } catch (err) {
      return Response.json({ error: "Server Exception: " + err.message }, { status: 500 });
    }
  }
};
