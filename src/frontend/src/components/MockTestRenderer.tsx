import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Grid3x3,
  Star,
  Timer,
  X,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type QStatus = "unattempted" | "attempted" | "marked";
type Phase = "exam" | "result" | "review";

interface ParsedQuestion {
  idx: number;
  section: string;
  text: string;
  imageUrl?: string;
  options: { letter: string; text: string }[];
  answer: string;
  explanation: string;
}

export interface MockTestRendererProps {
  content: string;
  timeMinutes?: number;
  negMark?: number;
  onExit: () => void;
}

// ─── KaTeX Loader ─────────────────────────────────────────────────────────────

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

void ensureKatexLoaded();

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
            <span key={key++}>{remaining.slice(0, displayStart)}</span>,
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
            <span key={key++}>{remaining.slice(0, inlineStart)}</span>,
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
    parts.push(<span key={key++}>{remaining}</span>);
    break;
  }
  return parts;
}

function RenderText({ text }: { text: string }) {
  if (text.includes("$")) return <>{renderLatex(text)}</>;
  return <>{text}</>;
}

// ─── Parser ─────────────────────────────────────────────────────────────────────

function parseMockTest(raw: string): {
  title: string;
  questions: ParsedQuestion[];
} {
  const lines = raw.split("\n").map((l) => l.trimEnd());
  let title = "Mock Test";
  const questions: ParsedQuestion[] = [];

  for (const line of lines) {
    const m = line.match(/^@title:\s*(.+)/i);
    if (m) {
      title = m[1].trim();
      break;
    }
  }

  let i = 0;
  while (i < lines.length) {
    if (lines[i].trim() === "[SECTION]") {
      let sectionTitle = "General";
      i++;
      while (i < lines.length && lines[i].trim() !== "[/SECTION]") {
        const titleMatch = lines[i].match(/^TITLE:\s*(.+)/i);
        if (titleMatch) {
          sectionTitle = titleMatch[1].trim();
          i++;
          continue;
        }

        const qMatch = lines[i].match(/^\[Q\]\s*(.*)/i);
        const qImgMatch = lines[i].match(/^\[Q-IMG\]\s*(.*)/i);

        if (qMatch || qImgMatch) {
          const isImg = !!qImgMatch;
          let qText = (qMatch ? qMatch[1] : qImgMatch![1]).trim();
          let imageUrl: string | undefined;
          i++;

          while (
            i < lines.length &&
            !lines[i].match(/^URL:/i) &&
            !lines[i].match(/^\[[ABCD]\]/) &&
            !lines[i].match(/^\[ANS\]/) &&
            !lines[i].match(/^\[Q(-IMG)?\]/) &&
            !lines[i].match(/^\[\/SECTION\]/)
          ) {
            if (lines[i].trim()) qText += ` ${lines[i].trim()}`;
            i++;
          }

          if (isImg && i < lines.length && lines[i].match(/^URL:/i)) {
            const urlMatch = lines[i].match(/^URL:\s*(.+)/i);
            if (urlMatch) imageUrl = urlMatch[1].trim();
            i++;
          }

          const options: { letter: string; text: string }[] = [];
          let answer = "";
          let explanation = "";

          while (i < lines.length) {
            const optMatch = lines[i].match(/^\[([ABCD])\]\s*(.*)/i);
            const ansMatch = lines[i].match(/^\[ANS\]\s*(.*)/i);
            const expMatch = lines[i].match(/^\[EXP\]\s*(.*)/i);

            if (optMatch) {
              let optText = optMatch[2].trim();
              i++;
              while (
                i < lines.length &&
                !lines[i].match(/^\[[ABCDE]\]/) &&
                !lines[i].match(/^\[ANS\]/) &&
                !lines[i].match(/^\[Q(-IMG)?\]/) &&
                !lines[i].match(/^\[\/SECTION\]/)
              ) {
                if (lines[i].trim()) optText += ` ${lines[i].trim()}`;
                i++;
              }
              options.push({
                letter: optMatch[1].toUpperCase(),
                text: optText,
              });
            } else if (ansMatch) {
              answer = ansMatch[1].trim().toUpperCase();
              i++;
            } else if (expMatch) {
              let expText = expMatch[1]?.trim() || "";
              i++;
              while (
                i < lines.length &&
                !lines[i].match(/^\[Q(-IMG)?\]/) &&
                !lines[i].match(/^\[\/SECTION\]/)
              ) {
                if (lines[i].trim()) expText += ` ${lines[i].trim()}`;
                i++;
              }
              explanation = expText;
              break;
            } else {
              break;
            }
          }

          questions.push({
            idx: questions.length,
            section: sectionTitle,
            text: qText,
            imageUrl,
            options,
            answer,
            explanation,
          });
          continue;
        }
        i++;
      }
    }
    i++;
  }

  return { title, questions };
}

// ─── Timer Helpers ───────────────────────────────────────────────────────────────

function formatSeconds(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

function formatQSeconds(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── Question Palette ─────────────────────────────────────────────────────────

function QuestionPalette({
  questions,
  answers,
  status,
  currentIdx,
  phase,
  onJump,
  onClose,
  onSubmit,
}: {
  questions: ParsedQuestion[];
  answers: Map<number, string>;
  status: Map<number, QStatus>;
  currentIdx: number;
  phase: Phase;
  onJump: (idx: number) => void;
  onClose: () => void;
  onSubmit?: () => void;
}) {
  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed inset-y-0 right-0 z-50 w-72 bg-white shadow-2xl flex flex-col"
      data-ocid="mocktest.panel"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-blue-700">
        <span className="font-semibold text-white text-sm">
          Question Palette
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-blue-600 text-white"
          data-ocid="mocktest.close_button"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-5 gap-2">
          {questions.map((q) => {
            const s = status.get(q.idx) ?? "unattempted";
            const isCorrect =
              phase === "review" && answers.get(q.idx) === q.answer;
            const isWrong =
              phase === "review" &&
              answers.has(q.idx) &&
              answers.get(q.idx) !== q.answer;
            const isCurrentQ = q.idx === currentIdx;

            let bgClass = "bg-white border-gray-300 text-gray-600";
            if (phase === "review") {
              if (isCorrect)
                bgClass = "bg-green-500 border-green-500 text-white";
              else if (isWrong)
                bgClass = "bg-red-500 border-red-500 text-white";
              else bgClass = "bg-gray-200 border-gray-200 text-gray-500";
            } else {
              if (s === "attempted")
                bgClass = "bg-green-500 border-green-500 text-white";
              else if (s === "marked")
                bgClass = "bg-amber-400 border-amber-400 text-white";
            }

            return (
              <button
                type="button"
                key={q.idx}
                onClick={() => onJump(q.idx)}
                className={`w-10 h-10 rounded-full border-2 text-xs font-bold transition-all ${bgClass} ${
                  isCurrentQ ? "ring-2 ring-blue-600 ring-offset-1" : ""
                }`}
                data-ocid={`mocktest.item.${q.idx + 1}`}
              >
                {q.idx + 1}
              </button>
            );
          })}
        </div>

        {phase !== "review" && (
          <div className="mt-5 space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-green-500 inline-block" />
              <span className="text-gray-600">Attempted</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white border-2 border-gray-300 inline-block" />
              <span className="text-gray-600">Unattempted</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-400 inline-block" />
              <span className="text-gray-600">Marked for Review</span>
            </div>
          </div>
        )}
        {phase === "review" && (
          <div className="mt-5 space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-green-500 inline-block" />
              <span className="text-gray-600">Correct</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-red-500 inline-block" />
              <span className="text-gray-600">Wrong</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-gray-200 inline-block" />
              <span className="text-gray-600">Unattempted</span>
            </div>
          </div>
        )}
      </div>

      {/* Submit button in palette — exam phase only */}
      {phase === "exam" && onSubmit && (
        <div className="p-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onSubmit}
            className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
            data-ocid="mocktest.submit_button"
          >
            Submit Test
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ─── Submit Confirm Dialog ────────────────────────────────────────────────────

function SubmitDialog({
  questions,
  status,
  onConfirm,
  onCancel,
}: {
  questions: ParsedQuestion[];
  status: Map<number, QStatus>;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const attempted = [...status.values()].filter(
    (s) => s === "attempted",
  ).length;
  const marked = [...status.values()].filter((s) => s === "marked").length;
  const unattempted = questions.length - attempted - marked;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      data-ocid="mocktest.dialog"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
          <h2 className="text-lg font-bold text-gray-900">Submit Test?</h2>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-5 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-green-600">{attempted}</p>
            <p className="text-xs text-gray-500">Attempted</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-500">{unattempted}</p>
            <p className="text-xs text-gray-500">Unattempted</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-500">{marked}</p>
            <p className="text-xs text-gray-500">Marked</p>
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-5">
          Once submitted, you cannot change your answers.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50"
            data-ocid="mocktest.cancel_button"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            data-ocid="mocktest.confirm_button"
          >
            Submit Exam
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Quit Confirmation Dialog ─────────────────────────────────────────────────

function QuitDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      data-ocid="mocktest.dialog"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6"
      >
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="h-6 w-6 text-red-500" />
          <h2 className="text-lg font-bold text-gray-900">Quit Test?</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Are you sure you want to quit? Your progress will be lost.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50"
            data-ocid="mocktest.cancel_button"
          >
            No, Continue
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
            data-ocid="mocktest.confirm_button"
          >
            Yes, Quit
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  color,
  wide,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`bg-gray-50 rounded-xl p-4 flex items-center gap-3 ${
        wide ? "col-span-2" : ""
      }`}
    >
      {icon}
      <div>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

// ─── Result Screen ────────────────────────────────────────────────────────────

function ResultScreen({
  questions,
  answers,
  negMark,
  totalSeconds,
  onReview,
  onExit,
  onJumpToQuestion,
}: {
  questions: ParsedQuestion[];
  answers: Map<number, string>;
  negMark: number;
  totalSeconds: number;
  onReview: () => void;
  onExit: () => void;
  onJumpToQuestion?: (idx: number) => void;
}) {
  const [showResultPalette, setShowResultPalette] = useState(false);

  let correct = 0;
  let wrong = 0;
  for (const q of questions) {
    const ans = answers.get(q.idx);
    if (ans) {
      if (ans === q.answer) correct++;
      else wrong++;
    }
  }
  const score = correct - wrong * negMark;
  const total = questions.length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  // A dummy status map for the palette (result view shows correct/wrong colors)
  const dummyStatus = new Map<number, QStatus>();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 bg-white z-40 flex flex-col"
      data-ocid="mocktest.result.panel"
    >
      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 bg-blue-700 px-4 py-3 flex items-center gap-3 shrink-0">
        <span className="font-semibold text-white text-base flex-1">
          Result
        </span>
        <button
          type="button"
          onClick={() => setShowResultPalette((p) => !p)}
          className="p-1.5 rounded-lg hover:bg-blue-600 text-white"
          data-ocid="mocktest.result.open_modal_button"
          aria-label="Jump to question"
        >
          <Grid3x3 className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onExit}
          className="p-1.5 rounded-lg hover:bg-blue-600 text-white"
          data-ocid="mocktest.result.close_button"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Score header */}
        <div className="bg-blue-700 px-4 pt-2 pb-6 text-center">
          <p className="text-blue-200 text-sm mb-1">Exam Complete</p>
          <p className="text-5xl font-black text-white">
            {score.toFixed(negMark > 0 ? 2 : 0)}
          </p>
          <p className="text-blue-200 text-sm mt-1">out of {total}</p>
        </div>

        <div className="px-4 py-6 max-w-md mx-auto w-full">
          <div className="grid grid-cols-2 gap-3 mb-6">
            <StatCard
              icon={<CheckCircle className="h-5 w-5 text-green-500" />}
              label="Correct"
              value={correct}
              color="text-green-600"
            />
            <StatCard
              icon={<XCircle className="h-5 w-5 text-red-500" />}
              label="Wrong"
              value={wrong}
              color="text-red-600"
            />
            <StatCard
              icon={
                <span className="text-orange-500 font-bold text-sm">−</span>
              }
              label="Negative"
              value={`-${(wrong * negMark).toFixed(negMark > 0 ? 2 : 0)}`}
              color="text-orange-600"
            />
            <StatCard
              icon={<Timer className="h-5 w-5 text-blue-500" />}
              label="Time Taken"
              value={formatSeconds(totalSeconds)}
              color="text-blue-600"
            />
            <StatCard
              icon={
                <span className="text-purple-500 font-bold text-sm">%</span>
              }
              label="Accuracy"
              value={`${accuracy}%`}
              color="text-purple-600"
              wide
            />
          </div>

          {/* Jump to Question palette inline */}
          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Jump to Question
            </p>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, i) => {
                const ans = answers.get(q.idx);
                const isCorrect = ans === q.answer;
                const isWrong = ans !== undefined && ans !== q.answer;
                let bg = "bg-gray-100 text-gray-600";
                if (isCorrect) bg = "bg-green-500 text-white";
                else if (isWrong) bg = "bg-red-500 text-white";
                return (
                  <button
                    key={q.idx}
                    type="button"
                    onClick={() => onJumpToQuestion?.(i)}
                    className={`${bg} rounded-lg h-10 text-xs font-bold transition-transform active:scale-95`}
                    data-ocid={`mocktest.result.item.${i + 1}`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-green-500 inline-block" />
                Correct
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-red-500 inline-block" />
                Wrong
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-gray-200 inline-block" />
                Skipped
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={onReview}
              className="w-full py-3 rounded-xl bg-blue-700 text-white font-semibold hover:bg-blue-800 transition-colors"
              data-ocid="mocktest.result.secondary_button"
            >
              View Solutions
            </button>
            <button
              type="button"
              onClick={onExit}
              className="w-full py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              data-ocid="mocktest.result.cancel_button"
            >
              Exit
            </button>
          </div>
        </div>
      </div>

      {/* Slide-in palette from top-right Grid3x3 button */}
      <AnimatePresence>
        {showResultPalette && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40"
              onClick={() => setShowResultPalette(false)}
            />
            <QuestionPalette
              questions={questions}
              answers={answers}
              status={dummyStatus}
              currentIdx={-1}
              phase="review"
              onJump={(idx) => {
                onJumpToQuestion?.(idx);
                setShowResultPalette(false);
              }}
              onClose={() => setShowResultPalette(false)}
            />
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Review Screen ────────────────────────────────────────────────────────────

function ReviewScreen({
  questions,
  answers,
  negMark,
  showPalette,
  currentIdx,
  status,
  onJump,
  onTogglePalette,
  onExit,
}: {
  questions: ParsedQuestion[];
  answers: Map<number, string>;
  negMark: number;
  showPalette: boolean;
  currentIdx: number;
  status: Map<number, QStatus>;
  onJump: (idx: number) => void;
  onTogglePalette: () => void;
  onExit: () => void;
}) {
  const q = questions[currentIdx];
  if (!q) return null;

  const userAns = answers.get(q.idx);
  const isCorrect = userAns === q.answer;
  const isWrong = userAns !== undefined && !isCorrect;

  let correct = 0;
  let wrong = 0;
  for (const qu of questions) {
    const a = answers.get(qu.idx);
    if (a) {
      if (a === qu.answer) correct++;
      else wrong++;
    }
  }
  const score = correct - wrong * negMark;

  return (
    <div className="fixed inset-0 bg-white z-40 flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-blue-700 px-4 py-3 flex items-center gap-3">
        <span className="text-white font-semibold text-sm flex-1">
          Review Mode
        </span>
        <span className="text-blue-200 text-xs">
          Score: {score.toFixed(negMark > 0 ? 2 : 0)} / {questions.length}
        </span>
        <button
          type="button"
          onClick={onTogglePalette}
          className="p-1.5 rounded-lg hover:bg-blue-600 text-white ml-2"
          data-ocid="mocktest.review.open_modal_button"
        >
          <Grid3x3 className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onExit}
          className="p-1.5 rounded-lg hover:bg-blue-600 text-white"
          data-ocid="mocktest.review.close_button"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 pb-28">
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
            {q.section}
          </span>
          <span className="text-gray-400 text-xs ml-auto">
            Q {currentIdx + 1} of {questions.length}
          </span>
        </div>

        <p className="text-base font-medium text-gray-900 leading-relaxed mb-4">
          <RenderText text={q.text} />
        </p>

        {q.imageUrl && (
          <div className="mb-4 flex justify-center">
            <img
              src={q.imageUrl}
              alt="Question"
              className="max-w-full rounded-xl border border-gray-100 shadow-sm"
              style={{ maxHeight: 280 }}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        )}

        <div className="space-y-2 mb-4">
          {q.options.map((opt) => {
            const isCorrectOpt = opt.letter === q.answer;
            const isUserWrong = opt.letter === userAns && isWrong;

            let cls =
              "w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium flex items-center gap-3 ";
            if (isCorrectOpt) {
              cls += "bg-green-50 border-green-500 text-green-800";
            } else if (isUserWrong) {
              cls += "bg-red-50 border-red-400 text-red-800";
            } else {
              cls += "bg-white border-gray-200 text-gray-700";
            }

            return (
              <div key={opt.letter} className={cls}>
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border border-current shrink-0">
                  {opt.letter}
                </span>
                <span className="flex-1">
                  <RenderText text={opt.text} />
                </span>
                {isCorrectOpt && (
                  <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                )}
                {isUserWrong && (
                  <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {q.explanation && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-700 mb-1">
              Explanation:
            </p>
            <p className="text-sm text-blue-900 italic leading-relaxed">
              <RenderText text={q.explanation} />
            </p>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          disabled={currentIdx === 0}
          onClick={() => onJump(currentIdx - 1)}
          className="flex items-center gap-1 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 disabled:opacity-40 hover:border-blue-300 transition-colors"
          data-ocid="mocktest.review.pagination_prev"
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        <div className="flex-1" />
        <button
          type="button"
          disabled={currentIdx === questions.length - 1}
          onClick={() => onJump(currentIdx + 1)}
          className="flex items-center gap-1 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 disabled:opacity-40 hover:border-blue-300 transition-colors"
          data-ocid="mocktest.review.pagination_next"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <AnimatePresence>
        {showPalette && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40"
              onClick={onTogglePalette}
            />
            <QuestionPalette
              questions={questions}
              answers={answers}
              status={status}
              currentIdx={currentIdx}
              phase="review"
              onJump={(idx) => {
                onJump(idx);
                onTogglePalette();
              }}
              onClose={onTogglePalette}
            />
          </>
        )}
      </AnimatePresence>

      {/* Floating jump-to-question button */}
      <button
        type="button"
        onClick={onTogglePalette}
        className="fixed bottom-20 right-5 z-50 w-12 h-12 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
        data-ocid="mocktest.review.open_modal_button"
        aria-label="Jump to question"
      >
        <Grid3x3 className="h-5 w-5" />
      </button>
    </div>
  );
}

// ─── Section Switcher ─────────────────────────────────────────────────────────

function SectionSwitcher({
  sections,
  currentSection,
  questions,
  onNavigate,
}: {
  sections: string[];
  currentSection: string;
  questions: ParsedQuestion[];
  onNavigate: (idx: number) => void;
}) {
  if (sections.length <= 1) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none mb-3">
      {sections.map((sec) => {
        const firstQ = questions.find((q) => q.section === sec);
        const isActive = sec === currentSection;
        return (
          <button
            type="button"
            key={sec}
            onClick={() => {
              if (firstQ) onNavigate(firstQ.idx);
            }}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              isActive
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600"
            }`}
            data-ocid="mocktest.tab"
          >
            {sec}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MockTestRenderer({
  content,
  timeMinutes = 60,
  negMark = 0,
  onExit,
}: MockTestRendererProps) {
  const { title, questions } = parseMockTest(content);

  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [answers, setAnswers] = useState<Map<number, string>>(new Map());
  const [qStatus, setQStatus] = useState<Map<number, QStatus>>(new Map());
  const [timePerQ, setTimePerQ] = useState<Map<number, number>>(new Map());
  const [globalSeconds, setGlobalSeconds] = useState(timeMinutes * 60);
  const [questionSeconds, setQuestionSeconds] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [phase, setPhase] = useState<Phase>("exam");
  const [reviewIdx, setReviewIdx] = useState(0);
  const [paletteInReview, setPaletteInReview] = useState(false);
  const totalTimeRef = useRef(timeMinutes * 60);
  const submittedRef = useRef(false);

  const sections = Array.from(new Set(questions.map((q) => q.section)));
  const currentSection = questions[currentQIdx]?.section ?? "";

  // Hide bottom nav bar when exam is active
  useEffect(() => {
    const bottomNav = document.getElementById("bottom-nav-bar");
    if (bottomNav) {
      bottomNav.style.display = "none";
    }
    return () => {
      if (bottomNav) {
        bottomNav.style.display = "";
      }
    };
  }, []);

  // Single interval for both timers
  useEffect(() => {
    if (isSubmitted) return;
    const interval = setInterval(() => {
      setGlobalSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!submittedRef.current) {
            submittedRef.current = true;
            setIsSubmitted(true);
            setPhase("result");
          }
          return 0;
        }
        return prev - 1;
      });
      setQuestionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isSubmitted]);

  const navigateTo = useCallback(
    (newIdx: number) => {
      setTimePerQ((prev) => {
        const next = new Map(prev);
        const acc = (prev.get(currentQIdx) ?? 0) + questionSeconds;
        next.set(currentQIdx, acc);
        return next;
      });
      const accForNew = timePerQ.get(newIdx) ?? 0;
      setQuestionSeconds(accForNew);
      setCurrentQIdx(newIdx);
      setShowPalette(false);
    },
    [currentQIdx, questionSeconds, timePerQ],
  );

  const selectAnswer = useCallback(
    (letter: string) => {
      setAnswers((prev) => {
        const next = new Map(prev);
        const existing = prev.get(currentQIdx);
        if (existing === letter) {
          next.delete(currentQIdx);
        } else {
          next.set(currentQIdx, letter);
        }
        return next;
      });
      setQStatus((prev) => {
        const next = new Map(prev);
        const existing = answers.get(currentQIdx);
        if (existing === letter) {
          const current = prev.get(currentQIdx);
          if (current !== "marked") next.set(currentQIdx, "unattempted");
        } else {
          const current = prev.get(currentQIdx);
          if (current !== "marked") next.set(currentQIdx, "attempted");
        }
        return next;
      });
    },
    [currentQIdx, answers],
  );

  const clearAnswer = useCallback(() => {
    setAnswers((prev) => {
      const next = new Map(prev);
      next.delete(currentQIdx);
      return next;
    });
    setQStatus((prev) => {
      const next = new Map(prev);
      next.set(currentQIdx, "unattempted");
      return next;
    });
  }, [currentQIdx]);

  const toggleMark = useCallback(() => {
    setQStatus((prev) => {
      const next = new Map(prev);
      const current = prev.get(currentQIdx) ?? "unattempted";
      if (current === "marked") {
        next.set(
          currentQIdx,
          answers.has(currentQIdx) ? "attempted" : "unattempted",
        );
      } else {
        next.set(currentQIdx, "marked");
      }
      return next;
    });
  }, [currentQIdx, answers]);

  const handleSubmit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setIsSubmitted(true);
    setShowSubmitConfirm(false);
    totalTimeRef.current = timeMinutes * 60 - globalSeconds;
    setPhase("result");
  }, [globalSeconds, timeMinutes]);

  if (questions.length === 0) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-4">
            No questions found in this test.
          </p>
          <button
            type="button"
            onClick={onExit}
            className="px-6 py-2 bg-blue-700 text-white rounded-xl text-sm font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ── Result Phase ──
  if (phase === "result") {
    return (
      <ResultScreen
        questions={questions}
        answers={answers}
        negMark={negMark}
        totalSeconds={totalTimeRef.current}
        onReview={() => {
          setReviewIdx(0);
          setPhase("review");
        }}
        onExit={onExit}
        onJumpToQuestion={(idx) => {
          setReviewIdx(idx);
          setPhase("review");
        }}
      />
    );
  }

  // ── Review Phase ──
  if (phase === "review") {
    return (
      <ReviewScreen
        questions={questions}
        answers={answers}
        negMark={negMark}
        showPalette={paletteInReview}
        currentIdx={reviewIdx}
        status={qStatus}
        onJump={(idx) => {
          setReviewIdx(idx);
          setPaletteInReview(false);
        }}
        onTogglePalette={() => setPaletteInReview((p) => !p)}
        onExit={onExit}
      />
    );
  }

  // ── Exam Phase ──
  const q = questions[currentQIdx];
  const userAnswer = answers.get(currentQIdx);
  const currentStatus = qStatus.get(currentQIdx) ?? "unattempted";
  const isMarked = currentStatus === "marked";
  const isTimeLow = globalSeconds < 5 * 60;

  return (
    <div
      className="fixed inset-0 bg-white z-50 flex flex-col"
      data-ocid="mocktest.panel"
    >
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-blue-100 px-4 py-3 flex items-center gap-3 shrink-0">
        {/* Quit button with label */}
        <button
          type="button"
          onClick={() => setShowQuitConfirm(true)}
          className="flex items-center gap-1 p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 shrink-0"
          data-ocid="mocktest.close_button"
        >
          <X className="h-5 w-5" />
          <span className="text-xs font-medium hidden sm:inline">Quit</span>
        </button>

        <h1 className="flex-1 text-sm font-bold text-gray-900 truncate mx-2">
          {title}
        </h1>

        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-mono font-bold shrink-0 ${
            isTimeLow ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-700"
          }`}
        >
          <Timer className="h-3.5 w-3.5" />
          {formatSeconds(globalSeconds)}
        </div>

        <button
          type="button"
          onClick={() => setShowPalette((p) => !p)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 shrink-0"
          data-ocid="mocktest.open_modal_button"
        >
          <Grid3x3 className="h-5 w-5" />
        </button>
      </div>

      {/* Scrollable question area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-32">
        <SectionSwitcher
          sections={sections}
          currentSection={currentSection}
          questions={questions}
          onNavigate={navigateTo}
        />

        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-gray-400">
            Q {currentQIdx + 1} of {questions.length}
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-400 font-mono ml-auto">
            <Timer className="h-3 w-3" />
            {formatQSeconds(questionSeconds)}
          </span>
        </div>

        <p className="text-base font-medium text-gray-900 leading-relaxed mb-4">
          <RenderText text={q.text} />
        </p>

        {q.imageUrl && (
          <div className="mb-4 flex justify-center">
            <img
              src={q.imageUrl}
              alt="Question illustration"
              className="max-w-full rounded-xl border border-gray-100 shadow-sm"
              style={{ maxHeight: 280 }}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        )}

        <div className="space-y-2.5">
          {q.options.map((opt) => {
            const isSelected = userAnswer === opt.letter;
            return (
              <motion.button
                type="button"
                key={opt.letter}
                whileTap={{ scale: 0.98 }}
                onClick={() => selectAnswer(opt.letter)}
                className={`w-full text-left px-4 py-3.5 rounded-xl border-2 text-sm font-medium flex items-center gap-3 transition-all ${
                  isSelected
                    ? "bg-blue-50 border-blue-600 text-blue-900"
                    : "bg-white border-gray-200 text-gray-800 hover:border-blue-300 hover:bg-blue-50/30"
                }`}
                data-ocid={`mocktest.radio.${currentQIdx + 1}`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 transition-all ${
                    isSelected
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-gray-300 text-gray-500"
                  }`}
                >
                  {opt.letter}
                </span>
                <span className="flex-1">
                  <RenderText text={opt.text} />
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Bottom action bar — NO Submit button here; Submit is ONLY in palette */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentQIdx === 0}
            onClick={() => navigateTo(currentQIdx - 1)}
            className="flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 disabled:opacity-40 hover:border-blue-300 transition-colors"
            data-ocid="mocktest.pagination_prev"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>

          <button
            type="button"
            onClick={toggleMark}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
              isMarked
                ? "bg-amber-400 border-amber-400 text-white"
                : "border-gray-200 text-gray-600 hover:border-amber-300"
            }`}
            data-ocid="mocktest.toggle"
          >
            <Star className={`h-4 w-4 ${isMarked ? "fill-white" : ""}`} />
            <span className="hidden sm:inline">
              {isMarked ? "Marked" : "Mark"}
            </span>
          </button>

          <button
            type="button"
            onClick={clearAnswer}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-300 transition-colors"
            data-ocid="mocktest.secondary_button"
          >
            Clear
          </button>

          <div className="flex-1" />

          <button
            type="button"
            disabled={currentQIdx === questions.length - 1}
            onClick={() => navigateTo(currentQIdx + 1)}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 transition-colors disabled:opacity-40"
            data-ocid="mocktest.pagination_next"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Palette overlay */}
      <AnimatePresence>
        {showPalette && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40"
              onClick={() => setShowPalette(false)}
            />
            <QuestionPalette
              questions={questions}
              answers={answers}
              status={qStatus}
              currentIdx={currentQIdx}
              phase="exam"
              onJump={navigateTo}
              onClose={() => setShowPalette(false)}
              onSubmit={() => {
                setShowPalette(false);
                setShowSubmitConfirm(true);
              }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Quit confirm dialog */}
      <AnimatePresence>
        {showQuitConfirm && (
          <QuitDialog
            onConfirm={onExit}
            onCancel={() => setShowQuitConfirm(false)}
          />
        )}
      </AnimatePresence>

      {/* Submit confirm dialog */}
      <AnimatePresence>
        {showSubmitConfirm && (
          <SubmitDialog
            questions={questions}
            status={qStatus}
            onConfirm={handleSubmit}
            onCancel={() => setShowSubmitConfirm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
