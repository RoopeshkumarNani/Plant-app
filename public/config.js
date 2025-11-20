/**
 * API Configuration
 * Update this URL with your Replit backend service URL after deployment
 * Cache-buster: 20250120_v3
 */

// Local development
const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

// Set this to your Replit backend URL
// Example: https://b7add859-3cd7-4eed-a26d-922cd86fa3cd-00-ug3vo9n1i1we.pike.replit.dev
const REPLIT_BACKEND_URL = "https://b7add859-3cd7-4eed-a26d-922cd86fa3cd-00-ug3vo9n1i1we.pike.replit.dev";

const API_BASE_URL = isLocalhost ? "http://localhost:3000" : REPLIT_BACKEND_URL;

if (typeof window !== "undefined") {
  console.log("🔧 API Base URL:", API_BASE_URL);
  console.log("📍 Current Host:", window.location.origin);
}
