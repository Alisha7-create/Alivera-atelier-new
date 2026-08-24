export async function onRequestPost(context) {
    try {
        const { email, password } = await context.request.json();
        
        if (!email || !password) {
            return new Response(JSON.stringify({ error: "Email and password are required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Query your D1 database binding (DB)
        const user = await context.env.DB.prepare(
            "SELECT * FROM users WHERE email = ?"
        ).bind(email).first();

        if (!user || user.password !== password) { // Note: ensure proper hashing in production
            return new Response(JSON.stringify({ error: "Invalid email or password" }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Return successful login response
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
