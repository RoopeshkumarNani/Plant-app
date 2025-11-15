/**
 * API Configuration
 * Update this URL with your Render backend service URL after deployment
 * Cache-buster: 20250115_v2
 */

// Local development
const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

// Set this to your Render backend URL
// Example: https://plant-app-backend-xxxx.onrender.com
const RENDER_BACKEND_URL = "https://plant-app-backend-h28h.onrender.com";

const API_BASE_URL = isLocalhost ? "http://localhost:3000" : RENDER_BACKEND_URL;

if (typeof window !== "undefined") {
  console.log("🔧 API Base URL:", API_BASE_URL);
  console.log("📍 Current Host:", window.location.origin);
}
