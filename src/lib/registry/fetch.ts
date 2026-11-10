import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_REDIRECTS = 3;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const REVALIDATE_SECONDS = 300;

export class RegistryFetchError extends Error {
  status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "RegistryFetchError";
    this.status = status;
  }
}

function getIsPrivateIPv4(address: string) {
  const [a = 0, b = 0] = address.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function getIsPrivateAddress(address: string) {
  if (isIP(address) === 4) return getIsPrivateIPv4(address);

  const normalized = address.toLowerCase();
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) return getIsPrivateIPv4(mapped[1]);

  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80") ||
    normalized.startsWith("ff")
  );
}

async function assertPublicUrl(url: URL) {
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new RegistryFetchError(`Unsupported protocol: ${url.protocol}`);
  }
  if (url.username || url.password) {
    throw new RegistryFetchError("URLs with credentials are not allowed");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new RegistryFetchError("Local addresses are not allowed");
  }

  const addresses = isIP(hostname)
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true }).catch(() => {
        throw new RegistryFetchError(`Could not resolve host ${hostname}`);
      });

  if (addresses.some(({ address }) => getIsPrivateAddress(address))) {
    throw new RegistryFetchError("Private network addresses are not allowed");
  }
}

async function readBody(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return "";

  const decoder = new TextDecoder();
  let size = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new RegistryFetchError("Response is larger than 5MB");
    }
    text += decoder.decode(value, { stream: true });
  }

  return text + decoder.decode();
}

/**
 * Fetches JSON from a public URL. Blocks private networks, follows a limited
 * number of redirects (re-validating each hop), and caps time and size.
 */
export async function fetchPublicJson(input: string): Promise<unknown> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new RegistryFetchError(`Invalid URL: ${input}`);
  }

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    await assertPublicUrl(url);

    const response = await fetch(url, {
      redirect: "manual",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS },
    }).catch((error: unknown) => {
      const reason = error instanceof Error ? error.message : "network error";
      throw new RegistryFetchError(`Request failed: ${reason}`);
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new RegistryFetchError("Redirect without location");
      }
      url = new URL(location, url);
      continue;
    }

    if (!response.ok) {
      throw new RegistryFetchError(
        `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`,
        response.status,
      );
    }

    const text = await readBody(response);
    try {
      return JSON.parse(text);
    } catch {
      throw new RegistryFetchError("Response is not valid JSON");
    }
  }

  throw new RegistryFetchError("Too many redirects");
}
