import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

const MAX_REDIRECTS = 3;
const MAX_RESPONSE_BYTES = 1024 * 1024;
const TIMEOUT_MS = 10_000;

const privateAddresses = new BlockList();

for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  privateAddresses.addSubnet(network, prefix, "ipv4");
}

for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  privateAddresses.addSubnet(network, prefix, "ipv6");
}

export class RegistryFetchError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function assertPublicUrl(url: URL) {
  if (url.protocol !== "https:") {
    throw new RegistryFetchError("Registry URLs must use https", 400);
  }

  if (url.username || url.password) {
    throw new RegistryFetchError(
      "Registry URLs can't include credentials",
      400,
    );
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  let addresses: { address: string; family: number }[];

  if (isIP(hostname)) {
    addresses = [{ address: hostname, family: isIP(hostname) }];
  } else {
    try {
      addresses = await lookup(hostname, { all: true });
    } catch {
      throw new RegistryFetchError(`Couldn't resolve ${hostname}`, 400);
    }
  }

  for (const { address, family } of addresses) {
    if (privateAddresses.check(address, family === 6 ? "ipv6" : "ipv4")) {
      throw new RegistryFetchError(
        "Registry URLs must point to a public address",
        400,
      );
    }
  }
}

async function readText(response: Response) {
  const length = Number(response.headers.get("content-length"));
  if (length > MAX_RESPONSE_BYTES) {
    throw new RegistryFetchError("Registry response is too large", 502);
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    size += value.byteLength;
    if (size > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new RegistryFetchError("Registry response is too large", 502);
    }
    chunks.push(value);
  }

  return new TextDecoder().decode(Buffer.concat(chunks));
}

export async function fetchRegistryJson(input: string): Promise<unknown> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new RegistryFetchError("Please provide a valid URL", 400);
  }

  for (let redirects = 0; ; redirects++) {
    await assertPublicUrl(url);

    let response: Response;
    try {
      response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new RegistryFetchError("Registry didn't respond", 504);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirects >= MAX_REDIRECTS) {
        throw new RegistryFetchError("Registry redirected too many times", 502);
      }
      url = new URL(location, url);
      continue;
    }

    if (!response.ok) {
      throw new RegistryFetchError(
        `Failed to fetch from registry: ${response.statusText}`,
        response.status,
      );
    }

    try {
      return JSON.parse(await readText(response));
    } catch (error) {
      if (error instanceof RegistryFetchError) throw error;
      throw new RegistryFetchError("Registry response isn't valid JSON", 502);
    }
  }
}
