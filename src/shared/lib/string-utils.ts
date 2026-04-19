/**
 * String Utility Functions
 *
 * Centralized string manipulation utilities.
 */

/**
 * Capitalizes the first letter of each word in a string
 * Example: "banco do brasil" -> "Banco Do Brasil"
 */
export function capitalizeWords(str: string): string {
  if (!str) return str;
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Capitalizes only the first letter of a string
 * Example: "banco do brasil" -> "Banco do brasil"
 */
export function capitalizeFirst(str: string | undefined): string | undefined {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Extracts and capitalizes the first name from a full name.
 * Returns null when the input is empty/whitespace — callers should treat
 * the absence of a name as "skip greeting" rather than substituting a default.
 * Example: "joão da silva" -> "João"
 */
export function getFirstName(
  fullName: string | null | undefined
): string | null {
  if (!fullName) return null;
  const trimmed = fullName.trim();
  if (!trimmed) return null;
  const first = trimmed.split(/\s+/)[0];
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

/**
 * Truncate text with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

/**
 * Convert string to URL-friendly slug
 * Example: "Hello World!" -> "hello-world"
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^\w\s-]/g, "") // Remove non-word chars
    .replace(/[\s_-]+/g, "-") // Replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}
