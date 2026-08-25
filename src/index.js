export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;

      // 1. SIGN IN (LOGIN) ROUTE
      if (path === '/api/auth/login' && method === 'POST') {
        const { email, password } = await request.json();
        if (!email || !password) {
          return new Response(JSON.stringify({ success: false, error: 'Email and password are required.' }), {
            status: 400, headers: { 'Content-Type': 'application/json' }
          });
        }

        if (!env || !env.DB) {
          return new Response(JSON.stringify({ success: false, error: 'Database configuration missing.' }), {
            status: 500, headers: { 'Content-Type': 'application/json' }
          });
        }

        const user = await env.DB.prepare('SELECT * FROM users WHERE email = ? AND password = ?').bind(email, password).first();
        if (!user) {
          return new Response(JSON.stringify({ success: false, error: 'Invalid email or password.' }), {
            status: 400, headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ success: true, message: 'Signed in successfully!' }), {
          status: 200, headers: { 'Content-Type': 'application/json' }
        });
      }

      // 2. SIGN UP (REGISTER) ROUTE
      if (path === '/api/auth/signup' && method === 'POST') {
        const { name, email, password } = await request.json();
        if (!name || !email || !password) {
          return new Response(JSON.stringify({ success: false, error: 'All fields are required.' }), {
            status: 400, headers: { 'Content-Type': 'application/json' }
          });
        }

        const existing = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
        if (existing) {
          return new Response(JSON.stringify({ success: false, error: 'Email is already registered.' }), {
            status: 400, headers: { 'Content-Type': 'application/json' }
          });
        }

        await env.DB.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)')
          .bind(name, email, password)
          .run();

        return new Response(JSON.stringify({ success: true, message: 'Account created successfully!' }), {
          status: 200, headers: { 'Content-Type': 'application/json' }
        });
      }

      // 3. LOGOUT ROUTE
      if (path === '/api/auth/logout' && method === 'POST') {
        return new Response(JSON.stringify({ success: true, message: 'Signed out successfully!' }), {
          status: 200, headers: { 'Content-Type': 'application/json' }
        });
      }

      // 4. SESSION ROUTE
      if (path === '/api/auth/session' && method === 'GET') {
        return new Response(JSON.stringify({ success: true, isAuthenticated: false }), {
          status: 200, headers: { 'Content-Type': 'application/json' }
        });
      }

      // 5. LOGIN PAGE ROUTING
      if (path === '/login' || path === '/login.html') {
        return env.ASSETS.fetch(request);
      }

      // 6. DEFAULT: STATIC ASSETS (Favicon, images, index.html)
      return await env.ASSETS.fetch(request);

    } catch (err) {
      // Gracefully handle missing favicons so they don't throw 500 errors
      if (request.url.includes('favicon.ico')) {
        return new Response(null, { status: 404 });
      }

      return new Response(JSON.stringify({ success: false, error: 'Server Error: ' + err.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }
  },
};
