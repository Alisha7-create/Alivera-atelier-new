import payCreate from '../api/payments/create.js';
import payVerify from '../api/payments/verify.js';
import productsHandler from '../api/products.js';
import productSlugHandler from '../api/products/[slug].js';
import storiesHandler from '../api/stories.js';
import storiesSubmitHandler from '../api/stories/submit.js';
import ordersHandler from '../api/orders.js';
import myOrdersHandler from '../api/my-orders.js';
import accountHandler from '../api/account.js';
import addressesHandler from '../api/addresses.js';
import campaignsHandler from '../api/campaigns.js';
import loginHandler from '../api/auth/login.js';
import registerHandler from '../api/auth/register.js';
import logoutHandler from '../api/auth/logout.js';
import sessionHandler from '../api/auth/session.js';
import logoHandler from '../api/brand/logo.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. Serve static assets from the public folder first (fixes styles.css, app.js, images)
    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }
    }

    // Helper for JSON responses
    const json = (data, status = 200) => new Response(JSON.stringify(data), {
      status,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" 
      }
    });

    // Wrapper for Express/Node style handler signatures
    const createReqRes = async (request, params = {}) => {
      let body = {};
      try {
        if (request.method === "POST" || request.method === "PUT" || request.method === "PATCH") {
          body = await request.json();
        }
      } catch (e) {}

      const req = {
        method: request.method,
        url: request.url,
        headers: request.headers,
        query: Object.fromEntries(url.searchParams.entries()),
        params,
        body,
        env
      };

      let status = 200;
      let headers = { "Content-Type": "application/json" };
      
      const res = {
        status(s) { status = s; return this; },
        setHeader(k, v) { headers[k] = v; return this; },
        json(data) {
          return new Response(JSON.stringify(data), { status, headers });
        },
        send(text) {
          return new Response(text, { status, headers });
        }
      };
      return { req, res };
    };

    try {
      // Make env globally available or attached if handlers expect global db
      if (env.DB) {
        globalThis.db = env.DB;
      }

      // 2. API Route Matching
      if (path === "/api/payments/create") {
        const { req, res } = await createReqRes(request);
        return await payCreate(req, res);
      }
      
      if (path === "/api/payments/verify") {
        const { req, res } = await createReqRes(request);
        return await payVerify(req, res);
      }

      if (path === "/api/products") {
        const { req, res } = await createReqRes(request);
        return await productsHandler(req, res);
      }

      // Dynamic Route: /api/products/:slug
      if (path.startsWith("/api/products/")) {
        const slug = path.replace("/api/products/", "");
        const { req, res } = await createReqRes(request, { slug });
        return await productSlugHandler(req, res);
      }

      if (path === "/api/stories") {
        const { req, res } = await createReqRes(request);
        return await storiesHandler(req, res);
      }

      if (path === "/api/stories/submit") {
        const { req, res } = await createReqRes(request);
        return await storiesSubmitHandler(req, res);
      }

      if (path === "/api/auth/login") {
        const { req, res } = await createReqRes(request);
        return await loginHandler(req, res);
      }

      if (path === "/api/auth/register") {
        const { req, res } = await createReqRes(request);
        return await registerHandler(req, res);
      }

      if (path === "/api/auth/logout") {
        const { req, res } = await createReqRes(request);
        return await logoutHandler(req, res);
      }

      // FIX: Handle both /api/auth/me AND /api/auth/session to eliminate 404s
      if (path === "/api/auth/me" || path === "/api/auth/session") {
        const { req, res } = await createReqRes(request);
        return await sessionHandler(req, res);
      }

      if (path === "/api/my-orders") {
        const { req, res } = await createReqRes(request);
        return await myOrdersHandler(req, res);
      }

      if (path === "/api/account") {
        const { req, res } = await createReqRes(request);
        return await accountHandler(req, res);
      }

      if (path === "/api/addresses") {
        const { req, res } = await createReqRes(request);
        return await addressesHandler(req, res);
      }

      if (path === "/api/campaigns") {
        const { req, res } = await createReqRes(request);
        return await campaignsHandler(req, res);
      }

      if (path === "/api/brand/logo") {
        const { req, res } = await createReqRes(request);
        return await logoHandler(req, res);
      }

      // Fallback for HTML routing
      if (env.ASSETS) {
        return await env.ASSETS.fetch(new Request(new URL('/', request.url), request));
      }

      return json({ error: "Route not found" }, 404);
    } catch (err) {
      console.error("Worker Error:", err);
      return json({ error: err.message || "Internal Server Error" }, 500);
    }
  }
};
