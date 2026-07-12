import { getToken, setToken, removeToken } from "../utils/auth";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL === "undefined"
    ? ""
    : process.env.NEXT_PUBLIC_API_BASE_URL || "";

if (!BASE_URL && typeof window !== "undefined") {
  console.warn(
    "NEXT_PUBLIC_API_BASE_URL is not defined. API calls may fail or use relative paths.",
  );
}

const apiHandler = async (endpoint, options = {}, isRetry = false) => {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
    credentials: "include",
  };

  try {
    const url = BASE_URL.endsWith("/")
      ? `${BASE_URL}${endpoint.startsWith("/") ? endpoint.slice(1) : endpoint}`
      : `${BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

    let response;
    try {
      response = await fetch(url, config);
    } catch (fetchErr) {
      if (!options.silent) {
        console.error("Network Fetch Error:", fetchErr.message, "URL:", url);
      }
      
      if (url.includes("localhost") || url.includes("127.0.0.1")) {
        throw new Error(
          `Failed to connect to local server at ${url}. Please ensure the backend is running on the correct port.`,
        );
      }
      throw new Error(`Cloud connection failed: ${fetchErr.message}`);
    }

    // If unauthorized and not already retrying, attempt to refresh token
    // EXCEPTION: Don't intercept login failures (401/403) so we can show specific error messages
    const isLoginEndpoint = endpoint.includes("/api/auth/login");

    if (
      (response.status === 401 || response.status === 403) &&
      !isRetry &&
      !isLoginEndpoint
    ) {
      if (isRefreshing) {
        // If already refreshing, return a promise that resolves when refresh is done
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            // Retry with new token
            return apiHandler(endpoint, options, true);
          })
          .catch((err) => {
            throw err;
          });
      }

      isRefreshing = true;

      try {
        console.log("Access token expired, attempting refresh...");
        const refreshSuccess = await attemptRefresh();

        if (refreshSuccess) {
          console.log("Refresh successful, retrying request...");
          processQueue(null, getToken());
          isRefreshing = false;
          // Retry the original request with new token
          return apiHandler(endpoint, options, true);
        } else {
          console.warn("Refresh failed, logging out...");
          processQueue(new Error("Refresh failed"), null);
          isRefreshing = false;
          // Refresh failed, logout user
          logoutUser();
          throw new Error("Session expired. Please login again.");
        }
      } catch (error) {
        processQueue(error, null);
        isRefreshing = false;
        logoutUser();
        throw error;
      }
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Non-JSON response received:", text);
      throw new Error(
        `Server returned non-JSON response (${response.status}). This often happens when a route is missing or the server is down.`,
      );
    }

    const result = await response.json();

    if (result.status !== "success") {
      throw new Error(result.message || "Something went wrong");
    }

    return result;
  } catch (error) {
    throw error;
  }
};

// Queue to hold requests while refreshing
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

const attemptRefresh = async () => {
  try {
    // Note: credentials include sends the refreshToken cookie
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();

    if (data.status === "success" && data.data.token) {
      setToken(data.data.token);
      return true;
    }
    return false;
  } catch (err) {
    return false;
  }
};

const logoutUser = () => {
  removeToken();
  if (typeof window !== "undefined") {
    // Avoid redirect loop if already on login page
    if (window.location.pathname !== "/admin/login") {
      window.location.href = "/admin/login";
    }
  }
};

export default apiHandler;
