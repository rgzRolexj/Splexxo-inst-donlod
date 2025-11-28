// ================= CONFIGURATION =================
const CONFIG = {
    YOUR_API_KEYS: ["SPLEXXO_INSTA", "TESTKEY"], // Apni Keys yahan daalo
    
    // ✅ Maine yahan ek Working Public API laga di hai
    // Ye API free hai aur Instagram ka data nikal kar deti hai
    TARGET_API_BASE: "https://api.nyxs.pw/dl/ig?url=", 

    CACHE_TIME: 30 * 60 * 1000, // 30 Minutes Cache
    
    BRANDING: {
        service: "Splexxo-Insta-Pro",
        type: "Premium Downloader",
        powered_by: "Splexxo Infrastructure"
    }
};
// =================================================

const cache = new Map();

export default async function handler(req, res) {
    // 1. CORS Headers (Sab jagah chalne ke liye)
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

    // 5. Upstream API Call (Asli kaam yahan ho raha hai)
    try {
        const targetUrl = `${CONFIG.TARGET_API_BASE}${encodeURIComponent(instaUrl)}`;
        const upstreamResponse = await fetch(targetUrl);
        
        if (!upstreamResponse.ok) {
            throw new Error(`Upstream API Error: ${upstreamResponse.status}`);
        }

        const data = await upstreamResponse.json();

        // 6. Data Validation (Kya data sahi aaya?)
        if (!data.status && data.message !== "success") {
             throw new Error("Instagram API returned invalid data.");
        }

        // 7. Data Cleaning & Rebranding
        // (Hum check karenge ki video hai ya image aur use nikalenge)
        const resultData = data.result || data.data; // API format handle karna
        
        let mediaUrl = "";
        let mediaType = "unknown";

        // Agar array hai (multiple images/videos)
        if (Array.isArray(resultData)) {
            mediaUrl = resultData[0].url;
            mediaType = resultData[0].type || "video";
        } 
        // Agar single object hai
        else if (resultData.url) {
            // Kabhi kabhi 'url' array hota hai, kabhi string
            mediaUrl = Array.isArray(resultData.url) ? resultData.url[0] : resultData.url;
            mediaType = "media";
        }

        // 8. Final Splexxo Response
        const brandedResponse = {
            ...CONFIG.BRANDING,
            status: "success",
            post_info: {
                // Agar upstream API caption deta hai to thik, nahi to default
                caption: resultData.caption || "Instagram Post",
                original_link: instaUrl
            },
            downloads: {
                main_media: mediaUrl,
                backup_link: mediaUrl // Backup ke liye same link
            }
        };

        // 9. Cache & Send
        cache.set(instaUrl, { timestamp: now, response: brandedResponse });
        res.setHeader("X-Proxy-Cache", "MISS");
        return res.status(200).json(brandedResponse);

    } catch (error) {
        return res.status(500).json({
            status: false,
            error: "Process Failed",
            details: error.message,
            suggestion: "Link check karein ya thodi der baad try karein."
        });
    }
}
