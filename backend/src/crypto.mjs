export async function hmacSha256Hex(secret, value) {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("HMAC secret is not configured or is too short.");
  }
  if (typeof value !== "string" || !value) {
    throw new Error("HMAC input is required.");
  }

  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await globalThis.crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );

  return Array.from(
    new Uint8Array(signature),
    (byte) => byte.toString(16).padStart(2, "0")
  ).join("");
}
