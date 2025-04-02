import * as React from "react";

function isURL(word: string) {
  const urlPattern =
    /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/gm;

  return word.match(urlPattern);
}

function isColorFormat(colorString: string) {
  const hexCodeRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  const rgbRegex = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/;
  const rgbaRegex =
    /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(0|1|0\.\d+)\s*\)$/;

  return (
    hexCodeRegex.test(colorString) ||
    rgbRegex.test(colorString) ||
    rgbaRegex.test(colorString)
  );
}

function renderLink(text: string) {
  const addMarkup = (word: string) => {
    return isURL(word)
      ? `<a onclick="event.stopPropagation()" href="${word}" style="text-decoration: underline; pointer-events: all;" target="_blank" rel="noopener noreferrer">${word}</a>`
      : word;
  };

  const words = text.split(" ");
  const formatedWords = words.map((w) => addMarkup(w));
  const html = formatedWords.join(" ");
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

interface TextRendererProps {
  children: string;
}

export function TextRenderer({ children }: TextRendererProps) {
  const text = children?.replaceAll('"', "");

  if (isURL(text)) return renderLink(text);

  if (isColorFormat(text)) {
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
