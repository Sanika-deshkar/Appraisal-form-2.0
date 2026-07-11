// Extracts a user-safe error message from an Axios error.
//
// The response interceptor in api.js already sets err.message = user_message,
// so most catch blocks only need:
//   catch (err) { showError(err.message) }
//
// Use extractError() when you need field-level errors (feedback form) or
// want to distinguish network failures from API errors explicitly.

const FALLBACK = "Something went wrong. Please try again.";

/**
 * Returns the user-facing message from an API error.
 * Handles all shapes the backend can return:
 *   { user_message, detail }          - standard API error
 *   { success: false, errors: {...} } - feedback form field errors
 *   network / timeout errors          - no response object
 */
export function extractError(err) {
  if (!err) return FALLBACK;

  // Already normalized by the response interceptor
  if (err.userMessage) return err.userMessage;

  const data = err?.response?.data;
  if (!data) {
    // Network failure, CORS block, or timeout - no response from server
    if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
      return "The request timed out. Please check your connection and try again.";
    }
    if (!window.navigator.onLine) {
      return "You appear to be offline. Please check your internet connection.";
    }
    return FALLBACK;
  }

  if (data.user_message) return data.user_message;
  if (typeof data.detail === "string") return data.detail;
  return FALLBACK;
}

/**
 * For the feedback form endpoint only.
 * Returns field-level errors when the backend returns:
 *   { success: false, errors: { email: "...", subject: "..." } }
 * Returns null if the response is a standard API error (use extractError instead).
 */
export function extractFieldErrors(err) {
  const data = err?.response?.data;
  if (data?.success === false && data?.errors && typeof data.errors === "object") {
    return data.errors;
  }
  return null;
}

/**
 * Returns true when the error is a 403 with a "submissions closed" message.
 * Useful to show a specific UI state instead of a generic toast.
 */
export function isSubmissionsClosed(err) {
  return (
    err?.statusCode === 403 &&
    String(err?.userMessage || err?.message || "").toLowerCase().includes("closed")
  );
}

/**
 * Returns true when the error is a 422 validation error.
 * Useful for differentiating "backend rejected your data" from "server crashed".
 */
export function isValidationError(err) {
  return err?.statusCode === 422 || err?.response?.status === 422;
}
