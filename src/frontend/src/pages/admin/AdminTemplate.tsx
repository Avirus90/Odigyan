import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Copy, GraduationCap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";
import { useAdminCheck } from "./AdminDashboard";

// ─── Notes Templates ──────────────────────────────────────────────────────

const NOTES_TEMPLATE_SECTIONS = [
  {
    id: "basic",
    label: "Basic Template",
    description: "Title, text, and list — most common format",
    code: `@title: Chapter 1 - Introduction

[TEXT]
Yeh ek sample paragraph hai. *Bold text* aur _italic text_ aur ~underline~ support hota hai.
{color:blue}Blue coloured text{/color} aur {bg:yellow}highlighted text{/bg} bhi kaam karta hai.
[/TEXT]

[LIST]
- Pehla point yahan likho
- Doosra point yahan
- Teesra point
[/LIST]`,
  },
  {
    id: "image",
    label: "Image with Text",
    description: "Image left/right ke saath text layout",
    code: `[IMAGE_LEFT:PG:https://example.com/image.jpg]
caption: Image ka caption yahan
Yeh text image ke right side mein aayega.
[/IMAGE_LEFT]

[IMAGE_RIGHT:LIST:https://example.com/image2.jpg]
caption: Doosri image
- List item 1
- List item 2
- List item 3
[/IMAGE_RIGHT]

[IMAGE_LEFT:MIX:https://example.com/image3.jpg]
Yeh ek paragraph hai jo image ke saath hai.
- Aur yeh ek list item hai
- MIX type mein dono hote hain
[/IMAGE_LEFT]`,
  },
  {
    id: "compare",
    label: "Compare Block",
    description: "Do cheezein side-by-side compare karne ke liye",
    code: `[COMPARE]
LEFT_TITLE: Pehli Cheez
LEFT_IMAGE: https://example.com/left.jpg
LEFT_TEXT: Pehli cheez ka description yahan likhein.

RIGHT_TITLE: Doosri Cheez
RIGHT_IMAGE: https://example.com/right.jpg
RIGHT_TEXT: Doosri cheez ka description yahan likhein.
[/COMPARE]`,
  },
  {
    id: "compare_list",
    label: "Compare List (Table)",
    description: "Row-wise comparison table",
    code: `[COMPARE_LIST]
LEFT_TITLE: Option A
RIGHT_TITLE: Option B

POINT: Speed
LEFT: Fast
RIGHT: Slow

POINT: Cost
LEFT: Expensive
RIGHT: Cheap

POINT: Quality
LEFT: High
RIGHT: Medium
[/COMPARE_LIST]`,
  },
  {
    id: "table",
    label: "Table",
    description: "Data table with headers and rows",
    code: `[TABLE]
COLUMN_HEADERS: Name | Age | City | Score
ROW: Ram | 20 | Delhi | 85
ROW: Shyam | 22 | Mumbai | 90
ROW_HEADER: Average | 21 | - | 87.5
ROW: Geeta | 19 | Kolkata | 78
[/TABLE]`,
  },
  {
    id: "pagebreak",
    label: "Page Break",
    description: "Content ko alag pages mein divide karo",
    code: `@title: Multi-Page Notes

[TEXT]
Yeh Page 1 ka content hai.
[/TEXT]

___

[TEXT]
Yeh Page 2 ka content hai. ___ se naya page shuru hota hai.
[/TEXT]

___

[TEXT]
Yeh Page 3 ka content hai. Students page navigation se switch kar sakte hain.
[/TEXT]`,
  },
  {
    id: "latex",
    label: "LaTeX / Math",
    description: "Mathematical equations ke liye — sirf $ use karo",
    code: `[TEXT]
Inline math sentence ke beech: The formula is $x^2 + y^2 = z^2$ which is Pythagoras theorem.

Einstein ka famous formula: $E = mc^2$ jo energy aur mass ka relation batata hai.

Quadratic formula: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$
[/TEXT]

[TEXT]
Display math (centered, alag line pe badi equation):
$$\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$

$$\\sum_{n=1}^{N} n = \\frac{N(N+1)}{2}$$
[/TEXT]

[LIST]
- Simple inline: $a^2 + b^2 = c^2$
- Fraction example: $\\frac{1}{2} + \\frac{1}{3} = \\frac{5}{6}$
- Complex: $\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}$
[/LIST]`,
  },
  {
    id: "full",
    label: "Full Sample Template",
    description: "Saare features ka ek complete example",
    code: `@title: Bharat ka Itihas - Chapter 1

[TEXT]
*Bharat* ek _prachin_ sabhyata wala desh hai jo {color:green}hajar saalo{/color} se apni sanskriti ko sanjoe hua hai.
[/TEXT]

[LIST]
- Sindhu Ghati Sabhyata sabse prachin thi
- Vedic Kaal ke dauran dharm ka vikas hua
- Maurya Samrajya ne ek vishal kshetra ko ekjut kiya
[/LIST]

[IMAGE_LEFT:PG:https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Harappa_-_The_city.jpg/320px-Harappa_-_The_city.jpg]
caption: Harappa ka ek drishya
Sindhu Ghati Sabhyata ke shehron mein behtar sukhsancha aur yojna thi.
[/IMAGE_LEFT]

[COMPARE]
LEFT_TITLE: Sindhu Sabhyata
LEFT_IMAGE: https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Harappa_-_The_city.jpg/160px-Harappa_-_The_city.jpg
LEFT_TEXT: Sindhu nadi ke kinare, planned cities, drainage system

RIGHT_TITLE: Vedic Kaal
RIGHT_IMAGE: https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Vedic_period_map.png/160px-Vedic_period_map.png
RIGHT_TEXT: Gangetic plains, Vedas, Ashram system, yajna
[/COMPARE]

___

[TABLE]
COLUMN_HEADERS: Samrajya | Sthapana | Rajdhani | Pramukh Raja
ROW: Maurya | 322 BC | Pataliputra | Chandragupta
ROW: Gupta | 320 AD | Pataliputra | Chandragupta I
ROW: Mughal | 1526 AD | Agra | Babur
[/TABLE]

[TEXT]
Math example: Ashoka ne apne rajya mein $\\pi r^2$ area mein sudhaar kiye the. Display equation:
$$\\frac{3}{4} \\times 10^6 \\text{ km}^2$$
[/TEXT]`,
  },
];

const NOTES_QUICK_REF = [
  { tag: "@title:", desc: "Notes ka heading" },
  { tag: "[TEXT]...[/TEXT]", desc: "Paragraph text" },
  { tag: "[LIST]...[/LIST]", desc: "Bullet list (- se shuru)" },
  {
    tag: "[IMAGE_LEFT:TYPE:URL]",
    desc: "Image left, text right (TYPE: PG/LIST/MIX)",
  },
  { tag: "[IMAGE_RIGHT:TYPE:URL]", desc: "Image right, text left" },
  {
    tag: "[COMPARE]...[/COMPARE]",
    desc: "2-column comparison cards",
  },
  {
    tag: "[COMPARE_LIST]...[/COMPARE_LIST]",
    desc: "Row-wise comparison table",
  },
  { tag: "[TABLE]...[/TABLE]", desc: "Data table" },
  { tag: "___", desc: "New page break" },
  { tag: "*text*", desc: "Bold" },
  { tag: "_text_", desc: "Italic" },
  { tag: "~text~", desc: "Underline" },
  {
    tag: "$formula$",
    desc: "Inline LaTeX/Math — sentence ke beech bhi kaam karta hai",
  },
  {
    tag: "$$formula$$",
    desc: "Display LaTeX/Math — centered block equation",
  },
  { tag: "{color:red}text{/color}", desc: "Colored text" },
  { tag: "{bg:yellow}text{/bg}", desc: "Highlighted text" },
];

// ─── Mock Test Templates ────────────────────────────────────────────────

const MOCKTEST_TEMPLATE_SECTIONS = [
  {
    id: "mocktest_basic",
    label: "Mock Test Basic",
    description: "Simple mock test with one section and questions",
    code: `@title: My Mock Test

[SECTION]
TITLE: General Knowledge

[Q] Bharat ki rajdhani kahan hai?
[A] Mumbai
[B] New Delhi
[C] Kolkata
[D] Chennai
[ANS] B
[EXP] New Delhi Bharat ki rajdhani hai jo 1911 mein Calcutta se transfer ki gayi thi.

[Q] Bharat ka rashtriya pakshi kaun hai?
[A] Kabutar
[B] Sparrow
[C] Peacock
[D] Eagle
[ANS] C
[EXP] Peacock (Mor) Bharat ka rashtriya pakshi hai, jise 1963 mein yeh darja diya gaya.

[/SECTION]`,
  },
  {
    id: "mocktest_multisection",
    label: "Mock Test Multi-Section",
    description: "Multiple sections (GK + Math + Reasoning)",
    code: `@title: Practice Test - All Subjects

[SECTION]
TITLE: General Knowledge

[Q] United Nations ki sthapana kab hui?
[A] 1944
[B] 1945
[C] 1946
[D] 1947
[ANS] B
[EXP] United Nations ki sthapana 24 October 1945 ko hui thi.

[/SECTION]

[SECTION]
TITLE: Mathematics

[Q] $\\sqrt{144}$ ka maan kya hai?
[A] 10
[B] 11
[C] 12
[D] 13
[ANS] C
[EXP] $\\sqrt{144} = 12$ kyunki $12 \\times 12 = 144$.

[Q] $\\frac{3}{4} + \\frac{1}{4}$ kitna hoga?
[A] 1
[B] 2
[C] $\\frac{1}{2}$
[D] $\\frac{3}{8}$
[ANS] A
[EXP] $\\frac{3}{4} + \\frac{1}{4} = \\frac{4}{4} = 1$

[/SECTION]

[SECTION]
TITLE: Reasoning

[Q] Agar BOOK = 2 15 15 11, to CAT = ?
[A] 3 1 20
[B] 3 2 19
[C] 4 1 20
[D] 2 1 19
[ANS] A
[EXP] Each letter is replaced by its alphabet position. C=3, A=1, T=20.

[/SECTION]`,
  },
  {
    id: "mocktest_image",
    label: "Mock Test with Image",
    description: "Questions with images (diagrams, maps, etc.)",
    code: `@title: Diagram Based Test

[SECTION]
TITLE: Visual Questions

[Q-IMG] Niche diye image mein konsa planet dikhaya gaya hai?
URL: https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Jupiter_New_Horizons.jpg/240px-Jupiter_New_Horizons.jpg
[A] Mars
[B] Saturn
[C] Jupiter
[D] Neptune
[ANS] C
[EXP] Image mein Jupiter dikhaya gaya hai jo solar system ka sabse bada planet hai.

[/SECTION]`,
  },
];

const MOCKTEST_QUICK_REF = [
  { tag: "@title:", desc: "Test ka naam/heading" },
  {
    tag: "[SECTION] ... [/SECTION]",
    desc: "Ek section block (multiple sections supported)",
  },
  { tag: "TITLE:", desc: "Section ka naam" },
  { tag: "[Q] text", desc: "Normal question" },
  { tag: "[Q-IMG] text + URL: link", desc: "Question with image" },
  { tag: "[A] [B] [C] [D]", desc: "Four answer options" },
  { tag: "[ANS] B", desc: "Correct answer (A/B/C/D)" },
  {
    tag: "[EXP] text",
    desc: "Explanation (dikhta hai review mein)",
  },
  {
    tag: "$formula$",
    desc: "Inline math in question/options/explanation",
  },
];

// ─── Current Affairs Templates ─────────────────────────────────────────────

const CURRENT_AFFAIRS_TEMPLATE_SECTIONS = [
  {
    id: "ca_sample",
    label: "Full Example",
    description: "Multi-date current affairs with all categories",
    code: `@title: Current Affairs - April 2026

[DATE] 3 April 2026 [/DATE]

[ARTICLE]
CATEGORY: Economy
HEADLINE: RBI ne repo rate ghatayi 25 bps
SUMMARY: Reserve Bank of India ne Monetary Policy Committee ki baithak mein repo rate 25 basis points ghatake 6.25% kar diya. Yeh kadam economic growth ko boost karne ke liye uthaya gaya.
IMPORTANCE: HIGH
[/ARTICLE]

[ARTICLE]
CATEGORY: Sports
HEADLINE: India ne Test series jeeti Australia ke khilaf
SUMMARY: India ne 4-test series 3-1 se jeet kar ICC Test Championship points hasil kiye. Virat Kohli ne series mein 400+ runs banaye.
IMPORTANCE: MEDIUM
[/ARTICLE]

[ARTICLE]
CATEGORY: Science
HEADLINE: ISRO ka nayi satellite successful launch
SUMMARY: ISRO ne PSLV-C60 rocket se EOS-08 earth observation satellite successfully launch kiya. Yeh satellite fasal monitoring aur disaster management mein kaam aayegi.
IMPORTANCE: MEDIUM
[/ARTICLE]

[DATE] 4 April 2026 [/DATE]

[ARTICLE]
CATEGORY: Politics
HEADLINE: Cabinet ne naya education bill paas kiya
SUMMARY: Union Cabinet ne National Education Policy 2.0 ke implementation ke liye naya bill approve kiya. Is bill mein digital literacy aur vocational training pe focus hai.
IMPORTANCE: HIGH
[/ARTICLE]

[ARTICLE]
CATEGORY: Environment
HEADLINE: Odisha mein naya wildlife sanctuary
SUMMARY: Odisha government ne Similipal ke paas 500 sq km ka naya wildlife sanctuary announce kiya jo tigers aur elephants ke liye protected zone hoga.
IMPORTANCE: LOW
[/ARTICLE]`,
  },
  {
    id: "ca_basic",
    label: "Single Date",
    description: "Ek date ke liye basic template",
    code: `@title: Current Affairs - April 2026

[DATE] 5 April 2026 [/DATE]

[ARTICLE]
CATEGORY: Economy
HEADLINE: Apna headline yahan likhein
SUMMARY: Article ka summary yahan — 2-3 sentences mein main points cover karein.
IMPORTANCE: HIGH
[/ARTICLE]

[ARTICLE]
CATEGORY: Sports
HEADLINE: Doosra headline yahan
SUMMARY: Is article ka summary. Jo bhi important information hai woh yahan likhen.
IMPORTANCE: MEDIUM
[/ARTICLE]`,
  },
];

const CURRENT_AFFAIRS_QUICK_REF = [
  { tag: "@title:", desc: "Current Affairs file ka heading" },
  {
    tag: "[DATE] date [/DATE]",
    desc: "Date section heading (e.g. 3 April 2026)",
  },
  { tag: "[ARTICLE]...[/ARTICLE]", desc: "Ek news article block" },
  {
    tag: "CATEGORY:",
    desc: "Article category (Economy, Sports, Politics, Science, Environment, etc.)",
  },
  { tag: "HEADLINE:", desc: "Article ka main headline" },
  { tag: "SUMMARY:", desc: "Article ka summary (2-3 sentences)" },
  { tag: "IMPORTANCE:", desc: "HIGH / MEDIUM / LOW (badge dikhta hai)" },
];

// ─── Component ────────────────────────────────────────────────────────────────────

type FormatTab = "notes" | "mocktest" | "current-affairs";

export default function AdminTemplate() {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const { isAdmin, checking } = useAdminCheck();

  const [formatTab, setFormatTab] = useState<FormatTab>("notes");

  // Sub-tab selection per format
  const [notesSection, setNotesSection] = useState(
    NOTES_TEMPLATE_SECTIONS[0].id,
  );
  const [mocktestSection, setMocktestSection] = useState(
    MOCKTEST_TEMPLATE_SECTIONS[0].id,
  );
  const [caSection, setCaSection] = useState(
    CURRENT_AFFAIRS_TEMPLATE_SECTIONS[0].id,
  );

  const [copied, setCopied] = useState<string | null>(null);

  if (!identity) {
    void navigate({ to: "/login" });
    return null;
  }
  if (checking)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  if (!isAdmin)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">No admin access.</p>
      </div>
    );

  function handleCopy(code: string, id: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(id);
      toast.success("Template copied!");
      setTimeout(() => setCopied(null), 2000);
    });
  }

  let templateSections: typeof NOTES_TEMPLATE_SECTIONS;
  let activeSubId: string;
  let setActiveSubId: (id: string) => void;
  let quickRef: typeof NOTES_QUICK_REF;
  let formatLabel: string;

  if (formatTab === "notes") {
    templateSections = NOTES_TEMPLATE_SECTIONS;
    activeSubId = notesSection;
    setActiveSubId = setNotesSection;
    quickRef = NOTES_QUICK_REF;
    formatLabel = "Notes";
  } else if (formatTab === "mocktest") {
    templateSections = MOCKTEST_TEMPLATE_SECTIONS;
    activeSubId = mocktestSection;
    setActiveSubId = setMocktestSection;
    quickRef = MOCKTEST_QUICK_REF;
    formatLabel = "Mock Test";
  } else {
    templateSections = CURRENT_AFFAIRS_TEMPLATE_SECTIONS;
    activeSubId = caSection;
    setActiveSubId = setCaSection;
    quickRef = CURRENT_AFFAIRS_QUICK_REF;
    formatLabel = "Current Affairs";
  }

  const active = templateSections.find((s) => s.id === activeSubId);

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Top bar */}
      <div className="bg-blue-700 px-4 py-4 flex items-center gap-3">
        <Link to="/">
          <GraduationCap className="h-5 w-5 text-white" />
        </Link>
        <button
          type="button"
          onClick={() => void navigate({ to: "/admin" })}
          className="p-1 rounded-lg hover:bg-white/10"
        >
          <ChevronLeft className="h-5 w-5 text-white" />
        </button>
        <h1 className="font-bold text-white text-base flex-1">Templates</h1>
      </div>

      <div className="px-4 pt-5">
        {/* Intro */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-5">
          <p className="text-sm text-blue-800 font-medium mb-1">
            ℹ️ Format Guide
          </p>
          <p className="text-xs text-blue-700">
            Notes, Mock Test, ya Current Affairs ke liye template choose karo.
            Ek .txt file banao (GitHub Gist ya Pastebin), is format mein content
            likho, aur raw URL ko respective section mein add karo.
          </p>
        </div>

        {/* Top-level format tabs */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-5 bg-white">
          <button
            type="button"
            onClick={() => setFormatTab("notes")}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
              formatTab === "notes"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
            data-ocid="template.tab"
          >
            📝 Notes
          </button>
          <button
            type="button"
            onClick={() => setFormatTab("mocktest")}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
              formatTab === "mocktest"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
            data-ocid="template.tab"
          >
            📋 Mock Test
          </button>
          <button
            type="button"
            onClick={() => setFormatTab("current-affairs")}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
              formatTab === "current-affairs"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
            data-ocid="template.tab"
          >
            📰 Current Affairs
          </button>
        </div>

        {/* Sub-template selector */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
          {templateSections.map((section) => (
            <button
              type="button"
              key={section.id}
              onClick={() => setActiveSubId(section.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                activeSubId === section.id
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-200 text-gray-700 hover:border-blue-300"
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>

        {/* Active template */}
        {active && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">
                  {active.label}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {active.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(active.code, active.id)}
                className="shrink-0 flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-blue-100 transition-colors"
                data-ocid="template.primary_button"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied === active.id ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="p-4 overflow-x-auto">
              <pre className="text-xs text-gray-700 font-mono leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-xl p-4">
                {active.code}
              </pre>
            </div>
          </div>
        )}

        {/* Quick reference */}
        <div className="mt-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="font-bold text-gray-900 text-sm mb-3">
            ⚡ Quick Reference{" "}
            <span className="text-gray-400 font-normal">
              ({formatLabel} Format)
            </span>
          </h3>
          <div className="space-y-2">
            {quickRef.map(({ tag, desc }) => (
              <div key={tag} className="flex items-start gap-2">
                <code className="text-[11px] bg-gray-100 text-blue-700 px-1.5 py-0.5 rounded shrink-0 font-mono">
                  {tag}
                </code>
                <span className="text-xs text-gray-600">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
