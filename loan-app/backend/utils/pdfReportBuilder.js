// Uses a hidden, automated browser to log into the app as a real user would,
// open the Analytics page with both trend charts set to "All Time", and
// save the whole page as a PDF. Production uses a lightweight,
// serverless-optimized Chromium build (much smaller/lighter than full
// Puppeteer's bundled browser) since this runs on a memory-constrained
// free-tier host; local development uses full Puppeteer (with its own
// bundled Chromium) for easier testing on Windows.

const getBrowser = async () => {
  if (process.env.NODE_ENV === "production") {
    // @sparticuz/chromium ships as an ESM module — required via plain
    // CommonJS require(), its real API (executablePath, args, etc.) sits
    // under a .default property instead of directly on the module. Fall
    // back to the module itself in case a future version stops needing
    // the wrapping.
    const chromiumModule = require("@sparticuz/chromium");
    const chromium = chromiumModule.default || chromiumModule;
    const puppeteer = require("puppeteer-core");
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
      defaultViewport: { width: 1600, height: 1200 },
    });
  }
  const puppeteer = require("puppeteer");
  return puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1600, height: 1200 },
  });
};

// FRONTEND_URL is a comma-separated CORS allowlist (e.g.
// "http://localhost:3000,https://www.squarefinance.org"), not a single
// navigable address — pick the one matching where this code is actually
// running, so local testing hits localhost and production hits the live site.
const resolveFrontendUrl = () => {
  const candidates = (process.env.FRONTEND_URL || "")
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);

  const isProd = process.env.NODE_ENV === "production";
  const match = candidates.find((u) =>
    isProd ? !u.includes("localhost") : u.includes("localhost")
  );

  return (match || candidates[0] || "").replace(/\/$/, "");
};

const buildAnalyticsPagePdf = async ({ loginEmail, loginPassword, loginAccessKey }) => {
  const baseUrl = resolveFrontendUrl();
  if (!baseUrl) throw new Error("FRONTEND_URL not configured");

  const browser = await getBrowser();
  try {
    const page = await browser.newPage();

    // 1. Log in
    // NOTE: waitUntil "networkidle0/2" is intentionally NOT used anywhere in
    // this file — the app holds a persistent Socket.IO connection open for
    // real-time notifications, so the network is never fully idle and those
    // conditions would hang until Puppeteer's own timeout. Waiting for
    // specific elements/URL changes instead.
    await page.goto(`${baseUrl}/admin/login`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[name="email"]', { timeout: 20000 });
    await page.type('input[name="email"]', loginEmail, { delay: 20 });
    await page.type('input[name="password"]', loginPassword, { delay: 20 });
    if (loginAccessKey) {
      await page.type('input[name="accessKey"]', loginAccessKey, { delay: 20 });
    }
    await page.keyboard.press("Enter");

    // Wait for the client-side redirect away from the login page
    await page.waitForFunction(
      () => !window.location.pathname.includes("/admin/login"),
      { timeout: 20000 }
    );

    // 2. Go to Analytics (fresh navigation, so auth cookie/token from login carries over)
    await page.goto(`${baseUrl}/admin/analytics`, { waitUntil: "domcontentloaded" });
    // Wait for a stat card to actually render, confirming data has loaded
    await page.waitForSelector('select[data-report-select="monthly-trend"]', { timeout: 20000 });

    // Give the initial stats + charts a moment to finish drawing
    await new Promise((r) => setTimeout(r, 3000));

    // 3. Force both trend-chart dropdowns to "All Time"
    for (const chartId of ["monthly-trend", "yearly-trend"]) {
      const selector = `select[data-report-select="${chartId}"]`;
      const exists = await page.$(selector);
      if (exists) {
        await page.select(selector, "all");
      }
    }

    // Let the charts refetch + redraw after the dropdown change
    await new Promise((r) => setTimeout(r, 3000));

    // 4. Stop card/chart containers from being sliced across a page break.
    // This CSS only exists inside this throwaway headless-browser page —
    // it's never added to the actual deployed site, so it has zero effect
    // on how the live Analytics page looks or behaves for real users.
    await page.addStyleTag({
      content: `
        [class*="rounded-3xl"], [class*="rounded-2xl"],
        [class*="rounded-[2rem]"], [class*="rounded-[2.5rem]"],
        [class*="rounded-[1.5rem]"] {
          break-inside: avoid;
          page-break-inside: avoid;
        }
      `,
    });

    // 5. Capture the full page as a PDF
    // page.pdf() returns a Uint8Array, not a true Node Buffer — must wrap
    // it, otherwise .toString('base64') downstream silently produces
    // garbage (a comma-separated list of byte numbers) instead of real
    // base64, corrupting the attachment.
    const pdfBytes = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
    });

    return Buffer.from(pdfBytes);
  } finally {
    await browser.close();
  }
};

module.exports = { buildAnalyticsPagePdf };
