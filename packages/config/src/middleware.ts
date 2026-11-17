import type { NonceRecoveryOptions } from "./types";
import { getCandidateNonces, updateNonce } from "./index";

function readNonceHeader(headers: Record<string, any>): string {
  if (!headers) return "";
  if (typeof headers.get === "function") {
    return headers.get("X-WP-Nonce") || headers.get("x-wp-nonce") || "";
  }
  for (const key of Object.keys(headers)) {
    if (
      key.toLowerCase() === "x-wp-nonce" &&
      typeof headers[key] === "string"
    ) {
      return headers[key];
    }
  }
  return "";
}

function writeNonceHeader(
  headers: Record<string, any>,
  freshNonce: string,
): void {
  if (typeof headers.set === "function") {
    headers.set("X-WP-Nonce", freshNonce);
    return;
  }
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === "x-wp-nonce") {
      delete headers[key];
    }
  }
  headers["X-WP-Nonce"] = freshNonce;
}

export function createNonceRecoveryMiddleware(
  options: NonceRecoveryOptions = {},
): (
  requestOptions: Record<string, any>,
  next: (requestOptions: Record<string, any>) => Promise<any>,
) => Promise<any> {
  const { module, getCurrentNonce, refreshNonce, onRefresh } = options;

  return async (
    requestOptions: Record<string, any>,
    next: (requestOptions: Record<string, any>) => Promise<any>,
  ) => {
    try {
      return await next(requestOptions);
    } catch (error: any) {
      const isNonceError =
        error &&
        (error.code === "rest_cookie_invalid_nonce" ||
          (error.status === 403 &&
            typeof error.message === "string" &&
            error.message.includes("Cookie check failed")));

      if (isNonceError && !requestOptions._nonceRetry) {
        const headers = requestOptions.headers || {};
        const headerNonce = readNonceHeader(headers);
        const currentNonce =
          headerNonce ||
          (typeof getCurrentNonce === "function"
            ? getCurrentNonce() || ""
            : "");

        // Find the first candidate nonce that differs from the nonce that just failed
        const candidates = getCandidateNonces(module);
        let freshNonce = candidates.find((n) => n !== currentNonce) || "";

        // If no passive candidate differs from currentNonce, invoke active refreshNonce if provided
        if (!freshNonce && typeof refreshNonce === "function") {
          try {
            const activelyRefreshed = await refreshNonce();
            if (activelyRefreshed) {
              freshNonce = activelyRefreshed;
            }
          } catch {
            // Ignore active refresh failure and fall through
          }
        }

        if (freshNonce && freshNonce !== currentNonce) {
          requestOptions._nonceRetry = true;

          writeNonceHeader(headers, freshNonce);
          requestOptions.headers = headers;

          updateNonce(freshNonce, module);
          if (typeof onRefresh === "function") {
            onRefresh(freshNonce);
          }

          return await next(requestOptions);
        }
      }

      throw error;
    }
  };
}
