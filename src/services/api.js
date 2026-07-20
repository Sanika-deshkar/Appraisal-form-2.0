import axios from "axios";
// Default API URL fallback. For production or custom configurations, specify VITE_API_BASE_URL in your .env file.
const DEFAULT_API_BASE_URL = "/api/v1";

let baseRawUrl = (
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/$/, "");

if (baseRawUrl.startsWith("/") && typeof window !== "undefined" && window.location) {
  const { hostname, port, protocol } = window.location;
  if (port === "3000" || port === "5173" || port === "5174") {
    baseRawUrl = `${protocol}//${hostname}:8000${baseRawUrl}`;
  }
}

const rawBaseUrl = baseRawUrl;

const isHttpsFrontend =
  typeof window !== "undefined" &&
  window.location &&
  window.location.protocol === "https:";

// Force HTTPS for non-localhost/non-loopback URLs if the frontend is HTTPS to prevent mixed-content blocks.
export const API_BASE_URL =
  isHttpsFrontend && /^http:\/\/(?!(localhost|127\.0\.0\.1))/.test(rawBaseUrl)
    ? rawBaseUrl.replace(/^http:\/\//, "https://")
    : rawBaseUrl;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  const token =
    sessionStorage.getItem("accessToken") || sessionStorage.getItem("token");

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

const isAuthFormRequest = (url = "") =>
  ["/auth/login", "/auth/forgot-password", "/auth/reset-password"].some((path) =>
    String(url).includes(path),
  );

export const getFileUrl = (url) => {
  if (!url) return "";
  const cleanUrl = String(url).replace(/["']/g, "").trim();

  if (
    cleanUrl.startsWith("http://") ||
    cleanUrl.startsWith("https://") ||
    cleanUrl.startsWith("blob:") ||
    cleanUrl.startsWith("data:")
  ) {
    return cleanUrl;
  }

  try {
    const baseForURL = API_BASE_URL.startsWith("http")
      ? API_BASE_URL
      : typeof window !== "undefined" && window.location
        ? window.location.origin + API_BASE_URL
        : API_BASE_URL;
    const origin = new URL(baseForURL).origin;
    return cleanUrl.startsWith("/") ? `${origin}${cleanUrl}` : `${origin}/${cleanUrl}`;
  } catch {
    return cleanUrl;
  }
};

export const resolveRelativeUrls = (data) => {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.map(resolveRelativeUrls);
  }
  if (typeof data === "object") {
    const resolved = {};
    for (const [key, value] of Object.entries(data)) {
      if (
        typeof value === "string" &&
        ["url", "file_url", "fileUrl", "avatar_url", "avatarUrl"].includes(key)
      ) {
        resolved[key] = getFileUrl(value);
      } else if (typeof value === "object" && value !== null) {
        resolved[key] = resolveRelativeUrls(value);
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  }
  return data;
};

// Normalize every API error so err.message is always a user-safe string.
// Backend detail fields are developer-facing; show user_message when present.
// 401 clears the session and redirects to /login automatically, except while
// the user is already using an auth form.
apiClient.interceptors.response.use(
  (response) => {
    if (response.data) {
      response.data = resolveRelativeUrls(response.data);
    }
    return response;
  },
  (error) => {
    const data = error?.response?.data;
    const status = error?.response?.status;

    const userMessage =
      data?.user_message ??
      (status === 401
        ? "Invalid email or password."
        : status === 403
          ? "Your account is not verified or not authorized."
          : "Something went wrong. Please try again.");

    error.message = userMessage;
    error.userMessage = userMessage;
    error.statusCode = status;

    if (status === 401 && !isAuthFormRequest(error?.config?.url)) {
      sessionStorage.clear();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  },
);

export const api = {
  get: (url, config) =>
    apiClient.get(url, config).then((response) => response.data),
  post: (url, data, config) =>
    apiClient.post(url, data, config).then((response) => response.data),
  put: (url, data, config) =>
    apiClient.put(url, data, config).then((response) => response.data),
  delete: (url, config) =>
    apiClient.delete(url, config).then((response) => response.data),
  getFileUrl,
};

// Returns an AbortController whose signal can be passed as { signal } in axios config.
// Call controller.abort() in the useEffect cleanup to cancel in-flight requests.
export const makeAbortController = () => new AbortController();

export const createFormData = (fields = {}, file) => {
  const formData = new FormData();

  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, value);
    }
  });

  if (file) {
    formData.append("file", file);
  }

  return formData;
};

export const fetchFormData = async () => {
  return JSON.parse(sessionStorage.getItem("formData")) || {};
};

export const saveFormData = async (data) => {
  sessionStorage.setItem("formData", JSON.stringify(data));
};
