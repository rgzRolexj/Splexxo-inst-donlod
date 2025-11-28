// ================= CONFIGURATION =================
const CONFIG = {
    YOUR_API_KEYS: ["SPLEXXO_INSTA", "TESTKEY"], 
    
    // 🔥 PRO FEATURE: MULTIPLE APIs (Agar ek fail ho to dusra chalega)
    API_SOURCES: [
        "https://api.siputzx.my.id/api/d/ig?url=",  // Source 1 (Fast)
        "https://api.agatz.xyz/api/instagram?url="  // Source 2 (Backup)
    ],

    CACHE_TIME: 30 * 60 * 1000, // 30 Minutes Cache
    
    BRANDING: {
        service: "Splexxo-Insta-Pro",
        type: "Auto-Switching Server",
        powered_by: "Splexxo Infrastructure"
    }
};
// =================================================

const cache = new Map();

// Helper function to fetch with timeout
const fetchWithTimeout = async (url, options = {}, timeout = 8000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
};

export default async function handler(req, res) {
    // 1. CORS Headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(200).end();

    // 2. Input Parameters
    const { url: rawUrl, key: rawKey } = req.query;

    if (!rawUrl || !rawKey) {
        return res.status(400).json({
            status: false,
            error: "Missing parameters.",
            message: "Format: ?url=INSTA_LINK&key=SPLEXXO_INSTA"
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

    // 5. SMART FETCH SYSTEM (Loop through APIs)
    let finalData = null;
    let successSource = "";

    for (const apiBase of CONFIG.API_SOURCES) {
        try {
            const targetUrl = `${apiBase}${encodeURIComponent(instaUrl)}`;
            console.log(`Trying source: ${apiBase}`); // Log for debugging

            const response = await fetchWithTimeout(targetUrl);
            
            if (!response.ok) continue; // Agar error hai to next API try karo

            const data = await response.json();
            
            // Check agar data valid hai
            if (data.status || data.result || data.data) {
                finalData = data;
                successSource = apiBase;
                break; // Kaam ho gaya, loop roko
            }
        } catch (e) {
            console.error(`Failed source: ${apiBase}`, e.message);
            // Ignore error and try next API
        }
    }

    // 6. Agar saare APIs fail ho gaye
    if (!finalData) {
        return res.status(502).json({
            status: false,
            error: "All Servers Busy",
            message: "Humare dono servers abhi busy hain. Please 1 minute baad try karein."
        });
    }

    // 7. Data Cleaning (Kyunki alag APIs ka format alag hota hai)
    // Hum universal cleaner banayenge
    let mediaUrl = "";
    let caption = "Instagram Post";

    try {
        // Common patterns in public APIs
        const result = finalData.data || finalData.result || finalData;
        
        if (Array.isArray(result)) {
            mediaUrl = result.find(m => m.url)?.url || result[0].url;
        } else {
            mediaUrl = result.url || (Array.isArray(result.url) ? result.url[0] : result.url);
        }

        // Agar specific format hai (e.g. siputzx api)
        if (!mediaUrl && result.media) {
             mediaUrl = Array.isArray(result.media) ? result.media[0] : result.media;
        }

    } catch (e) {
        mediaUrl = "Error parsing media";
    }

    // 8. Final Response
    const brandedResponse = {
        ...CONFIG.BRANDING,
        server_used: successSource.includes("siputzx") ? "Server Alpha" : "Server Beta",
        status: "success",
        post_info: {
            original_link: instaUrl
        },
        downloads: {
            main_media: mediaUrl
        }
    };

    // 9. Cache Save & Send
    if (mediaUrl && mediaUrl.startsWith("http")) {
        cache.set(instaUrl, { timestamp: now, response: brandedResponse });
    }
    
    res.setHeader("X-Proxy-Cache", "MISS");
    return res.status(200).json(brandedResponse);
}
