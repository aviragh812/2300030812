require("dotenv").config();

const DEFAULT_API_URL = "http://4.224.186.213/evaluation-service/notifications";
const API_URL = (process.env.API_URL || DEFAULT_API_URL).trim();
const REQUEST_TIMEOUT_MS = 15000;

const TOKEN = (process.env.TOKEN || "")
  .trim()
  .replace(/^Bearer\s+/i, "")
  .replace(/^["']|["']$/g, "");

console.log("Token loaded:", TOKEN ? "YES" : "NO");

const weights = {
  Placement: 3,
  Result: 2,
  Event: 1
};

async function fetchUrl(url, options) {
  if (typeof fetch === "function") {
    return fetch(url, options);
  }

  const { default: nodeFetch } = await import("node-fetch");
  return nodeFetch(url, options);
}

function getPriority(notification) {
  const type =
    notification.type ||
    notification.Type ||
    notification.notificationType;

  return weights[type] || 0;
}

function getTimestamp(notification) {
  const timestamp =
    notification.createdAt ||
    notification.Timestamp ||
    notification.timestamp;

  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? 0 : parsed;
}

async function getTopNotifications() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    if (!TOKEN) {
      throw new Error(
        "TOKEN is missing. Add TOKEN=<your token> to the .env file."
      );
    }

    const response = await fetchUrl(API_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${TOKEN}`
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();

    const notifications = Array.isArray(data.notifications)
      ? data.notifications
      : [];

    notifications.sort((a, b) => {
      const priorityDiff = getPriority(b) - getPriority(a);

      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return getTimestamp(b) - getTimestamp(a);
    });

    const top10 = notifications.slice(0, 10);

    console.log("\nTop 10 Priority Notifications:\n");
    console.table(top10);
  } catch (error) {
    const reason =
      error.name === "AbortError"
        ? `Request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds`
        : error.message;

    console.log("Error fetching notifications:", reason);
    console.log("API URL:", API_URL);
  } finally {
    clearTimeout(timeout);
  }
}

getTopNotifications();