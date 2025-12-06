import { signOut } from "next-auth/react";

type FetcherParams = string | [string, string];
type FetcherError = {
  message: string;
  error: Error;
  status?: number;
};

// Handle 401 errors by signing out and redirecting to login
async function handleUnauthorized() {
  await signOut({ redirect: false });
  window.location.href = "/sign-in";
}

export const fetcher = <T>(
  params: FetcherParams,
  ...args: RequestInit[]
): Promise<T> => {
  let url: string;
  let queryString: string | undefined;
  if (typeof params === "string") {
    url = params;
  } else {
    url = params[0];
    queryString = params[1] || undefined;
  }

  return new Promise<T>(async (resolve, reject) => {
    const response = await fetch(
      `${url}${queryString ? "?" + queryString : ""}`,
      ...args
    ).catch((error: Error) => {
      reject({
        message: error?.message,
        error: error,
      } as FetcherError);
      return null;
    });

    if (!response) {
      return;
    }

    // Handle 401 - session expired or invalid
    if (response.status === 401) {
      handleUnauthorized();
      reject({
        message: "Session expired",
        error: new Error("Unauthorized"),
        status: 401,
      } as FetcherError);
      return;
    }

    if (response.ok) {
      const data = await response.json();
      resolve(data as T);
      return;
    }

    const errorResponse = await response.text();
    reject(errorResponse);
  });
};
