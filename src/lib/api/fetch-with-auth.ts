import { signOut } from "next-auth/react";

/**
 * Handle 401 errors by signing out and redirecting to login
 * This is used when the browser has stale session data but the server
 * doesn't recognize the user
 */
export async function handleUnauthorizedResponse() {
  await signOut({ redirect: false });
  window.location.href = "/sign-in";
}

/**
 * Wrapper around fetch that handles 401 errors automatically
 * by signing out and redirecting to login
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, init);

  if (response.status === 401) {
    handleUnauthorizedResponse();
  }

  return response;
}

/**
 * Check if a response is a 401 and handle it
 * Use this for existing fetch calls that you don't want to replace
 */
export function checkAndHandleUnauthorized(response: Response): boolean {
  if (response.status === 401) {
    handleUnauthorizedResponse();
    return true;
  }
  return false;
}
