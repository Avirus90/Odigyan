import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  ChevronLeft,
  ClipboardList,
  ExternalLink,
  FileText,
  Folder,
  GraduationCap,
  Landmark,
  Newspaper,
  Plus,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { ContentFolder, ContentItem } from "../../types/content";
import { useActor } from "../../hooks/useActor";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";
import { useAdminCheck } from "./AdminDashboard";

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

export default function AdminMedia() {
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
  const [folderName, setFolderName] = useState("");
  const [urlName, setUrlName] = useState("");
  const [urlValue, setUrlValue] = useState("");

  const foldersQuery = useQuery({
    queryKey: ["media-folders", selectedSection],
    queryFn: async () => {
      if (!actor || !selectedSection) return [];
      return await actor.listContentFolders(null, selectedSection);
    },
    enabled: !!actor && !!selectedSection && isAdmin,
  });

  const itemsQuery = useQuery({
    queryKey: ["media-items", selectedSection, selectedFolder?.id ?? null],
    queryFn: async () => {
      if (!actor || !selectedSection || !selectedFolder) return [];
      return await actor.listContentItems(
        null,
        selectedSection,
        selectedFolder.id,
      );
    },
    enabled: !!actor && !!selectedSection && !!selectedFolder && isAdmin,
  });

  const addFolderMutation = useMutation({
    mutationFn: async () => {
      if (!actor || !selectedSection) throw new Error("No actor");
      const rawFolders = Array.isArray(foldersQuery.data)
        ? foldersQuery.data
        : [];
      const folder: ContentFolder = {
        id: crypto.randomUUID(),
        name: folderName,
        icon: "folder",
        sectionType: selectedSection,
        courseId: undefined,
        parentId: selectedFolder ? selectedFolder.id : undefined,
        order: BigInt(rawFolders.length),
        createdAt: BigInt(Date.now()),
      };
      await actor.createContentFolder(folder);
    },
    onSuccess: () => {
      toast.success("Folder added!");
      void queryClient.invalidateQueries({
        queryKey: ["media-folders", selectedSection],
      });
      setShowFolderModal(false);
      setFolderName("");
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
        queryKey: ["media-folders", selectedSection],
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
        courseId: undefined,
        folderId: selectedFolder.id,
        order: BigInt(rawItems.length),
        createdAt: BigInt(Date.now()),
      };
      await actor.createContentItem(item);
    },
    onSuccess: () => {
      toast.success("URL added!");
      void queryClient.invalidateQueries({
        queryKey: ["media-items", selectedSection, selectedFolder?.id ?? null],
      });
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
        queryKey: ["media-items", selectedSection, selectedFolder?.id ?? null],
      });
    },
    onError: () => toast.error("Failed to delete URL."),
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

  if (!selectedSection) {
    return (
      <div className="min-h-screen bg-gray-50 pb-8">
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
          <h1 className="font-bold text-white text-base">Media Library</h1>
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
              <Plus className="h-4 w-4" /> Add URL
            </button>
          )}
        </div>

        {visibleFolders.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[...visibleFolders]
              .sort(
                (a: ContentFolder, b: ContentFolder) =>
                  Number(a.order) - Number(b.order),
              )
              .map((folder: ContentFolder) => (
                <motion.div
                  key={folder.id}
                  whileTap={{ scale: 0.96 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col items-center gap-2 relative"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedFolder(folder)}
                    className="flex flex-col items-center gap-2 w-full"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Folder className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 text-center line-clamp-2">
                      {folder.name}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Delete folder?"))
                        deleteFolderMutation.mutate(folder.id);
                    }}
                    className="absolute top-2 right-2 p-1 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </button>
                </motion.div>
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
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <ExternalLink className="h-4 w-4 text-blue-600" />
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-sm text-gray-800 font-medium line-clamp-1 hover:text-blue-600"
                  >
                    {item.name}
                  </a>
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
                No URLs yet.
              </p>
            )}
          </div>
        )}
        {visibleFolders.length === 0 && !selectedFolder && (
          <p className="text-center text-gray-400 text-sm py-8">
            No folders yet.
          </p>
        )}
      </div>

      {showFolderModal && (
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
                onClick={() => setShowFolderModal(false)}
                className="p-1.5 rounded-xl hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <button
              type="button"
              onClick={() => {
                if (folderName.trim()) addFolderMutation.mutate();
                else toast.error("Name required.");
              }}
              disabled={addFolderMutation.isPending}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-2xl hover:bg-blue-700 disabled:opacity-60"
            >
              {addFolderMutation.isPending ? "Adding..." : "Add Folder"}
            </button>
          </motion.div>
        </div>
      )}

      {showUrlModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-3xl w-full max-w-sm p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Add URL</h2>
              <button
                type="button"
                onClick={() => setShowUrlModal(false)}
                className="p-1.5 rounded-xl hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 mb-4">
              <input
                value={urlName}
                onChange={(e) => setUrlName(e.target.value)}
                placeholder="Name"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder="URL (https://...)"
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
              {addItemMutation.isPending ? "Adding..." : "Add URL"}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
