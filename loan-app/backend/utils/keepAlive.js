const https = require("https");

/**
 * Periodically pings the server to keep it alive on Render.
 * Render free tier spins down after 15 minutes of inactivity.
 */
const keepAlive = () => {
  const url =
    process.env.RENDER_EXTERNAL_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://loan-app-jk3z.onrender.com"
      : "https://loan-app-dev-vkwh.onrender.com");

  if (!url) {
    console.log("Keep-alive: No URL found to ping.");
    return;
  }

  const healthUrl = `${url}/api/health`;

  // Ping every 14 minutes
  setInterval(
    () => {
      https
        .get(healthUrl, (res) => {
          console.log(
            `Keep-alive ping sent to ${healthUrl}. Status: ${res.statusCode}`,
          );
        })
        .on("error", (err) => {
          console.error(`Keep-alive ping failed: ${err.message}`);
        });
    },
    14 * 60 * 1000,
  );

  console.log(`Keep-alive initiated for ${healthUrl}`);
};

module.exports = keepAlive;
