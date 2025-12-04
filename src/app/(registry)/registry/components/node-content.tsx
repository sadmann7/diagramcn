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

function renderLink(text: string) {
  function addMarkup(word: string) {
    return getIsURL(word)
      ? `<a onclick="event.stopPropagation()" href="${word}" style="text-decoration: underline; pointer-events: all;" target="_blank" rel="noopener noreferrer">${word}</a>`
      : word;
  }

  const words = text.split(" ");
  const formatedWords = words.map((w) => addMarkup(w));
  const html = formatedWords.join(" ");

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
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
