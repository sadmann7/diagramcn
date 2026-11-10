import { siteConfig } from "@/config/site";
import { getItemHistoryHref } from "@/lib/registry/specifier";
import {
  type ChangeEvent,
  getFollowedSpecifiers,
  getRecentChanges,
} from "@/lib/tracking/changes";
import { isTrackingEnabled } from "@/lib/tracking/track";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getChangeDescription(change: ChangeEvent) {
  const lines = [change.summary];
  for (const file of change.changes.files) {
    lines.push(`${file.status}: ${file.path}`);
  }
  for (const [label, list] of [
    ["dependency", change.changes.dependencies],
    ["registry dependency", change.changes.registryDependencies],
  ] as const) {
    for (const entry of list.added) lines.push(`added ${label}: ${entry}`);
    for (const entry of list.removed) lines.push(`removed ${label}: ${entry}`);
  }
  return lines.join("\n");
}

function renderFeed({
  title,
  description,
  link,
  changes,
}: {
  title: string;
  description: string;
  link: string;
  changes: ChangeEvent[];
}) {
  const items = changes.map((change) => {
    const href = `${siteConfig.url}${getItemHistoryHref(change.specifier)}`;
    return `    <item>
      <title>${escapeXml(`${change.specifier}: ${change.summary}`)}</title>
      <link>${escapeXml(href)}</link>
      <guid isPermaLink="false">${escapeXml(change.snapshotId)}</guid>
      <pubDate>${new Date(change.fetchedAt).toUTCString()}</pubDate>
      <description>${escapeXml(getChangeDescription(change))}</description>
    </item>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${escapeXml(link)}</link>
    <description>${escapeXml(description)}</description>
${items.join("\n")}
  </channel>
</rss>
`;
}

/**
 * RSS for registry item changes. `?namespace=@acme` follows a registry,
 * `?q=` follows items (a stack), including everything they depend on.
 */
export async function GET(req: Request) {
  if (!isTrackingEnabled) {
    return new Response("Change tracking isn't enabled", { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const namespace = searchParams.get("namespace")?.trim() || undefined;
  const query = searchParams.get("q")?.trim();

  let title = "diagramcn: shadcn registry changes";
  let description = "Changes to tracked shadcn registry items.";
  let link = `${siteConfig.url}/changes`;
  let specifiers: string[] | undefined;

  if (query) {
    const followed = await getFollowedSpecifiers(query);
    if (!followed) {
      return new Response("No registry items found in the query", {
        status: 400,
      });
    }
    specifiers = followed.specifiers;
    title = `diagramcn: changes to ${followed.roots.join(", ")}`;
    description = `Changes to ${followed.roots.join(", ")} and the ${specifiers.length - followed.roots.length} items they depend on.`;
    link = `${siteConfig.url}/changes?q=${encodeURIComponent(followed.roots.join(" "))}`;
  } else if (namespace) {
    title = `diagramcn: ${namespace} changes`;
    description = `Changes to tracked ${namespace} registry items.`;
    link = `${siteConfig.url}/changes?namespace=${encodeURIComponent(namespace)}`;
  }

  const changes = await getRecentChanges({ namespace, specifiers });

  return new Response(
    renderFeed({ title, description, link, changes: changes ?? [] }),
    {
      headers: {
        "content-type": "application/rss+xml; charset=utf-8",
        "cache-control": "public, s-maxage=900, stale-while-revalidate=3600",
      },
    },
  );
}
