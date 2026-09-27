export default async function handler(req, res) {
    const API_BASE = "https://e.truckyapp.com";
    
    // Vercel routes query parameters including path splats
    let { type, path } = req.query;
    
    // Si la ruta viene en formato array por el mapeo de Next/Vercel
    if (Array.isArray(path)) {
        path = path.join("/");
    }

    if (!path) {
        return res.status(400).json({ error: "Endpoint requerido" });
    }

    let targetPath = "";

    // Lógica principal de enrutamiento:
    // El frontend ya proporciona la ruta completa después del prefijo /api/trucky/ o /api/trucky-user/
    // Por ejemplo, llama a: /api/trucky/api/v1/company/45279/members
    // El rewrite en vercel.json captura: api/v1/company/45279/members
    targetPath = path;

    // Comprobar si es CDN
    const isCdn = targetPath.startsWith("cdn.truckyapp.com");
    let url;
    if (isCdn) {
        url = `https://${targetPath}`;
    } else {
        url = `${API_BASE}/${targetPath}`;
    }

    // Pasar parámetros de query, excepto los de Vercel routing ('type' y 'path')
    const qs = new URLSearchParams(req.query);
    qs.delete('type');
    qs.delete('path');
    const qsString = qs.toString();
    if (qsString) {
        url += (url.includes("?") ? "&" : "?") + qsString;
    }

    try {
        const fetchHeaders = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        };

        if (!isCdn) {
            fetchHeaders["Accept"] = "application/json";
        } else {
            fetchHeaders["Accept"] = "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8";
        }

        const response = await fetch(url, {
            headers: fetchHeaders
        });

        const contentType = response.headers.get("content-type") || "application/json";
        
        // CORS and Caching Headers
        res.setHeader("Access-Control-Allow-Origin", "*");
        
        if (contentType.includes("application/json")) {
            const data = await response.json();
            // Respuestas buenas: cache compartida en el CDN de Vercel para todos los visitantes
            // (menos llamadas a Trucky = menos HTTP 429). Errores: nunca se cachean.
            res.setHeader(
                "Cache-Control",
                response.ok
                    ? "public, max-age=300, s-maxage=600, stale-while-revalidate=1800"
                    : "no-store"
            );
            res.setHeader("Content-Type", "application/json");
            return res.status(response.status).json(data);
        } else {
            // Manejar datos binarios (imágenes para los avatars)
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            res.setHeader("Cache-Control", "public, max-age=3600");
            res.setHeader("Content-Type", contentType);
            return res.status(response.status).send(buffer);
        }

    } catch (error) {
        return res.status(500).json({
            error: "Error conectando con Trucky API proxy",
            details: error.message
        });
    }
}
