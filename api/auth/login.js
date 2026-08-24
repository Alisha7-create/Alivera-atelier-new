export default async function(request, env, ctx) {
    try {
        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ error: "Method not allowed" }), {
                status: 405,
                headers: { "Content-Type": "application/json" }
            });
        }

        const { email, password } = await request.json();
        
        if (!email || !password) {
            return new Response(JSON.stringify({ error: "Email and password are required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Query your D1 database binding (env.DB)
        const user = await env.DB.prepare(
            "SELECT * FROM users WHERE email = ?"
        ).bind(email).first();

        if (!user || user.password !== password) {
            return new Response(JSON.stringify({ error: "Invalid email or password" }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }

        return new Response(JSON.stringify({ success: true, user: { email: user.email, name: user.name } }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
