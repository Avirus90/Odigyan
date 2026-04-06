import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  Award,
  BookOpen,
  Brain,
  Calculator,
  ChevronLeft,
  Clipboard,
  ClipboardList,
  FileText,
  Flame,
  Folder,
  Globe,
  GraduationCap,
  Landmark,
  Lightbulb,
  Newspaper,
  Pencil,
  Star,
  Target,
  Video,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import type { ContentFolder, ContentItem } from "../types/content";
import CurrentAffairsRenderer from "../components/CurrentAffairsRenderer";
import MockTestViewer from "../components/MockTestViewer";
import NotesRenderer from "../components/NotesRenderer";
import VideoPlayer from "../components/VideoPlayer";
import { useActor } from "../hooks/useActor";
import { useStudentSession } from "../hooks/useStudentSession";

// ─── Icon Map ─────────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  folder: Folder,
  book: BookOpen,
  bookopen: BookOpen,
  filetext: FileText,
  clipboard: Clipboard,
  clipboardlist: ClipboardList,
  video: Video,
  star: Star,
  zap: Zap,
  flame: Flame,
  target: Target,
  brain: Brain,
  calculator: Calculator,
  globe: Globe,
  award: Award,
  lightbulb: Lightbulb,
  pencil: Pencil,
  graduationcap: GraduationCap,
  landmark: Landmark,
  newspaper: Newspaper,
};

function FolderIcon({
  iconName,
  className,
}: { iconName: string; className?: string }) {
  const Icon = ICON_MAP[iconName?.toLowerCase()] ?? Folder;
  return <Icon className={className ?? "h-6 w-6"} />;
}

// ─── Sections ─────────────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    id: "video",
    label: "Video",
    icon: Video,
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    id: "notes",
    label: "Notes",
    icon: FileText,
    bgColor: "bg-green-50",
    iconColor: "text-green-600",
  },
  {
    id: "mocktest",
    label: "Mocktest",
    icon: ClipboardList,
    bgColor: "bg-orange-50",
    iconColor: "text-orange-600",
  },
  {
    id: "current-affairs",
    label: "Current Affairs",
    icon: Newspaper,
    bgColor: "bg-red-50",
    iconColor: "text-red-600",
  },
  {
    id: "vocabs",
    label: "Vocabs",
    icon: BookOpen,
    bgColor: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  {
    id: "static-gk",
    label: "Static GK",
    icon: Landmark,
    bgColor: "bg-teal-50",
    iconColor: "text-teal-600",
  },
];

// ─── Notes Viewer ───────────────────────────────────────────────────────────────────

function NotesViewer({
  item,
  onBack,
}: {
  item: ContentItem;
  onBack: () => void;
}) {
  const {
    data: content,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["notes-content", item.url],
    queryFn: async () => {
      try {
        const res = await fetch(item.url);
        if (res.ok) return res.text();
      } catch {
        // CORS or network error — try proxy
      }
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(item.url)}`;
      const res2 = await fetch(proxyUrl);
      if (!res2.ok)
        throw new Error(`Failed to fetch notes (status ${res2.status})`);
      return res2.text();
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-1.5 rounded-xl hover:bg-gray-100"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h1 className="font-display font-bold text-gray-900 text-base flex-1 line-clamp-1">
          {item.name}
        </h1>
      </div>

      <div className="px-4 pt-5">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-7 bg-blue-100 rounded-xl w-2/3" />
            <div className="h-0.5 bg-blue-200 rounded w-16" />
            <div className="space-y-2 mt-4">
              {[90, 75, 85, 60, 80].map((w, i) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: stable list
                  key={i}
                  className="h-4 bg-gray-200 rounded"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
          </div>
        ) : isError || !content ? (
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6 text-center">
            <p className="text-red-500 text-sm mb-2 font-medium">
              Could not load notes content.
            </p>
            {error instanceof Error && (
              <p className="text-gray-400 text-xs font-mono break-all">
                {error.message}
              </p>
            )}
            <p className="text-gray-400 text-xs mt-2">
              Make sure the URL is publicly accessible and supports CORS, or use
              a GitHub raw link.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <NotesRenderer content={content} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Folder Card ────────────────────────────────────────────────────────────────────

function FolderCard({
  folder,
  onClick,
}: {
  folder: ContentFolder;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:border-blue-200 hover:shadow-md transition-all w-full"
    >
      {/* Colored icon area */}
      <div className="h-20 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
        <FolderIcon
          iconName={folder.icon ?? "folder"}
          className="h-8 w-8 text-white"
        />
      </div>
      {/* Name */}
      <div className="py-2.5 px-2 text-center">
        <span className="text-xs font-semibold text-gray-700 line-clamp-2 leading-tight">
          {folder.name}
        </span>
      </div>
    </motion.button>
  );
}

// ─── Main CourseContent ────────────────────────────────────────────────────────────────

export default function CourseContent() {
  const params = useParams({ from: "/public/courses/$id/content" });
  const courseId = BigInt(params.id);
  const { actor } = useActor();
  const { studentSession } = useStudentSession();
  const navigate = useNavigate();

  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<ContentFolder | null>(
    null,
  );
  const [viewingItem, setViewingItem] = useState<ContentItem | null>(null);
  const [viewingMockTest, setViewingMockTest] = useState<ContentItem | null>(
    null,
  );
  const [viewingCurrentAffairs, setViewingCurrentAffairs] =
    useState<ContentItem | null>(null);
  const [viewingVideo, setViewingVideo] = useState<ContentItem | null>(null);

  const enrolledQuery = useQuery({
    queryKey: ["enrolled-student", studentSession?.studentId ?? ""],
    queryFn: async () => {
      if (!actor || !studentSession?.studentId) return [] as bigint[];
      return (actor as any)
        .getEnrolledCoursesByStudentId(studentSession.studentId)
        .catch(() => [] as bigint[]);
    },
    enabled: !!actor && !!studentSession?.studentId,
  });

  const foldersQuery = useQuery({
    queryKey: [
      "folders",
      params.id,
      selectedSection,
      selectedFolder?.id ?? null,
    ],
    queryFn: async () => {
      if (!actor || !selectedSection) return [] as ContentFolder[];
      return await actor.listContentFolders(params.id, selectedSection);
    },
    enabled: !!actor && !!selectedSection,
  });

  const itemsQuery = useQuery({
    queryKey: ["items", params.id, selectedSection, selectedFolder?.id ?? null],
    queryFn: async () => {
      if (!actor || !selectedSection || !selectedFolder)
        return [] as ContentItem[];
      return await actor.listContentItems(
        params.id,
        selectedSection,
        selectedFolder.id,
      );
    },
    enabled: !!actor && !!selectedSection && !!selectedFolder,
  });

  const enrolledIds = Array.isArray(enrolledQuery.data)
    ? enrolledQuery.data
    : [];
  const isEnrolled = enrolledIds.some((id) => id === courseId);

  if (!studentSession) {
    void navigate({ to: "/login" });
    return null;
  }
  if (!enrolledQuery.isLoading && !isEnrolled) {
    void navigate({ to: "/courses/$id", params: { id: params.id } });
    return null;
  }

  // —— Video Player Mode ——
  if (viewingVideo) {
    return (
      <VideoPlayer item={viewingVideo} onBack={() => setViewingVideo(null)} />
    );
  }

  // —— Current Affairs Viewer Mode ——
  if (viewingCurrentAffairs) {
    return (
      <CurrentAffairsRenderer
        url={viewingCurrentAffairs.url}
        onBack={() => setViewingCurrentAffairs(null)}
      />
    );
  }

  // —— Mock Test Viewer Mode ——
  if (viewingMockTest) {
    return (
      <MockTestViewer
        item={viewingMockTest}
        onBack={() => setViewingMockTest(null)}
      />
    );
  }

  // —— Notes Viewer Mode ——
  if (viewingItem) {
    return (
      <NotesViewer item={viewingItem} onBack={() => setViewingItem(null)} />
    );
  }

  const rawFolders = Array.isArray(foldersQuery.data) ? foldersQuery.data : [];
  const visibleFolders = selectedFolder
    ? rawFolders.filter((f: ContentFolder) => f.parentId === selectedFolder.id)
    : rawFolders.filter((f: ContentFolder) => !f.parentId);
  const items = Array.isArray(itemsQuery.data) ? itemsQuery.data : [];
  const currentSection = SECTIONS.find((s) => s.id === selectedSection);

  if (!selectedSection) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => void navigate({ to: "/" })}
            className="p-1.5 rounded-xl hover:bg-gray-100"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="font-display font-bold text-gray-900 text-base">
            Course Content
          </h1>
        </div>
        <div className="px-4 pt-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <motion.button
                  type="button"
                  key={section.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedSection(section.id)}
                  className="bg-white border border-gray-100 shadow-sm rounded-2xl p-0 overflow-hidden hover:shadow-md hover:border-blue-100 transition-all"
                >
                  <div
                    className={`h-20 flex items-center justify-center ${section.bgColor}`}
                  >
                    <Icon className={`h-8 w-8 ${section.iconColor}`} />
                  </div>
                  <div className="py-2.5 px-2 text-center">
                    <span className="text-xs font-semibold text-gray-700">
                      {section.label}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (selectedFolder) setSelectedFolder(null);
            else if (selectedSection) setSelectedSection(null);
          }}
          className="p-1.5 rounded-xl hover:bg-gray-100"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h1 className="font-display font-bold text-gray-900 text-base">
          {selectedFolder ? selectedFolder.name : currentSection?.label}
        </h1>
      </div>

      <div className="px-4 pt-4">
        {foldersQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse"
              />
            ))}
          </div>
        ) : visibleFolders.length === 0 && items.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            No content yet.
          </div>
        ) : (
          <>
            {visibleFolders.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[...visibleFolders]
                  .sort(
                    (a: ContentFolder, b: ContentFolder) =>
                      Number(a.order) - Number(b.order),
                  )
                  .map((folder: ContentFolder) => (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      onClick={() => setSelectedFolder(folder)}
                    />
                  ))}
              </div>
            )}
            {selectedFolder && items.length > 0 && (
              <div className="space-y-2">
                {[...items]
                  .sort(
                    (a: ContentItem, b: ContentItem) =>
                      Number(a.order) - Number(b.order),
                  )
                  .map((item: ContentItem) => {
                    if (selectedSection === "video") {
                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => setViewingVideo(item)}
                          className="flex items-center gap-3 bg-white rounded-2xl border-l-4 border-l-blue-400 border border-blue-100 shadow-sm p-4 hover:border-blue-300 transition-colors w-full text-left"
                          data-ocid="video.item"
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                            <Video className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="text-sm text-gray-800 font-medium line-clamp-1 flex-1">
                            {item.name}
                          </span>
                          <span className="text-xs text-blue-500 font-medium shrink-0">
                            Play
                          </span>
                        </button>
                      );
                    }

                    if (selectedSection === "mocktest") {
                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => setViewingMockTest(item)}
                          className="flex items-center gap-3 bg-white rounded-2xl border-l-4 border-l-orange-400 border border-orange-100 shadow-sm p-4 hover:border-orange-300 transition-colors w-full text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                            <ClipboardList className="h-4 w-4 text-orange-600" />
                          </div>
                          <span className="text-sm text-gray-800 font-medium line-clamp-1 flex-1">
                            {item.name}
                          </span>
                          <span className="text-xs text-orange-500 font-medium shrink-0">
                            Test
                          </span>
                        </button>
                      );
                    }

                    if (selectedSection === "current-affairs") {
                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => setViewingCurrentAffairs(item)}
                          className="flex items-center gap-3 bg-white rounded-2xl border-l-4 border-l-blue-400 border border-blue-100 shadow-sm p-4 hover:border-blue-300 transition-colors w-full text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                            <Newspaper className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="text-sm text-gray-800 font-medium line-clamp-1 flex-1">
                            {item.name}
                          </span>
                          <span className="text-xs text-blue-500 font-medium shrink-0">
                            News
                          </span>
                        </button>
                      );
                    }

                    const isNotes =
                      selectedSection === "notes" ||
                      selectedSection === "vocabs" ||
                      selectedSection === "static-gk";

                    if (isNotes) {
                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => setViewingItem(item)}
                          className="flex items-center gap-3 bg-white rounded-2xl border-l-4 border-l-green-400 border border-green-100 shadow-sm p-4 hover:border-green-300 transition-colors w-full text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4 text-green-600" />
                          </div>
                          <span className="text-sm text-gray-800 font-medium line-clamp-1 flex-1">
                            {item.name}
                          </span>
                          <span className="text-xs text-green-500 font-medium shrink-0">
                            {selectedSection === "vocabs"
                              ? "Vocabs"
                              : selectedSection === "static-gk"
                                ? "GK"
                                : "Notes"}
                          </span>
                        </button>
                      );
                    }

                    return (
                      <a
                        key={item.id}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 bg-white rounded-2xl border-l-4 border-l-blue-400 border border-gray-100 shadow-sm p-4 hover:border-blue-200 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                          <Video className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="text-sm text-gray-800 font-medium line-clamp-1">
                          {item.name}
                        </span>
                      </a>
                    );
                  })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
