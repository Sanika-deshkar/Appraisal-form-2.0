import axios from "axios";

const rawBaseUrl = String(import.meta.env.VITE_API_BASE_URL || "")
  .trim()
  .replace(/\/$/, "");

// Force https for non-localhost URLs to prevent mixed-content blocks
export const API_BASE_URL = rawBaseUrl
  ? /^http:\/\/(?!localhost)/.test(rawBaseUrl)
    ? rawBaseUrl.replace(/^http:\/\//, "https://")
    : rawBaseUrl
  : "";

export const apiClient = axios.create({
  baseURL: API_BASE_URL || undefined,
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

// Normalize every API error so err.message is always a user-safe string.
// Backend detail fields are developer-facing; show user_message when present.
// 401 clears the session and redirects to /login automatically, except while
// the user is already using an auth form.
apiClient.interceptors.response.use(
  (response) => response,
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

const FACULTY_APPRAISAL_STORAGE_PREFIX = "facultyAppraisal";
const getFacultyStorageKey = (key) => `${FACULTY_APPRAISAL_STORAGE_PREFIX}:${key}`;

export const fetchFormData = async () => {
  return JSON.parse(sessionStorage.getItem(getFacultyStorageKey("formData"))) || {};
};

export const saveFormData = async (data) => {
  sessionStorage.setItem(getFacultyStorageKey("formData"), JSON.stringify(data));
};
