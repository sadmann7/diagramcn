import * as React from "react";

function getIsURL(word: string) {
  const URL_REGEX =
    /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([-.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/gm;

  return URL_REGEX.test(word);
}

function getIsColorFormat(colorString: string) {
  const HEX_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  const RGB_REGEX = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/;
  const RGBA_REGEX =
    /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(0|1|0\.\d+)\s*\)$/;

  return (
    HEX_REGEX.test(colorString) ||
    RGB_REGEX.test(colorString) ||
    RGBA_REGEX.test(colorString)
  );
}

function getHref(word: string) {
  try {
    const url = new URL(/^https?:\/\//i.test(word) ? word : `https://${word}`);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function renderLink(text: string) {
  return (
    <span>
      {text.split(" ").map((word, index) => {
        const href = getIsURL(word) ? getHref(word) : null;

        return (
          <React.Fragment key={index}>
            {index > 0 && " "}
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                style={{ pointerEvents: "all" }}
                onClick={(event) => event.stopPropagation()}
              >
                {word}
              </a>
            ) : (
              word
            )}
          </React.Fragment>
        );
      })}
    </span>
  );
}

interface NodeContentImplProps {
  children: string;
}

function NodeContentImpl({ children }: NodeContentImplProps) {
  const text = children?.replaceAll('"', "");

  if (getIsURL(text)) return renderLink(text);

  if (getIsColorFormat(text)) {
    return (
      <div className="inline-flex items-center gap-2 overflow-hidden align-middle">
        <div
          className="size-4 rounded-full"
          style={{ backgroundColor: text }}
        />
        {text}
      </div>
    );
  }

  return <>{children}</>;
}

export const NodeContent = React.memo(NodeContentImpl);
