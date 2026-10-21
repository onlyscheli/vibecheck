exports.handler = async function (event, context) {
    // CORS-Header für alle Anfragen definieren
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

    // Preflight-Anfrage vom Browser beantworten
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers,
            body: "OK"
        };
    }

    if (event.httpMethod !== "POST") {
        return { 
            statusCode: 405, 
            headers,
            body: "Method Not Allowed" 
        };
    }

    try {
        const body = JSON.parse(event.body);
        const { vorname, sternzeichen, verfassungVal, generation, verfassungLabel } = body;

        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: "API Key fehlt auf dem Server!" })
            };
        }

        const prompt = `Erstelle einen Vibecheck für ${vorname}. 
Sternzeichen: ${sternzeichen}. 
Tagesverfassung Stufe (1=Fröhlich, 5=Aggressiv/Genervt): ${verfassungVal} (${verfassungLabel}). 
Generation: ${generation}.

Anforderungen:
- Antworte genau in 2 Absätzen.
- Absatz 1: Die tatsächlichen Vibes (ein humorvoller, passender Roast basierend auf Laune, Sternzeichen und Generation). Maximal 2 Sätze.
- Absatz 2: Motivierende positive Vibes als Kontrast. Maximal 2 Sätze.
- Gib nur die beiden Absätze aus, keine Einleitung oder Titel.`;

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.8
            })
        });

        const data = await response.json();

        if (data.error) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: data.error.message })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ result: data.choices[0].message.content.trim() })
        };

    } catch (err) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: err.message })
        };
    }
};
