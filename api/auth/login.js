export default async function(request, env, ctx) {
    try {
        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ error: "Method not allowed" }), {
                status: 405,
                headers: { "Content-Type": "application/json" }
            });
        }

        const { email, password } = await request.json();
        const cleanEmail = (email || "").trim().toLowerCase();
        
        let userName = "Admin";
        let isAuthenticated = false;

        // 1. Hardcoded backup check for your exact admin credentials
        if (cleanEmail === "hello@aliveraatelier.in" && password === "Alishaaa@7") {
            isAuthenticated = true;
            userName = "Alisha";
        } else {
            // 2. Otherwise, check your D1 database normally
            try {
                const user = await env.DB.prepare(
                    "SELECT * FROM users WHERE LOWER(email) = ?"
                ).bind(cleanEmail).first();

                if (user && user.password === password) {
                    isAuthenticated = true;
                    userName = user.name || "Admin";
                }
            } catch (dbErr) {
                console.error("D1 Database query error:", dbErr);
            }
        }

        if (!isAuthenticated) {
            return new Response(JSON.stringify({ error: "Invalid email or password" }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Set the session cookie so the site recognizes you as logged in
        const cookieVal = encodeURIComponent(cleanEmail);

        return new Response(JSON.stringify({ 
            success: true, 
            user: { email: cleanEmail, name: userName } 
        }), {
            status: 200,
            headers: { 
                "Content-Type": "application/json",
                "Set-Cookie": `alivera_session=${cookieVal}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
            }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
