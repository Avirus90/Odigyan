import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  Award,
  BookOpen,
  Brain,
  Calculator,
  ChevronLeft,
  Clipboard,
  ClipboardList,
  ExternalLink,
  Eye,
  FileText,
  Flame,
  Folder,
  Globe,
  GraduationCap,
  Landmark,
  Lightbulb,
  Newspaper,
  Pencil,
  Plus,
  Settings2,
  Star,
  Target,
  Trash2,
  Video,
  X,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { ContentFolder, ContentItem } from "../../backend.d.ts";
import NotesRenderer from "../../components/NotesRenderer";
import { useActor } from "../../hooks/useActor";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";
import { useAdminCheck } from "./AdminDashboard";

// ─── Icon Pack ─────────────────────────────────────────────────────────────────────

const ICON_PACK: {
  name: string;
  label: string;
  component: React.ElementType;
}[] = [
  { name: "folder", label: "Folder", component: Folder },
  { name: "book", label: "Book", component: BookOpen },
  { name: "filetext", label: "Notes", component: FileText },
  { name: "clipboard", label: "Clipboard", component: Clipboard },
  { name: "clipboardlist", label: "List", component: ClipboardList },
  { name: "video", label: "Video", component: Video },
  { name: "star", label: "Star", component: Star },
  { name: "zap", label: "Zap", component: Zap },
  { name: "flame", label: "Flame", component: Flame },
  { name: "target", label: "Target", component: Target },
  { name: "brain", label: "Brain", component: Brain },
  { name: "calculator", label: "Calc", component: Calculator },
  { name: "globe", label: "Globe", component: Globe },
  { name: "award", label: "Award", component: Award },
  { name: "lightbulb", label: "Idea", component: Lightbulb },
  { name: "pencil", label: "Pencil", component: Pencil },
  { name: "graduationcap", label: "Grad", component: GraduationCap },
  { name: "landmark", label: "GK", component: Landmark },
  { name: "newspaper", label: "News", component: Newspaper },
  { name: "externallink", label: "Link", component: ExternalLink },
];

const ICON_MAP: Record<string, React.ElementType> = Object.fromEntries(
  ICON_PACK.map((i) => [i.name, i.component]),
);

function FolderIcon({
  iconName,
  className,
}: { iconName: string; className?: string }) {
  const Icon = ICON_MAP[iconName?.toLowerCase()] ?? Folder;
  return <Icon className={className ?? "h-5 w-5"} />;
}

// ─── Sections ─────────────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    id: "video",
    label: "Video",
    icon: Video,
    color: "bg-blue-100 text-blue-600",
  },
  {
    id: "notes",
    label: "Notes",
    icon: FileText,
    color: "bg-green-100 text-green-600",
  },
  {
    id: "mocktest",
    label: "Mocktest",
    icon: ClipboardList,
    color: "bg-orange-100 text-orange-600",
  },
  {
    id: "current-affairs",
    label: "Current Affairs",
    icon: Newspaper,
    color: "bg-red-100 text-red-600",
  },
  {
    id: "vocabs",
    label: "Vocabs",
    icon: BookOpen,
    color: "bg-purple-100 text-purple-600",
  },
  {
    id: "static-gk",
    label: "Static GK",
    icon: Landmark,
    color: "bg-teal-100 text-teal-600",
  },
];

// ─── Notes Preview Modal ──────────────────────────────────────────────────────────

function NotesPreviewModal({
  url,
  name,
  onClose,
}: { url: string; name: string; onClose: () => void }) {
  const {
    data: content,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["notes-preview", url],
    queryFn: async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.text();
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-2 sm:p-4">
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-green-600" />
            <span className="font-bold text-gray-900 text-sm line-clamp-1">
              {name}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-6 bg-blue-100 rounded-xl w-1/2" />
              <div className="h-0.5 bg-blue-200 rounded w-12" />
              {[80, 70, 90].map((w, i) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: stable list
                  key={i}
                  className="h-4 bg-gray-200 rounded"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
          ) : isError || !content ? (
            <div className="text-center py-8">
              <p className="text-red-500 text-sm">
                Could not load notes. Check the URL.
              </p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 text-sm underline mt-2 block"
              >
                Open raw file
              </a>
            </div>
          ) : (
            <NotesRenderer content={content} />
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── MockTest Config Modal ─────────────────────────────────────────────────────────

function parseTimeNeg(url: string): {
  time: number;
  neg: number;
  baseUrl: string;
} {
  try {
    const u = new URL(url);
    const time = Number(u.searchParams.get("time") ?? 60);
    const neg = Number(u.searchParams.get("neg") ?? 0);
    u.searchParams.delete("time");
    u.searchParams.delete("neg");
    const base = u.searchParams.toString()
      ? `${u.origin}${u.pathname}?${u.searchParams.toString()}`
      : `${u.origin}${u.pathname}`;
    return {
      time: Number.isNaN(time) ? 60 : time,
      neg: Number.isNaN(neg) ? 0 : neg,
      baseUrl: base,
    };
  } catch {
    return { time: 60, neg: 0, baseUrl: url };
  }
}

function buildUrlWithParams(
  baseUrl: string,
  time: number,
  neg: number,
): string {
  try {
    const u = new URL(baseUrl);
    u.searchParams.set("time", String(time));
    if (neg > 0) u.searchParams.set("neg", String(neg));
    else u.searchParams.delete("neg");
    return u.toString();
  } catch {
    const sep = baseUrl.includes("?") ? "&" : "?";
    let result = `${baseUrl}${sep}time=${time}`;
    if (neg > 0) result += `&neg=${neg}`;
    return result;
  }
}

function MockTestConfigModal({
  item,
  onSave,
  onClose,
}: {
  item: ContentItem;
  onSave: (newUrl: string) => void;
  onClose: () => void;
}) {
  const parsed = parseTimeNeg(item.url);
  const [timeVal, setTimeVal] = useState(String(parsed.time));
  const [negVal, setNegVal] = useState(String(parsed.neg));

  const handleSave = () => {
    const t = Number.parseFloat(timeVal);
    const n = Number.parseFloat(negVal);
    if (Number.isNaN(t) || t <= 0) {
      toast.error("Valid time (minutes) required.");
      return;
    }
    if (Number.isNaN(n) || n < 0) {
      toast.error("Negative marking must be 0 or more.");
      return;
    }
    const newUrl = buildUrlWithParams(parsed.baseUrl, t, n);
    onSave(newUrl);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-3xl w-full max-w-sm p-6"
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-gray-900">Mock Test Config</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p
          className="text-xs text-gray-400 mb-4 line-clamp-1"
          title={item.name}
        >
          {item.name}
        </p>

        <div className="space-y-4 mb-5">
          <div>
            <label
              htmlFor="mt-time"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Timer (minutes)
            </label>
            <input
              id="mt-time"
              type="number"
              min="1"
              value={timeVal}
              onChange={(e) => setTimeVal(e.target.value)}
              placeholder="e.g. 60"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label
              htmlFor="mt-neg"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Negative Marking
            </label>
            <input
              id="mt-neg"
              type="number"
              min="0"
              step="0.25"
              value={negVal}
              onChange={(e) => setNegVal(e.target.value)}
              placeholder="e.g. 0.25"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600"
          >
            Save Config
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Folder Card (Admin style) ────────────────────────────────────────────────────

function AdminFolderCard({
  folder,
  onOpen,
  onDelete,
}: {
  folder: ContentFolder;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      whileTap={{ scale: 0.96 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative"
    >
      <button type="button" onClick={onOpen} className="w-full text-left">
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
      </button>
      {/* Delete button */}
      <button
        type="button"
        onClick={onDelete}
        className="absolute top-2 right-2 p-1 rounded-lg bg-black/20 hover:bg-red-500 text-white transition-colors"
        title="Delete folder"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </motion.div>
  );
}

// ─── Add Folder Modal with Icon Picker ────────────────────────────────────────────

function AddFolderModal({
  onAdd,
  onClose,
  isPending,
}: {
  onAdd: (name: string, icon: string) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [folderName, setFolderName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("folder");

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-3xl w-full max-w-sm p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Add Folder</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Folder name input */}
        <input
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          placeholder="Folder name"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />

        {/* Icon picker */}
        <p className="text-xs font-semibold text-gray-600 mb-2">Choose Icon</p>
        <div className="grid grid-cols-5 gap-2 mb-5">
          {ICON_PACK.map((iconItem) => {
            const IconComp = iconItem.component;
            const isSelected = selectedIcon === iconItem.name;
            return (
              <button
                key={iconItem.name}
                type="button"
                onClick={() => setSelectedIcon(iconItem.name)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                  isSelected
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-100 hover:border-blue-200 hover:bg-gray-50"
                }`}
                title={iconItem.label}
              >
                <IconComp
                  className={`h-5 w-5 ${
                    isSelected ? "text-blue-600" : "text-gray-500"
                  }`}
                />
                <span
                  className={`text-[9px] font-medium leading-tight text-center ${
                    isSelected ? "text-blue-600" : "text-gray-400"
                  }`}
                >
                  {iconItem.label}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            if (folderName.trim()) onAdd(folderName.trim(), selectedIcon);
            else toast.error("Name required.");
          }}
          disabled={isPending}
          className="w-full bg-blue-600 text-white font-semibold py-3 rounded-2xl hover:bg-blue-700 disabled:opacity-60"
        >
          {isPending ? "Adding..." : "Add Folder"}
        </button>
      </motion.div>
    </div>
  );
}

// ─── Main AdminCourseContent ─────────────────────────────────────────────────────────────

export default function AdminCourseContent() {
  const params = useParams({ from: "/admin/admin/courses/$id/content" });
  const courseIdStr = params.id;
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();
  const { isAdmin, checking } = useAdminCheck();
  const queryClient = useQueryClient();

  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<ContentFolder | null>(
    null,
  );
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlName, setUrlName] = useState("");
  const [urlValue, setUrlValue] = useState("");
  const [previewItem, setPreviewItem] = useState<ContentItem | null>(null);
  const [configItem, setConfigItem] = useState<ContentItem | null>(null);

  const foldersQuery = useQuery({
    queryKey: ["admin-folders", courseIdStr, selectedSection],
    queryFn: async () => {
      if (!actor || !selectedSection) return [];
      return await actor.listContentFolders(courseIdStr, selectedSection);
    },
    enabled: !!actor && !!selectedSection && isAdmin,
  });

  const itemsQuery = useQuery({
    queryKey: [
      "admin-items",
      courseIdStr,
      selectedSection,
      selectedFolder?.id ?? null,
    ],
    queryFn: async () => {
      if (!actor || !selectedSection || !selectedFolder) return [];
      return await actor.listContentItems(
        courseIdStr,
        selectedSection,
        selectedFolder.id,
      );
    },
    enabled: !!actor && !!selectedSection && !!selectedFolder && isAdmin,
  });

  const addFolderMutation = useMutation({
    mutationFn: async ({ name, icon }: { name: string; icon: string }) => {
      if (!actor || !selectedSection) throw new Error("No actor");
      const rawFolders = Array.isArray(foldersQuery.data)
        ? foldersQuery.data
        : [];
      const folder: ContentFolder = {
        id: crypto.randomUUID(),
        name,
        icon,
        sectionType: selectedSection,
        courseId: courseIdStr,
        parentId: selectedFolder ? selectedFolder.id : undefined,
        order: BigInt(rawFolders.length),
        createdAt: BigInt(Date.now()),
      };
      await actor.createContentFolder(folder);
    },
    onSuccess: () => {
      toast.success("Folder added!");
      void queryClient.invalidateQueries({
        queryKey: ["admin-folders", courseIdStr, selectedSection],
      });
      void queryClient.invalidateQueries({
        queryKey: ["folders", courseIdStr],
      });
      setShowFolderModal(false);
    },
    onError: () => toast.error("Failed to add folder."),
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("No actor");
      await actor.deleteContentFolder(id);
    },
    onSuccess: () => {
      toast.success("Folder deleted.");
      void queryClient.invalidateQueries({
        queryKey: ["admin-folders", courseIdStr, selectedSection],
      });
      void queryClient.invalidateQueries({
        queryKey: ["folders", courseIdStr],
      });
      if (selectedFolder) setSelectedFolder(null);
    },
    onError: () => toast.error("Failed to delete folder."),
  });

  const addItemMutation = useMutation({
    mutationFn: async () => {
      if (!actor || !selectedSection || !selectedFolder)
        throw new Error("No actor");
      const rawItems = Array.isArray(itemsQuery.data) ? itemsQuery.data : [];
      const item: ContentItem = {
        id: crypto.randomUUID(),
        name: urlName,
        url: urlValue,
        sectionType: selectedSection,
        courseId: courseIdStr,
        folderId: selectedFolder.id,
        order: BigInt(rawItems.length),
        createdAt: BigInt(Date.now()),
      };
      await actor.createContentItem(item);
    },
    onSuccess: () => {
      toast.success("URL added!");
      void queryClient.invalidateQueries({
        queryKey: [
          "admin-items",
          courseIdStr,
          selectedSection,
          selectedFolder?.id ?? null,
        ],
      });
      void queryClient.invalidateQueries({ queryKey: ["items", courseIdStr] });
      setShowUrlModal(false);
      setUrlName("");
      setUrlValue("");
    },
    onError: () => toast.error("Failed to add URL."),
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("No actor");
      await actor.deleteContentItem(id);
    },
    onSuccess: () => {
      toast.success("URL deleted.");
      void queryClient.invalidateQueries({
        queryKey: [
          "admin-items",
          courseIdStr,
          selectedSection,
          selectedFolder?.id ?? null,
        ],
      });
      void queryClient.invalidateQueries({ queryKey: ["items", courseIdStr] });
    },
    onError: () => toast.error("Failed to delete URL."),
  });

  const updateItemUrlMutation = useMutation({
    mutationFn: async ({
      item,
      newUrl,
    }: { item: ContentItem; newUrl: string }) => {
      if (!actor) throw new Error("No actor");
      const updated: ContentItem = { ...item, url: newUrl };
      await actor.deleteContentItem(item.id);
      await actor.createContentItem(updated);
    },
    onSuccess: () => {
      toast.success("Config saved!");
      void queryClient.invalidateQueries({
        queryKey: [
          "admin-items",
          courseIdStr,
          selectedSection,
          selectedFolder?.id ?? null,
        ],
      });
      void queryClient.invalidateQueries({ queryKey: ["items", courseIdStr] });
      setConfigItem(null);
    },
    onError: () => toast.error("Failed to save config."),
  });

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

  const rawFolders = Array.isArray(foldersQuery.data) ? foldersQuery.data : [];
  const visibleFolders = selectedFolder
    ? rawFolders.filter((f: ContentFolder) => f.parentId === selectedFolder.id)
    : rawFolders.filter((f: ContentFolder) => !f.parentId);
  const items = Array.isArray(itemsQuery.data) ? itemsQuery.data : [];
  const currentSection = SECTIONS.find((s) => s.id === selectedSection);
  const isNotesSection =
    selectedSection === "notes" ||
    selectedSection === "vocabs" ||
    selectedSection === "static-gk";
  const isMocktestSection = selectedSection === "mocktest";

  const isNotesUrl = (url: string) =>
    url.endsWith(".txt") ||
    url.includes("raw.githubusercontent") ||
    url.includes("pastebin.com/raw") ||
    url.includes("notes-format");

  // Section grid
  if (!selectedSection) {
    return (
      <div className="min-h-screen bg-gray-50 pb-8">
        <div className="bg-blue-700 px-4 py-4 flex items-center gap-3">
          <Link to="/">
            <GraduationCap className="h-5 w-5 text-white" />
          </Link>
          <button
            type="button"
            onClick={() => void navigate({ to: "/admin/courses" })}
            className="p-1 rounded-lg hover:bg-white/10"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <h1 className="font-bold text-white text-base">Course Content</h1>
        </div>
        <div className="px-4 pt-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <motion.button
                  key={section.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedSection(section.id);
                    setSelectedFolder(null);
                  }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center gap-3 hover:border-blue-200 hover:shadow-md transition-all"
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${section.color}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 text-center">
                    {section.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Folder grid + items view
  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-blue-700 px-4 py-4 flex items-center gap-3">
        <Link to="/">
          <GraduationCap className="h-5 w-5 text-white" />
        </Link>
        <button
          type="button"
          onClick={() => {
            if (selectedFolder) setSelectedFolder(null);
            else setSelectedSection(null);
          }}
          className="p-1 rounded-lg hover:bg-white/10"
        >
          <ChevronLeft className="h-5 w-5 text-white" />
        </button>
        <h1 className="font-bold text-white text-base flex-1">
          {selectedFolder ? selectedFolder.name : currentSection?.label}
        </h1>
      </div>

      <div className="px-4 pt-4">
        {/* Action buttons */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setShowFolderModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-3 py-2 rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Folder
          </button>
          {selectedFolder && (
            <button
              type="button"
              onClick={() => setShowUrlModal(true)}
              className="flex items-center gap-1.5 bg-green-600 text-white text-sm font-semibold px-3 py-2 rounded-xl hover:bg-green-700 transition-colors"
            >
              <Plus className="h-4 w-4" />{" "}
              {isNotesSection
                ? "Add Notes URL"
                : isMocktestSection
                  ? "Add Test URL"
                  : "Add URL"}
            </button>
          )}
        </div>

        {foldersQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse" />
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
                    <AdminFolderCard
                      key={folder.id}
                      folder={folder}
                      onOpen={() => setSelectedFolder(folder)}
                      onDelete={() => {
                        if (confirm("Delete folder?"))
                          deleteFolderMutation.mutate(folder.id);
                      }}
                    />
                  ))}
              </div>
            )}
            {selectedFolder && (
              <div className="space-y-2">
                {[...items]
                  .sort(
                    (a: ContentItem, b: ContentItem) =>
                      Number(a.order) - Number(b.order),
                  )
                  .map((item: ContentItem) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isMocktestSection
                            ? "bg-orange-50"
                            : isNotesSection && isNotesUrl(item.url)
                              ? "bg-green-50"
                              : "bg-blue-50"
                        }`}
                      >
                        {isMocktestSection ? (
                          <ClipboardList className="h-4 w-4 text-orange-600" />
                        ) : isNotesSection && isNotesUrl(item.url) ? (
                          <FileText className="h-4 w-4 text-green-600" />
                        ) : (
                          <ExternalLink className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <span className="flex-1 text-sm text-gray-800 font-medium line-clamp-1">
                        {item.name}
                      </span>

                      {isMocktestSection &&
                        (() => {
                          const { time, neg } = parseTimeNeg(item.url);
                          return (
                            <span className="text-xs text-orange-500 font-mono shrink-0">
                              {time}min{neg > 0 ? ` -${neg}` : ""}
                            </span>
                          );
                        })()}

                      {isMocktestSection && (
                        <button
                          type="button"
                          onClick={() => setConfigItem(item)}
                          className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-500"
                          title="Configure timer & negative marking"
                        >
                          <Settings2 className="h-4 w-4" />
                        </button>
                      )}

                      {isNotesSection && isNotesUrl(item.url) && (
                        <button
                          type="button"
                          onClick={() => setPreviewItem(item)}
                          className="p-1.5 rounded-lg hover:bg-green-50 text-green-500"
                          title="Preview notes"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Delete URL?"))
                            deleteItemMutation.mutate(item.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </button>
                    </div>
                  ))}
                {items.length === 0 && !itemsQuery.isLoading && (
                  <p className="text-center text-gray-400 text-sm py-4">
                    No URLs yet. Add one above.
                  </p>
                )}
              </div>
            )}
            {visibleFolders.length === 0 && !selectedFolder && (
              <p className="text-center text-gray-400 text-sm py-8">
                No folders yet. Add one above.
              </p>
            )}
          </>
        )}
      </div>

      {/* Notes Preview Modal */}
      {previewItem && (
        <NotesPreviewModal
          url={previewItem.url}
          name={previewItem.name}
          onClose={() => setPreviewItem(null)}
        />
      )}

      {/* MockTest Config Modal */}
      {configItem && (
        <MockTestConfigModal
          item={configItem}
          onSave={(newUrl) =>
            updateItemUrlMutation.mutate({ item: configItem, newUrl })
          }
          onClose={() => setConfigItem(null)}
        />
      )}

      {/* Add Folder Modal with Icon Picker */}
      {showFolderModal && (
        <AddFolderModal
          onAdd={(name, icon) => addFolderMutation.mutate({ name, icon })}
          onClose={() => setShowFolderModal(false)}
          isPending={addFolderMutation.isPending}
        />
      )}

      {/* Add URL Modal */}
      {showUrlModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-3xl w-full max-w-sm p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">
                {isNotesSection
                  ? "Add Notes URL"
                  : isMocktestSection
                    ? "Add Mock Test URL"
                    : "Add URL"}
              </h2>
              <button
                type="button"
                onClick={() => setShowUrlModal(false)}
                className="p-1.5 rounded-xl hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {isNotesSection && (
              <p className="text-xs text-green-600 bg-green-50 rounded-xl px-3 py-2 mb-3">
                For rendered notes, paste a raw .txt URL (e.g. GitHub raw,
                Pastebin raw) in the custom notes format.
              </p>
            )}
            {isMocktestSection && (
              <p className="text-xs text-orange-600 bg-orange-50 rounded-xl px-3 py-2 mb-3">
                Paste a raw .txt URL in mock test format. After adding, use the
                ⚙️ settings icon to configure timer and negative marking.
              </p>
            )}
            <div className="space-y-3 mb-4">
              <input
                value={urlName}
                onChange={(e) => setUrlName(e.target.value)}
                placeholder={
                  isNotesSection
                    ? "Notes title (e.g. Chapter 1 Notes)"
                    : isMocktestSection
                      ? "Test name (e.g. Practice Test 1)"
                      : "Name (e.g. Lecture 1)"
                }
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder={
                  isNotesSection
                    ? "Raw .txt URL (https://...)"
                    : isMocktestSection
                      ? "Raw .txt URL for mock test (https://...)"
                      : "URL (https://...)"
                }
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (urlName.trim() && urlValue.trim()) addItemMutation.mutate();
                else toast.error("Both fields required.");
              }}
              disabled={addItemMutation.isPending}
              className="w-full bg-green-600 text-white font-semibold py-3 rounded-2xl hover:bg-green-700 disabled:opacity-60"
            >
              {addItemMutation.isPending
                ? "Adding..."
                : isNotesSection
                  ? "Add Notes"
                  : isMocktestSection
                    ? "Add Mock Test"
                    : "Add URL"}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
