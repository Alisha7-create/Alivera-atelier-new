import handleLogin from '../api/auth/login.js';
import handleRegister from '../api/auth/register.js';
import handleLogout from '../api/auth/logout.js';
import handleSession from '../api/auth/session.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // API Routes mapping to your api/auth/ files
    if (path === '/api/auth/login') {
      return handleLogin(request, env);
    }
    if (path === '/api/auth/signup') {
      return handleRegister(request, env);
    }
    if (path === '/api/auth/logout') {
      return handleLogout(request, env);
    }
    if (path === '/api/auth/session') {
      return handleSession(request, env);
    }

    // Route /login to login.html
    if (path === '/login' || path === '/login.html') {
      return env.ASSETS.fetch(new Request(new URL('/login.html', request.url), request));
    }

    // Default: Serve static assets (index.html, logo.png, etc. from public folder)
    return env.ASSETS.fetch(request);
  },
};
