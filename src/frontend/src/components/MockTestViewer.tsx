import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2 } from "lucide-react";
import type { ContentItem } from "../types/content";
import MockTestRenderer from "./MockTestRenderer";

interface MockTestViewerProps {
  item: ContentItem;
  onBack: () => void;
}

function getTimeParam(url: string): number {
  try {
    // Check item URL params first
    const u = new URL(url);
    const t = u.searchParams.get("time");
    if (t) return Number.parseInt(t, 10);
  } catch {
    // not a URL with params
  }
  // Fall back to window.location.search
  const params = new URLSearchParams(window.location.search);
  const t = params.get("time");
  return t ? Number.parseInt(t, 10) : 60;
}

function getNegParam(url: string): number {
  try {
    const u = new URL(url);
    const n = u.searchParams.get("neg");
    if (n) return Number.parseFloat(n);
  } catch {
    // not a URL with params
  }
  const params = new URLSearchParams(window.location.search);
  const n = params.get("neg");
  return n ? Number.parseFloat(n) : 0;
}

export default function MockTestViewer({ item, onBack }: MockTestViewerProps) {
  const timeMinutes = getTimeParam(item.url);
  const negMark = getNegParam(item.url);

  const { data, isLoading, isError, error } = useQuery<string>({
    queryKey: ["mocktest-content", item.url],
    queryFn: async () => {
      // Try direct fetch first
      try {
        const res = await fetch(item.url);
        if (res.ok) return res.text();
      } catch {
        // CORS / network — try proxy
      }
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(item.url)}`;
      const res2 = await fetch(proxyUrl);
      if (!res2.ok)
        throw new Error(`Failed to load test (HTTP ${res2.status})`);
      return res2.text();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div
        className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center gap-4"
        data-ocid="mocktest.loading_state"
      >
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
        <p className="text-sm text-gray-500">Loading test…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div
        className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center gap-4 p-6"
        data-ocid="mocktest.error_state"
      >
        <AlertCircle className="h-10 w-10 text-red-500" />
        <p className="text-base font-semibold text-gray-800">
          Could not load test content.
        </p>
        {error instanceof Error && (
          <p className="text-sm text-gray-400 font-mono text-center">
            {error.message}
          </p>
        )}
        <p className="text-xs text-gray-400 text-center max-w-xs">
          Make sure the URL is publicly accessible and supports CORS, or use a
          GitHub raw link.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-2 px-6 py-2.5 bg-blue-700 text-white rounded-xl text-sm font-medium hover:bg-blue-800 transition-colors"
          data-ocid="mocktest.cancel_button"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <MockTestRenderer
      content={data}
      timeMinutes={timeMinutes}
      negMark={negMark}
      onExit={onBack}
    />
  );
}
