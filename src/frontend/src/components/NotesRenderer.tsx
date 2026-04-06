import {
  ChevronLeft,
  ChevronRight,
  Expand,
  Minus,
  Plus,
  Shrink,
} from "lucide-react";
import React from "react";

// ─── KaTeX CDN Loader ─────────────────────────────────────────────────────────
function getKatex(): {
  renderToString: (
    latex: string,
    opts: { displayMode: boolean; throwOnError: boolean },
  ) => string;
} | null {
  return (window as unknown as Record<string, unknown>).katex as ReturnType<
    typeof getKatex
  >;
}

function ensureKatexLoaded(): Promise<void> {
  if (getKatex()) return Promise.resolve();
  return new Promise((resolve) => {
    if (!document.querySelector('link[href*="katex"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href =
        "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

// ─── LaTeX Renderer ───────────────────────────────────────────────────────────
function renderLatex(text: string): React.ReactNode[] {
  const katex = getKatex();
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const displayStart = remaining.indexOf("$$");
    if (displayStart !== -1) {
      const displayEnd = remaining.indexOf("$$", displayStart + 2);
      if (displayEnd !== -1) {
        if (displayStart > 0) {
          parts.push(
            <LatexInlineText
              key={key++}
              text={remaining.slice(0, displayStart)}
            />,
          );
        }
        const latex = remaining.slice(displayStart + 2, displayEnd);
        try {
          if (katex) {
            const html = katex.renderToString(latex, {
              displayMode: true,
              throwOnError: false,
            });
            parts.push(
              <span
                key={key++}
                className="block my-2 overflow-x-auto"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: katex output
                dangerouslySetInnerHTML={{ __html: html }}
              />,
            );
          } else {
            parts.push(
              <code
                key={key++}
                className="text-xs text-blue-600 font-mono"
              >{`$$${latex}$$`}</code>,
            );
          }
        } catch {
          parts.push(
            <code
              key={key++}
              className="text-xs text-red-500"
            >{`$$${latex}$$`}</code>,
          );
        }
        remaining = remaining.slice(displayEnd + 2);
        continue;
      }
    }

    const inlineStart = remaining.indexOf("$");
    if (inlineStart !== -1) {
      const inlineEnd = remaining.indexOf("$", inlineStart + 1);
      if (inlineEnd !== -1) {
        if (inlineStart > 0) {
          parts.push(
            <LatexInlineText
              key={key++}
              text={remaining.slice(0, inlineStart)}
            />,
          );
        }
        const latex = remaining.slice(inlineStart + 1, inlineEnd);
        try {
          if (katex) {
            const html = katex.renderToString(latex, {
              displayMode: false,
              throwOnError: false,
            });
            parts.push(
              <span
                key={key++}
                className="inline mx-0.5 align-middle"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: katex output
                dangerouslySetInnerHTML={{ __html: html }}
              />,
            );
          } else {
            parts.push(
              <code
                key={key++}
                className="text-xs text-blue-600 font-mono"
              >{`$${latex}$`}</code>,
            );
          }
        } catch {
          parts.push(
            <code
              key={key++}
              className="text-xs text-red-500"
            >{`$${latex}$`}</code>,
          );
        }
        remaining = remaining.slice(inlineEnd + 1);
        continue;
      }
    }
    parts.push(<LatexInlineText key={key++} text={remaining} />);
    break;
  }
  return parts;
}

function LatexInlineText({ text }: { text: string }) {
  return <>{parseInlineFormatting(text)}</>;
}

// ─── Inline Formatting Parser ──────────────────────────────────────────────────
function parseInlineFormatting(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let buf = "";
  const flush = () => {
    if (buf) {
      nodes.push(buf);
      buf = "";
    }
  };

  while (i < text.length) {
    if (text[i] === "*" && text.indexOf("*", i + 1) !== -1) {
      const end = text.indexOf("*", i + 1);
      flush();
      nodes.push(
        <strong key={i} className="font-bold">
          {text.slice(i + 1, end)}
        </strong>,
      );
      i = end + 1;
      continue;
    }
    if (text[i] === "_" && text.indexOf("_", i + 1) !== -1) {
      const end = text.indexOf("_", i + 1);
      flush();
      nodes.push(
        <em key={i} className="italic">
          {text.slice(i + 1, end)}
        </em>,
      );
      i = end + 1;
      continue;
    }
    if (text[i] === "~" && text.indexOf("~", i + 1) !== -1) {
      const end = text.indexOf("~", i + 1);
      flush();
      nodes.push(
        <u key={i} className="underline">
          {text.slice(i + 1, end)}
        </u>,
      );
      i = end + 1;
      continue;
    }
    if (text.startsWith("{color:", i)) {
      const colorEnd = text.indexOf("}", i);
      const closeTag = text.indexOf("{/color}", i);
      if (colorEnd !== -1 && closeTag !== -1) {
        const color = text.slice(i + 7, colorEnd);
        const content = text.slice(colorEnd + 1, closeTag);
        flush();
        nodes.push(
          <span key={i} style={{ color }}>
            {content}
          </span>,
        );
        i = closeTag + 8;
        continue;
      }
    }
    if (text.startsWith("{bg:", i)) {
      const bgEnd = text.indexOf("}", i);
      const closeTag = text.indexOf("{/bg}", i);
      if (bgEnd !== -1 && closeTag !== -1) {
        const bg = text.slice(i + 4, bgEnd);
        const content = text.slice(bgEnd + 1, closeTag);
        flush();
        nodes.push(
          <span
            key={i}
            style={{ backgroundColor: bg, padding: "1px 4px", borderRadius: 3 }}
          >
            {content}
          </span>,
        );
        i = closeTag + 5;
        continue;
      }
    }
    buf += text[i];
    i++;
  }
  flush();
  return nodes;
}

function InlineText({ text }: { text: string }) {
  if (text.includes("$")) return <>{renderLatex(text)}</>;
  return <>{parseInlineFormatting(text)}</>;
}

function parseList(content: string) {
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.filter((l) => l.startsWith("-")).map((l) => l.slice(1).trim());
}

function parseTable(content: string) {
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  let headers: string[] = [];
  const rows: { isHeader: boolean; cells: string[] }[] = [];
  for (const line of lines) {
    if (line.startsWith("COLUMN_HEADERS:")) {
      headers = line
        .slice(15)
        .trim()
        .split("|")
        .map((h) => h.trim())
        .filter(Boolean);
    } else if (line.startsWith("ROW_HEADER:")) {
      rows.push({
        isHeader: true,
        cells: line
          .slice(11)
          .trim()
          .split("|")
          .map((c) => c.trim()),
      });
    } else if (line.startsWith("ROW:")) {
      rows.push({
        isHeader: false,
        cells: line
          .slice(4)
          .trim()
          .split("|")
          .map((c) => c.trim()),
      });
    }
  }
  return { headers, rows };
}

function parseCompare(content: string) {
  const lines = content.split("\n").map((l) => l.trim());
  const left: {
    image?: string;
    caption?: string;
    title?: string;
    text?: string;
  } = {};
  const right: {
    image?: string;
    caption?: string;
    title?: string;
    text?: string;
  } = {};

  const isFlatFormat = lines.some(
    (l) =>
      l.startsWith("LEFT_TITLE:") ||
      l.startsWith("LEFT_IMAGE:") ||
      l.startsWith("LEFT_TEXT:") ||
      l.startsWith("RIGHT_TITLE:") ||
      l.startsWith("RIGHT_IMAGE:") ||
      l.startsWith("RIGHT_TEXT:"),
  );

  if (isFlatFormat) {
    for (const line of lines) {
      if (!line) continue;
      if (line.startsWith("LEFT_TITLE:")) left.title = line.slice(11).trim();
      else if (line.startsWith("LEFT_IMAGE:"))
        left.image = line.slice(11).trim();
      else if (line.startsWith("LEFT_TEXT:")) left.text = line.slice(10).trim();
      else if (line.startsWith("RIGHT_TITLE:"))
        right.title = line.slice(12).trim();
      else if (line.startsWith("RIGHT_IMAGE:"))
        right.image = line.slice(12).trim();
      else if (line.startsWith("RIGHT_TEXT:"))
        right.text = line.slice(11).trim();
    }
  } else {
    let side: "left" | "right" | null = null;
    for (const line of lines) {
      if (line === "LEFT:") {
        side = "left";
        continue;
      }
      if (line === "RIGHT:") {
        side = "right";
        continue;
      }
      if (!side) continue;
      const target = side === "left" ? left : right;
      if (line.startsWith("image:")) target.image = line.slice(6).trim();
      else if (line.startsWith("caption:"))
        target.caption = line.slice(8).trim();
      else if (line.startsWith("title:")) target.title = line.slice(6).trim();
      else if (line.startsWith("text:")) target.text = line.slice(5).trim();
    }
  }
  return { left, right };
}

function parseCompareList(content: string) {
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  let leftTitle = "";
  let rightTitle = "";
  const points: { label?: string; left: string; right: string }[] = [];
  let currentPoint: { label?: string; left: string; right: string } | null =
    null;

  for (const line of lines) {
    if (line.startsWith("LEFT_TITLE:")) {
      leftTitle = line.slice(11).trim();
      continue;
    }
    if (line.startsWith("RIGHT_TITLE:")) {
      rightTitle = line.slice(12).trim();
      continue;
    }
    if (line.startsWith("POINT:")) {
      if (currentPoint) points.push(currentPoint);
      currentPoint = {
        label: line.slice(6).trim() || undefined,
        left: "",
        right: "",
      };
    } else if (line.startsWith("LEFT:") && currentPoint) {
      currentPoint.left = line.slice(5).trim();
    } else if (line.startsWith("RIGHT:") && currentPoint) {
      currentPoint.right = line.slice(6).trim();
    }
  }
  if (currentPoint) points.push(currentPoint);
  return { leftTitle, rightTitle, points };
}

function parseImageTag(tagHeader: string, content: string) {
  const parts = tagHeader.split(":");
  const direction = parts[0];
  const type = parts[1];
  const url = parts.slice(2).join(":");
  const lines = content.split("\n").map((l) => l.trim());
  let caption = "";
  let paragraph = "";
  const listItems: string[] = [];
  for (const line of lines) {
    if (line.startsWith("caption:")) caption = line.slice(8).trim();
    else if (line.startsWith("-")) listItems.push(line.slice(1).trim());
    else if (line) paragraph += (paragraph ? " " : "") + line;
  }
  return { direction, type, url, caption, paragraph, listItems };
}

// ─── Block Types ──────────────────────────────────────────────────────────────
type Block =
  | { type: "title"; text: string }
  | { type: "text"; text: string }
  | { type: "list"; items: string[] }
  | { type: "text_left"; text: string }
  | { type: "text_right"; text: string }
  | {
      type: "image";
      direction: string;
      imgType: string;
      url: string;
      caption: string;
      paragraph: string;
      listItems: string[];
    }
  | {
      type: "compare";
      left: ReturnType<typeof parseCompare>["left"];
      right: ReturnType<typeof parseCompare>["right"];
    }
  | {
      type: "compare_list";
      leftTitle: string;
      rightTitle: string;
      points: { label?: string; left: string; right: string }[];
    }
  | {
      type: "table";
      headers: string[];
      rows: { isHeader: boolean; cells: string[] }[];
    }
  | { type: "pagebreak" };

// ─── Main Parser ──────────────────────────────────────────────────────────────
function parseTxt(raw: string): Block[] {
  const blocks: Block[] = [];
  const lines = raw.split("\n");
  let i = 0;

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("@title:")) {
      blocks.push({ type: "title", text: t.slice(7).trim() });
      break;
    }
  }

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line === "___") {
      blocks.push({ type: "pagebreak" });
      i++;
      continue;
    }
    if (line.startsWith("@title:")) {
      i++;
      continue;
    }

    if (line === "[TEXT]") {
      i++;
      let content = "";
      while (i < lines.length && lines[i].trim() !== "[/TEXT]") {
        content += `${lines[i]}\n`;
        i++;
      }
      i++;
      blocks.push({ type: "text", text: content.trim() });
      continue;
    }
    if (line === "[TEXT_LEFT]") {
      i++;
      let content = "";
      while (i < lines.length && lines[i].trim() !== "[/TEXT_LEFT]") {
        content += `${lines[i]}\n`;
        i++;
      }
      i++;
      blocks.push({ type: "text_left", text: content.trim() });
      continue;
    }
    if (line === "[TEXT_RIGHT]") {
      i++;
      let content = "";
      while (i < lines.length && lines[i].trim() !== "[/TEXT_RIGHT]") {
        content += `${lines[i]}\n`;
        i++;
      }
      i++;
      blocks.push({ type: "text_right", text: content.trim() });
      continue;
    }
    if (line === "[LIST]") {
      i++;
      let content = "";
      while (i < lines.length && lines[i].trim() !== "[/LIST]") {
        content += `${lines[i]}\n`;
        i++;
      }
      i++;
      blocks.push({ type: "list", items: parseList(content) });
      continue;
    }
    if (line.startsWith("[IMAGE_LEFT:") || line.startsWith("[IMAGE_RIGHT:")) {
      const tagHeader = line.slice(1, line.lastIndexOf("]"));
      const closeTag = line.startsWith("[IMAGE_LEFT:")
        ? "[/IMAGE_LEFT]"
        : "[/IMAGE_RIGHT]";
      i++;
      let content = "";
      while (i < lines.length && lines[i].trim() !== closeTag) {
        content += `${lines[i]}\n`;
        i++;
      }
      i++;
      const parsed = parseImageTag(tagHeader, content);
      blocks.push({
        type: "image",
        direction: parsed.direction,
        imgType: parsed.type,
        url: parsed.url,
        caption: parsed.caption,
        paragraph: parsed.paragraph,
        listItems: parsed.listItems,
      });
      continue;
    }
    if (line === "[COMPARE_LIST]") {
      i++;
      let content = "";
      while (i < lines.length && lines[i].trim() !== "[/COMPARE_LIST]") {
        content += `${lines[i]}\n`;
        i++;
      }
      i++;
      const parsed = parseCompareList(content);
      blocks.push({ type: "compare_list", ...parsed });
      continue;
    }
    if (line === "[COMPARE]") {
      i++;
      let content = "";
      while (i < lines.length && lines[i].trim() !== "[/COMPARE]") {
        content += `${lines[i]}\n`;
        i++;
      }
      i++;
      const parsed = parseCompare(content);
      blocks.push({ type: "compare", left: parsed.left, right: parsed.right });
      continue;
    }
    if (line === "[TABLE]") {
      i++;
      let content = "";
      while (i < lines.length && lines[i].trim() !== "[/TABLE]") {
        content += `${lines[i]}\n`;
        i++;
      }
      i++;
      const parsed = parseTable(content);
      blocks.push({
        type: "table",
        headers: parsed.headers,
        rows: parsed.rows,
      });
      continue;
    }
    i++;
  }
  return blocks;
}

// ─── Block Renderers ──────────────────────────────────────────────────────────
function TextBlock({ text, fontSize }: { text: string; fontSize: number }) {
  return (
    <p className="text-gray-700 leading-relaxed" style={{ fontSize }}>
      <InlineText text={text} />
    </p>
  );
}

function ListBlock({ items, fontSize }: { items: string[]; fontSize: number }) {
  return (
    <ul className="space-y-1.5 pl-2">
      {items.map((item, idx) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: stable list
        <li // biome-ignore lint/suspicious/noArrayIndexKey: stable list
          key={idx}
          className="flex items-start gap-2 text-gray-700"
          style={{ fontSize }}
        >
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
          <span>
            <InlineText text={item} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function ImageBlock({
  direction,
  imgType,
  url,
  caption,
  paragraph,
  listItems,
  fontSize,
}: {
  direction: string;
  imgType: string;
  url: string;
  caption: string;
  paragraph: string;
  listItems: string[];
  fontSize: number;
}) {
  const imageEl = (
    <div className="flex flex-col items-center gap-1.5">
      <img
        src={url}
        alt={caption || "Notes image"}
        className="rounded-xl object-cover w-full max-w-[240px] shadow-sm border border-gray-100"
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
      {caption && (
        <span className="text-xs text-gray-400 italic text-center">
          {caption}
        </span>
      )}
    </div>
  );
  const contentEl = (
    <div className="flex flex-col gap-2 flex-1">
      {(imgType === "PG" || imgType === "MIX") && paragraph && (
        <p className="text-gray-700 leading-relaxed" style={{ fontSize }}>
          <InlineText text={paragraph} />
        </p>
      )}
      {(imgType === "LIST" || imgType === "MIX") && listItems.length > 0 && (
        <ListBlock items={listItems} fontSize={fontSize} />
      )}
    </div>
  );
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start">
      {direction === "IMAGE_LEFT" ? (
        <>
          {imageEl}
          {contentEl}
        </>
      ) : (
        <>
          {contentEl}
          {imageEl}
        </>
      )}
    </div>
  );
}

function CompareBlock({
  left,
  right,
  fontSize,
}: {
  left: { image?: string; caption?: string; title?: string; text?: string };
  right: { image?: string; caption?: string; title?: string; text?: string };
  fontSize: number;
}) {
  const CardSide = ({ side }: { side: typeof left }) => (
    <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col items-center gap-2 min-w-0">
      {side.image && (
        <img
          src={side.image}
          alt={side.caption || side.title || ""}
          className="rounded-xl w-full max-h-28 object-cover"
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      {side.caption && (
        <span className="text-xs text-gray-400 italic">{side.caption}</span>
      )}
      {side.title && (
        <h4
          className="font-semibold text-gray-800 text-center"
          style={{ fontSize }}
        >
          {side.title}
        </h4>
      )}
      {side.text && (
        <p
          className="text-gray-600 text-center leading-relaxed"
          style={{ fontSize: Math.max(fontSize - 2, 11) }}
        >
          <InlineText text={side.text} />
        </p>
      )}
    </div>
  );
  const hasLeft = left.title || left.image || left.text;
  const hasRight = right.title || right.image || right.text;
  if (!hasLeft && !hasRight) {
    return (
      <div className="rounded-2xl border border-yellow-100 bg-yellow-50 p-3 text-xs text-yellow-600 text-center">
        Compare block: no data parsed. Check format uses LEFT_TITLE:,
        LEFT_IMAGE:, LEFT_TEXT:, RIGHT_TITLE:, RIGHT_IMAGE:, RIGHT_TEXT:
      </div>
    );
  }
  return (
    <div className="flex flex-row gap-2">
      <CardSide side={left} />
      <CardSide side={right} />
    </div>
  );
}

function CompareListBlock({
  leftTitle,
  rightTitle,
  points,
  fontSize,
}: {
  leftTitle: string;
  rightTitle: string;
  points: { label?: string; left: string; right: string }[];
  fontSize: number;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
      <table className="w-full" style={{ fontSize }}>
        <thead>
          <tr className="bg-blue-600 text-white">
            {points.some((p) => p.label) && (
              <th className="px-3 py-2.5 text-left font-semibold">Point</th>
            )}
            <th className="px-3 py-2.5 text-left font-semibold">{leftTitle}</th>
            <th className="px-3 py-2.5 text-left font-semibold">
              {rightTitle}
            </th>
          </tr>
        </thead>
        <tbody>
          {points.map((point, idx) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: stable list
            <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-blue-50"}>
              {points.some((p) => p.label) && (
                <td className="px-3 py-2 font-medium text-gray-700">
                  {point.label || ""}
                </td>
              )}
              <td className="px-3 py-2 text-gray-700">
                <InlineText text={point.left} />
              </td>
              <td className="px-3 py-2 text-gray-700">
                <InlineText text={point.right} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableBlock({
  headers,
  rows,
  fontSize,
}: {
  headers: string[];
  rows: { isHeader: boolean; cells: string[] }[];
  fontSize: number;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
      <table className="w-full" style={{ fontSize }}>
        {headers.length > 0 && (
          <thead>
            <tr className="bg-blue-600 text-white">
              {headers.map((h, idx) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: stable list
                <th key={idx} className="px-3 py-2.5 text-left font-semibold">
                  <InlineText text={h} />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, rIdx) => (
            <tr
              // biome-ignore lint/suspicious/noArrayIndexKey: stable list
              key={rIdx}
              className={
                row.isHeader
                  ? "bg-blue-50 font-medium"
                  : rIdx % 2 === 0
                    ? "bg-white"
                    : "bg-gray-50"
              }
            >
              {row.cells.map((cell, cIdx) => (
                <td
                  // biome-ignore lint/suspicious/noArrayIndexKey: stable list
                  key={cIdx}
                  className="px-3 py-2 text-gray-700 border-b border-gray-100"
                >
                  <InlineText text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page Break Splitter ──────────────────────────────────────────────────────
function splitIntoPages(blocks: Block[]): Block[][] {
  const pages: Block[][] = [];
  let current: Block[] = [];
  for (const block of blocks) {
    if (block.type === "pagebreak") {
      pages.push(current);
      current = [];
    } else {
      current.push(block);
    }
  }
  pages.push(current);
  return pages.filter((p) => p.length > 0);
}

// ─── Single Block Renderer ────────────────────────────────────────────────────
function RenderBlock({
  block,
  idx,
  fontSize,
}: { block: Block; idx: number; fontSize: number }) {
  if (block.type === "text")
    return <TextBlock text={block.text} fontSize={fontSize} />;
  if (block.type === "text_left")
    return (
      <div className="text-left">
        <TextBlock text={block.text} fontSize={fontSize} />
      </div>
    );
  if (block.type === "text_right")
    return (
      <div className="text-right">
        <TextBlock text={block.text} fontSize={fontSize} />
      </div>
    );
  if (block.type === "list")
    return <ListBlock items={block.items} fontSize={fontSize} />;
  if (block.type === "image")
    return (
      <ImageBlock
        direction={block.direction}
        imgType={block.imgType}
        url={block.url}
        caption={block.caption}
        paragraph={block.paragraph}
        listItems={block.listItems}
        fontSize={fontSize}
      />
    );
  if (block.type === "compare")
    return (
      <CompareBlock left={block.left} right={block.right} fontSize={fontSize} />
    );
  if (block.type === "compare_list")
    return (
      <CompareListBlock
        leftTitle={block.leftTitle}
        rightTitle={block.rightTitle}
        points={block.points}
        fontSize={fontSize}
      />
    );
  if (block.type === "table")
    return (
      <TableBlock
        headers={block.headers}
        rows={block.rows}
        fontSize={fontSize}
      />
    );
  void idx;
  return null;
}

// ─── Paged Notes Viewer ───────────────────────────────────────────────────────
// Clean version: NO dots, only arrows at bottom, smooth slide transition
function PagedNotesViewer({
  pages,
  fontSize,
  externalPage,
  onPageChange,
}: {
  pages: Block[][];
  fontSize: number;
  externalPage?: number;
  onPageChange?: (page: number) => void;
}) {
  const [internalPage, setInternalPage] = React.useState(0);
  const [animDir, setAnimDir] = React.useState<"left" | "right" | null>(null);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const currentPage = externalPage !== undefined ? externalPage : internalPage;

  const setCurrentPage = React.useCallback(
    (page: number) => {
      if (onPageChange) onPageChange(page);
      else setInternalPage(page);
    },
    [onPageChange],
  );

  const touchStartX = React.useRef<number | null>(null);
  const touchStartY = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (externalPage !== undefined) {
      setInternalPage(externalPage);
    }
  }, [externalPage]);

  const navigate = React.useCallback(
    (dir: "next" | "prev") => {
      if (isAnimating) return;
      const next =
        dir === "next"
          ? Math.min(pages.length - 1, currentPage + 1)
          : Math.max(0, currentPage - 1);
      if (next === currentPage) return;
      setAnimDir(dir === "next" ? "left" : "right");
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentPage(next);
        setAnimDir(null);
        setIsAnimating(false);
      }, 220);
    },
    [isAnimating, currentPage, pages.length, setCurrentPage],
  );

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length > 1) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      navigate(dx < 0 ? "next" : "prev");
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }

  if (pages.length <= 1) {
    return (
      <div className="space-y-5">
        {pages[0]?.map((block, idx) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: stable list
          <RenderBlock key={idx} block={block} idx={idx} fontSize={fontSize} />
        ))}
      </div>
    );
  }

  const slideStyle: React.CSSProperties = {
    transition: "opacity 0.22s ease, transform 0.22s ease",
    opacity: isAnimating ? 0 : 1,
    transform: isAnimating
      ? `translateX(${animDir === "left" ? "-24px" : "24px"})`
      : "translateX(0)",
  };

  return (
    <div>
      {/* Swipeable + animated page content */}
      <div
        style={{ ...slideStyle, touchAction: "pan-y" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="space-y-5">
          {pages[currentPage]?.map((block, idx) => (
            <RenderBlock
              key={String(idx)}
              block={block}
              idx={idx}
              fontSize={fontSize}
            />
          ))}
        </div>
      </div>

      {/* Bottom navigation: prev arrow | counter | next arrow */}
      <div className="flex items-center justify-center gap-3 mt-8">
        <button
          type="button"
          onClick={() => navigate("prev")}
          disabled={currentPage === 0 || isAnimating}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full min-w-[64px] text-center">
          {currentPage + 1} / {pages.length}
        </span>
        <button
          type="button"
          onClick={() => navigate("next")}
          disabled={currentPage === pages.length - 1 || isAnimating}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

// ─── Full Screen Overlay (True immersive — like video player) ─────────────────
function FullScreenViewer({
  content,
  onClose,
}: { content: string; onClose: () => void }) {
  const [fontIdx, setFontIdx] = React.useState(1);
  const fontSize = FONT_SIZES[fontIdx];
  const [katexReady, setKatexReady] = React.useState(!!getKatex());
  const pinchStartDist = React.useRef<number | null>(null);
  const pinchStartIdx = React.useRef<number>(1);

  // Immersive controls visibility
  const [showControls, setShowControls] = React.useState(true);
  const hideTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Page state lifted for Jump-to-Page
  const [currentPage, setCurrentPage] = React.useState(0);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [animDir, setAnimDir] = React.useState<"left" | "right" | null>(null);

  const blocks = parseTxt(content);
  const titleBlock = blocks.find((b) => b.type === "title");
  const contentBlocks = blocks.filter((b) => b.type !== "title");
  const pages = splitIntoPages(contentBlocks);

  // Auto-hide after 2.5s
  const revealControls = React.useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 2500);
  }, []);

  // Enter native fullscreen + hide bottom nav
  React.useEffect(() => {
    const enterFullscreen = async () => {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        // ignore — overlay still works
      }
      try {
        const orientation = (
          screen as unknown as {
            orientation: { lock: (o: string) => Promise<void> };
          }
        ).orientation;
        if (orientation?.lock) await orientation.lock("portrait");
      } catch {
        // ignore
      }
    };
    enterFullscreen();
    document.body.style.overflow = "hidden";

    // Hide bottom nav bar (mobile)
    const bottomNav = document.getElementById("bottom-nav-bar");
    if (bottomNav) bottomNav.style.display = "none";

    hideTimer.current = setTimeout(() => setShowControls(false), 2500);

    return () => {
      try {
        if (document.fullscreenElement) document.exitFullscreen();
      } catch {
        // ignore
      }
      document.body.style.overflow = "";
      // Restore bottom nav bar
      const nav = document.getElementById("bottom-nav-bar");
      if (nav) nav.style.display = "";
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  // Native fullscreen exit (OS back, etc.)
  React.useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement) onClose();
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFsChange);
  }, [onClose]);

  // KaTeX
  React.useEffect(() => {
    if (!getKatex() && content.includes("$")) {
      ensureKatexLoaded().then(() => setKatexReady(true));
    }
  }, [content]);
  void katexReady;

  const handleClose = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      // ignore
    }
    onClose();
  };

  // Smooth page navigation
  const navigate = React.useCallback(
    (dir: "next" | "prev") => {
      if (isAnimating) return;
      const next =
        dir === "next"
          ? Math.min(pages.length - 1, currentPage + 1)
          : Math.max(0, currentPage - 1);
      if (next === currentPage) return;
      setAnimDir(dir === "next" ? "left" : "right");
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentPage(next);
        setAnimDir(null);
        setIsAnimating(false);
      }, 220);
    },
    [isAnimating, currentPage, pages.length],
  );

  // Swipe to change page
  const touchStartX = React.useRef<number | null>(null);
  const touchStartY = React.useRef<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDist.current = Math.sqrt(dx * dx + dy * dy);
      pinchStartIdx.current = fontIdx;
      return;
    }
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchStartDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ratio = dist / pinchStartDist.current;
      let newIdx = pinchStartIdx.current;
      if (ratio > 1.2)
        newIdx = Math.min(
          FONT_SIZES.length - 1,
          pinchStartIdx.current + Math.floor((ratio - 1) / 0.2),
        );
      else if (ratio < 0.8)
        newIdx = Math.max(
          0,
          pinchStartIdx.current - Math.floor((1 - ratio) / 0.2),
        );
      setFontIdx(newIdx);
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (pinchStartDist.current !== null) {
      pinchStartDist.current = null;
      return;
    }
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      navigate(dx < 0 ? "next" : "prev");
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }

  const slideStyle: React.CSSProperties = {
    transition: "opacity 0.22s ease, transform 0.22s ease",
    opacity: isAnimating ? 0 : 1,
    transform: isAnimating
      ? `translateX(${animDir === "left" ? "-24px" : "24px"})`
      : "translateX(0)",
  };

  const controlsStyle = {
    transition: "opacity 0.3s ease",
    opacity: showControls ? 1 : 0,
    pointerEvents: (showControls
      ? "auto"
      : "none") as React.CSSProperties["pointerEvents"],
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-white flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={revealControls}
      onKeyDown={revealControls}
    >
      {/* ── Top bar: auto-hide ── */}
      <div
        className="sticky top-0 z-10 bg-white border-b border-gray-100 px-3 py-2.5 flex items-center gap-2 shrink-0"
        style={controlsStyle}
      >
        {/* Exit fullscreen */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors shrink-0"
          title="Exit full screen"
        >
          <Shrink className="h-5 w-5 text-blue-600" />
        </button>

        {/* Title */}
        {titleBlock && titleBlock.type === "title" ? (
          <h1 className="font-bold text-blue-800 text-sm flex-1 line-clamp-1">
            {titleBlock.text}
          </h1>
        ) : (
          <span className="text-sm font-bold text-gray-900 flex-1">
            Full View
          </span>
        )}

        {/* Jump to Page — only if multiple pages */}
        {pages.length > 1 && (
          <select
            value={currentPage}
            onChange={(e) => {
              e.stopPropagation();
              setCurrentPage(Number(e.target.value));
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="text-xs font-semibold bg-blue-600 text-white rounded-full px-2.5 py-1 border-none outline-none cursor-pointer shrink-0 appearance-none"
            style={{ minWidth: "90px" }}
          >
            {pages.map((_, idx) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: stable page numbers
              <option key={idx} value={idx}>
                Page {idx + 1}
              </option>
            ))}
          </select>
        )}

        {/* Zoom controls */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: stop propagation */}
        <div
          className="flex items-center gap-1 bg-gray-100 rounded-xl px-1.5 py-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            disabled={fontIdx === 0}
            onClick={(e) => {
              e.stopPropagation();
              setFontIdx((i) => Math.max(0, i - 1));
            }}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-blue-600 hover:bg-white disabled:opacity-30 transition-colors"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="text-xs font-semibold text-gray-500 min-w-[1.8rem] text-center">
            {fontSize}px
          </span>
          <button
            type="button"
            disabled={fontIdx === FONT_SIZES.length - 1}
            onClick={(e) => {
              e.stopPropagation();
              setFontIdx((i) => Math.min(FONT_SIZES.length - 1, i + 1));
            }}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-blue-600 hover:bg-white disabled:opacity-30 transition-colors"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* ── Scrollable page content ── */}
      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-24">
        <div style={{ ...slideStyle, touchAction: "pan-y" }}>
          <div className="space-y-5">
            {pages[currentPage]?.map((block, idx) => (
              <RenderBlock
                key={String(idx)}
                block={block}
                idx={idx}
                fontSize={fontSize}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom navigation: arrows + counter, auto-hide ── */}
      {pages.length > 1 && (
        <div
          className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-3 py-4 bg-gradient-to-t from-white/90 to-transparent"
          style={controlsStyle}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => navigate("prev")}
            disabled={currentPage === 0 || isAnimating}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-bold text-blue-700 bg-white/90 px-4 py-1.5 rounded-full shadow-sm min-w-[70px] text-center">
            {currentPage + 1} / {pages.length}
          </span>
          <button
            type="button"
            onClick={() => navigate("next")}
            disabled={currentPage === pages.length - 1 || isAnimating}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
const FONT_SIZES = [12, 14, 16, 18, 20, 22];
const DEFAULT_FONT_IDX = 1; // 14px default

export default function NotesRenderer({ content }: { content: string }) {
  const [katexReady, setKatexReady] = React.useState(!!getKatex());
  const [fontIdx, setFontIdx] = React.useState(DEFAULT_FONT_IDX);
  const [isFullScreen, setIsFullScreen] = React.useState(false);
  const fontSize = FONT_SIZES[fontIdx];

  const pinchStartDist = React.useRef<number | null>(null);
  const pinchStartIdx = React.useRef<number>(DEFAULT_FONT_IDX);

  React.useEffect(() => {
    if (!getKatex() && content.includes("$")) {
      ensureKatexLoaded().then(() => setKatexReady(true));
    }
  }, [content]);
  void katexReady;

  const blocks = parseTxt(content);
  const titleBlock = blocks.find((b) => b.type === "title");
  const contentBlocks = blocks.filter((b) => b.type !== "title");
  const pages = splitIntoPages(contentBlocks);

  function handlePinchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDist.current = Math.sqrt(dx * dx + dy * dy);
      pinchStartIdx.current = fontIdx;
    }
  }

  function handlePinchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchStartDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ratio = dist / pinchStartDist.current;
      let newIdx = pinchStartIdx.current;
      if (ratio > 1.2)
        newIdx = Math.min(
          FONT_SIZES.length - 1,
          pinchStartIdx.current + Math.floor((ratio - 1) / 0.2),
        );
      else if (ratio < 0.8)
        newIdx = Math.max(
          0,
          pinchStartIdx.current - Math.floor((1 - ratio) / 0.2),
        );
      setFontIdx(newIdx);
    }
  }

  function handlePinchEnd() {
    pinchStartDist.current = null;
  }

  return (
    <>
      {isFullScreen && (
        <FullScreenViewer
          content={content}
          onClose={() => setIsFullScreen(false)}
        />
      )}
      <div
        className="notes-renderer"
        onTouchStart={handlePinchStart}
        onTouchMove={handlePinchMove}
        onTouchEnd={handlePinchEnd}
      >
        {/* Title + controls row */}
        <div className="flex items-start justify-between gap-3 mb-6">
          {titleBlock && titleBlock.type === "title" ? (
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-blue-800 leading-tight">
                {titleBlock.text}
              </h1>
              <div className="mt-2 h-0.5 w-16 rounded-full bg-blue-500" />
            </div>
          ) : (
            <div className="flex-1" />
          )}

          {/* Controls: Zoom + Full Size — single row, no duplicates */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Zoom controls */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl px-2 py-1">
              <button
                type="button"
                disabled={fontIdx === 0}
                onClick={() => setFontIdx((i) => Math.max(0, i - 1))}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-600 hover:bg-white disabled:opacity-30 transition-colors"
                title="Zoom out"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="text-xs font-semibold text-gray-500 min-w-[2rem] text-center">
                {fontSize}px
              </span>
              <button
                type="button"
                disabled={fontIdx === FONT_SIZES.length - 1}
                onClick={() =>
                  setFontIdx((i) => Math.min(FONT_SIZES.length - 1, i + 1))
                }
                className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-600 hover:bg-white disabled:opacity-30 transition-colors"
                title="Zoom in"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Full Size button */}
            <button
              type="button"
              onClick={() => setIsFullScreen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
              title="View full screen"
            >
              <Expand className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Paged content */}
        <PagedNotesViewer pages={pages} fontSize={fontSize} />
      </div>
    </>
  );
}
