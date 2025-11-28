// ================= CONFIGURATION (Bilkul Pehle Jaisa) =================
const CONFIG = {
    YOUR_API_KEYS: ["SPLEXXO_INSTA", "TESTKEY"], 
    
    // 🔥 SUPER STABLE API (Cobalt Engine - Kabhi Down Nahi Hota)
    // Ye method change kiya hai taaki Vercel par error na aaye
    TARGET_API: "https://api.cobalt.tools/api/json", 

    CACHE_TIME: 60 * 60 * 1000, // 1 Hour Cache
    
    BRANDING: {
        developer: "Splexxo",
        powered_by: "Splexxo-Cobalt-Engine",
        status: "success"
    }
};
// ======================================================================

// Simple Memory Cache
const cache = new Map();

export default async function handler(req, res) {
    // 1. CORS Headers (Standard)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(200).end();

    // 2. Parameters Nikalo
    const { url: rawUrl, key: rawKey } = req.query;

    if (!rawUrl || !rawKey) {
        return res.status(400).json({
            status: false,
            error: "Missing parameters.",
            example: "?url=INSTAGRAM_LINK&key=SPLEXXO_INSTA"
        });
    }

    const instaUrl = String(rawUrl).trim();
    const key = String(rawKey).trim();

    // 3. API Key Check
    if (!CONFIG.YOUR_API_KEYS.includes(key)) {
        return res.status(403).json({ status: false, error: "Invalid API Key" });
    }

    // 4. Cache Check
    const now = Date.now();
    const cachedData = cache.get(instaUrl);
    if (cachedData && (now - cachedData.timestamp < CONFIG.CACHE_TIME)) {
        res.setHeader("X-Proxy-Cache", "HIT");
        return res.status(200).json(cachedData.response);
    }

    // 5. Upstream Call (Is baar POST request use karenge jo fail nahi hoti)
    try {
        const response = await fetch(CONFIG.TARGET_API, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            body: JSON.stringify({
                url: instaUrl,
                vCodec: "h264", // Video quality ensure karne ke liye
                vQuality: "720",
                aFormat: "mp3",
                isAudioOnly: false
            })
        });

        const data = await response.json();

        // Agar Cobalt fail hua
        if (data.status === "error" || !data.url) {
            throw new Error(data.text || "Failed to fetch media");
        }

        // 6. Response Construction (Splexxo Branding)
        const finalResponse = {
            developer: CONFIG.BRANDING.developer,
            powered_by: CONFIG.BRANDING.powered_by,
            status: "success",
            post_info: {
                original_link: instaUrl,
                filename: data.filename || "instagram_video.mp4"
            },
            downloads: {
                // Cobalt seedha direct link deta hai jo fast chalta hai
                media_url: data.url, 
                backup_url: data.picker?.[0]?.url || data.url // Agar picker available hai
            }
        };

        // 7. Cache Save & Send
        cache.set(instaUrl, { timestamp: now, response: finalResponse });
        res.setHeader("X-Proxy-Cache", "MISS");
        return res.status(200).json(finalResponse);

    } catch (error) {
        // Error handling bilkul waisi jaisi pehle thi
        console.error("API Error:", error.message);
        return res.status(500).json({
            status: false,
            developer: "Splexxo",
            error: "Upstream API Error",
            details: error.message,
            suggestion: "Link check karein ya private account ho sakta hai."
        });
    }
}
