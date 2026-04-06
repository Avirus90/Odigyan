import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  Image,
  Key,
  Library,
  Loader2,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useActor } from "../../hooks/useActor";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";

const ADMIN_PRINCIPAL =
  "dv2k6-c3qh4-4k2v5-bmmkn-74l43-6li64-ofmes-zzlgi-jck4z-g64pp-wae";

// ─── Admin Check Hook ────────────────────────────────────────────────────────────

export function useAdminCheck() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      const cached = localStorage.getItem("admin_check");
      if (cached) {
        const { principal, isAdminVal, expiry } = JSON.parse(cached) as {
          principal: string;
          isAdminVal: boolean;
          expiry: number;
        };
        if (
          principal === ADMIN_PRINCIPAL &&
          isAdminVal &&
          Date.now() < expiry
        ) {
          return true;
        }
      }
    } catch {
      // ignore
    }
    return false;
  });
  const [checking, setChecking] = useState(() => {
    try {
      const cached = localStorage.getItem("admin_check");
      if (cached) {
        const { principal, isAdminVal, expiry } = JSON.parse(cached) as {
          principal: string;
          isAdminVal: boolean;
          expiry: number;
        };
        if (
          principal === ADMIN_PRINCIPAL &&
          isAdminVal &&
          Date.now() < expiry
        ) {
          return false;
        }
      }
    } catch {
      // ignore
    }
    return true;
  });

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!actor || !identity) {
        if (!cancelled) {
          setChecking(false);
          setIsAdmin(false);
        }
        return;
      }
      try {
        const principalStr = identity.getPrincipal().toString();

        const cached = localStorage.getItem("admin_check");
        if (cached) {
          const { principal, isAdminVal, expiry } = JSON.parse(cached) as {
            principal: string;
            isAdminVal: boolean;
            expiry: number;
          };
          if (principal === principalStr && Date.now() < expiry) {
            if (!cancelled) {
              setIsAdmin(isAdminVal);
              setChecking(false);
            }
            return;
          }
        }

        if (principalStr === ADMIN_PRINCIPAL) {
          await actor.assignCallerUserRole(
            identity.getPrincipal(),
            "admin" as never,
          );
          if (!cancelled) {
            setIsAdmin(true);
            setChecking(false);
            localStorage.setItem(
              "admin_check",
              JSON.stringify({
                principal: principalStr,
                isAdminVal: true,
                expiry: Date.now() + 30 * 24 * 60 * 60 * 1000,
              }),
            );
          }
          return;
        }

        const adminResult = await actor.isCallerAdmin();
        if (!cancelled) {
          setIsAdmin(adminResult);
          setChecking(false);
          localStorage.setItem(
            "admin_check",
            JSON.stringify({
              principal: principalStr,
              isAdminVal: adminResult,
              expiry: Date.now() + 30 * 24 * 60 * 60 * 1000,
            }),
          );
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
          setChecking(false);
        }
      }
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, [actor, identity]);

  return { isAdmin, checking };
}

// ─── Banner Slide Types ────────────────────────────────────────────────────────────

interface BannerSlide {
  imageUrl: string;
  linkedCourseId: string;
  tagline: string;
}

const DEFAULT_SLIDES: BannerSlide[] = [
  {
    imageUrl: "",
    linkedCourseId: "",
    tagline: "🚀 Rising — Odisha's Best Learning Platform",
  },
];

function parseSlides(raw: string): BannerSlide[] {
  try {
    if (raw) {
      const parsed = JSON.parse(raw) as BannerSlide[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_SLIDES;
}

// ─── Banner Modal ────────────────────────────────────────────────────────────────────

function BannerModal({
  onClose,
  courses,
  actor,
  initialSlides,
}: {
  onClose: () => void;
  courses: { id: bigint; title: string }[];
  actor: any;
  initialSlides: BannerSlide[];
}) {
  const [slides, setSlides] = useState<BannerSlide[]>(() =>
    initialSlides.length > 0 ? initialSlides : DEFAULT_SLIDES,
  );
  const [activeTab, setActiveTab] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  function addSlide() {
    setSlides((prev) => [
      ...prev,
      {
        imageUrl: "",
        linkedCourseId: "",
        tagline: "🚀 Rising — Odisha's Best Learning Platform",
      },
    ]);
    setActiveTab(slides.length);
  }

  function removeSlide(idx: number) {
    if (slides.length === 1) {
      toast.error("At least one slide is required.");
      return;
    }
    setSlides((prev) => prev.filter((_, i) => i !== idx));
    setActiveTab((prev) => Math.min(prev, slides.length - 2));
  }

  function updateSlide(idx: number, field: keyof BannerSlide, value: string) {
    setSlides((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    );
  }

  async function save() {
    setIsSaving(true);
    try {
      const json = JSON.stringify(slides);
      const result = (await actor.saveBannerSlides(json)) as
        | { ok: null }
        | { err: string };
      if ("ok" in result) {
        // Also save to localStorage as fallback for immediate display
        localStorage.setItem("odg_banner_slides", json);
        toast.success(
          "Banner slides saved! Changes are now visible to all users.",
        );
        onClose();
      } else {
        toast.error(
          (result as { err: string }).err ?? "Failed to save banner settings.",
        );
      }
    } catch {
      toast.error("Failed to save banner settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const current = slides[activeTab] ?? slides[0];

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: modal backdrop dismiss
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        data-ocid="banner.modal"
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-gray-900 text-lg">
              Banner Slides
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-gray-100"
              data-ocid="banner.close_button"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
            {slides.map((_, i) => (
              <button
                // biome-ignore lint/suspicious/noArrayIndexKey: slide tabs use stable positional keys
                key={i}
                type="button"
                onClick={() => setActiveTab(i)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === i
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                data-ocid="banner.tab"
              >
                Slide {i + 1}
              </button>
            ))}
            <button
              type="button"
              onClick={addSlide}
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
              data-ocid="banner.secondary_button"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>

          {current && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                  Banner Image URL
                </Label>
                <Input
                  value={current.imageUrl}
                  onChange={(e) =>
                    updateSlide(activeTab, "imageUrl", e.target.value)
                  }
                  placeholder="https://example.com/banner.jpg"
                  className="text-sm"
                  data-ocid="banner.input"
                />
                {current.imageUrl && (
                  <div className="mt-2 rounded-xl overflow-hidden h-16 bg-gray-100">
                    <img
                      src={current.imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
                {!current.imageUrl && (
                  <p className="text-xs text-gray-400 mt-1">
                    Leave blank to show the default blue gradient banner
                  </p>
                )}
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                  Tagline (shown over image)
                </Label>
                <Input
                  value={current.tagline}
                  onChange={(e) =>
                    updateSlide(activeTab, "tagline", e.target.value)
                  }
                  placeholder="🚀 Rising — Odisha's Best Learning Platform"
                  className="text-sm"
                  data-ocid="banner.input"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Shown at the bottom of the banner image
                </p>
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                  Banner Click → Course
                </Label>
                <select
                  value={current.linkedCourseId}
                  onChange={(e) =>
                    updateSlide(activeTab, "linkedCourseId", e.target.value)
                  }
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-ocid="banner.select"
                >
                  <option value="">— No link (not clickable) —</option>
                  {courses.map((c) => (
                    <option key={c.id.toString()} value={c.id.toString()}>
                      {c.title}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Clicking this banner slide will open this course
                </p>
              </div>

              {slides.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSlide(activeTab)}
                  className="flex items-center gap-1.5 text-red-500 text-sm font-medium hover:text-red-700 transition-colors mt-1"
                  data-ocid="banner.delete_button"
                >
                  <Trash2 className="h-4 w-4" /> Remove this slide
                </button>
              )}
            </div>
          )}

          <Button
            onClick={() => void save()}
            disabled={isSaving}
            className="w-full mt-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            data-ocid="banner.save_button"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              "Save Banner Slides"
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Secret Login Modal ───────────────────────────────────────────────────────────

function SecretLoginModal({ onClose }: { onClose: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("odg_secret_creds");
      if (raw) {
        const parsed = JSON.parse(raw) as {
          username: string;
          password: string;
        };
        if (parsed.username) setUsername(parsed.username);
        if (parsed.password) setPassword(parsed.password);
      }
    } catch {
      // ignore
    }
  }, []);

  function save() {
    if (!username.trim() || !password.trim()) {
      toast.error("Username and password cannot be empty.");
      return;
    }
    localStorage.setItem(
      "odg_secret_creds",
      JSON.stringify({ username: username.trim(), password: password.trim() }),
    );
    toast.success("Credentials updated");
    onClose();
  }

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: modal backdrop dismiss
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        data-ocid="secret_login.modal"
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="bg-amber-100 rounded-xl p-2">
                <Key className="h-5 w-5 text-amber-600" />
              </div>
              <h2 className="font-display font-bold text-gray-900 text-lg">
                Admin Secret Credentials
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-gray-100"
              data-ocid="secret_login.close_button"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <p className="text-xs text-gray-500 mb-5 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            These credentials reveal the admin login button on the login page.
          </p>

          <div className="space-y-4">
            <div>
              <Label
                htmlFor="secret-cred-username"
                className="text-sm font-semibold text-gray-700 mb-1.5 block"
              >
                Username
              </Label>
              <Input
                id="secret-cred-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                autoComplete="off"
                data-ocid="secret_login.input"
              />
            </div>
            <div>
              <Label
                htmlFor="secret-cred-password"
                className="text-sm font-semibold text-gray-700 mb-1.5 block"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="secret-cred-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="off"
                  data-ocid="secret_login.input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  data-ocid="secret_login.toggle"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <Button
            onClick={save}
            className="w-full mt-5 bg-amber-500 hover:bg-amber-600 text-white font-semibold"
            data-ocid="secret_login.save_button"
          >
            Save Credentials
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Admin Dashboard ─────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const { isAdmin, checking } = useAdminCheck();
  const { actor } = useActor();
  const [bannerOpen, setBannerOpen] = useState(false);
  const [secretLoginOpen, setSecretLoginOpen] = useState(false);

  const bannerSlidesQuery = useQuery({
    queryKey: ["banner-slides"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        const raw = (await (actor as any).getBannerSlides()) as string;
        return parseSlides(raw);
      } catch {
        return [];
      }
    },
    enabled: !!actor,
  });

  const statsQuery = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      if (!actor) return { courses: 0n, students: 0n };
      const [courses, students] = await Promise.all([
        actor.getTotalCourses().catch(() => 0n),
        actor.getTotalStudents().catch(() => 0n),
      ]);
      return { courses, students };
    },
    enabled: !!actor && isAdmin,
  });

  const coursesQuery = useQuery({
    queryKey: ["admin-courses-list"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.listCoursesWithIds().catch(() => []);
      return (Array.isArray(result) ? result : []).map(
        ([id, course]: [bigint, { title: string }]) => ({
          id,
          title: course.title,
        }),
      );
    },
    enabled: !!actor && isAdmin,
  });

  if (!identity) {
    void navigate({ to: "/login" });
    return null;
  }
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <p className="text-gray-500 mb-4">You don't have admin access.</p>
        <Link to="/" className="text-blue-600 font-medium">
          Go Home
        </Link>
      </div>
    );
  }

  const stats = statsQuery.data ?? { courses: 0n, students: 0n };

  const tiles = [
    {
      label: "Courses",
      icon: BookOpen,
      to: "/admin/courses",
      subtitle: "Manage courses",
      color: "bg-blue-100 text-blue-600",
      action: null,
    },
    {
      label: "Students",
      icon: Users,
      to: "/admin/students",
      subtitle: "View enrollments",
      color: "bg-green-100 text-green-600",
      action: null,
    },
    {
      label: "Media Library",
      icon: Library,
      to: "/admin/media",
      subtitle: "Manage content",
      color: "bg-purple-100 text-purple-600",
      action: null,
    },
    {
      label: "Notes Template",
      icon: FileText,
      to: "/admin/template",
      subtitle: "Sample format guide",
      color: "bg-teal-100 text-teal-600",
      action: null,
    },
    {
      label: "Banner",
      icon: Image,
      to: null,
      subtitle: "Manage banner slides",
      color: "bg-orange-100 text-orange-600",
      action: () => setBannerOpen(true),
      ocid: "banner.open_modal_button",
    },
    {
      label: "Secret Login",
      icon: Key,
      to: null,
      subtitle: "Set admin credentials",
      color: "bg-amber-100 text-amber-600",
      action: () => setSecretLoginOpen(true),
      ocid: "secret_login.open_modal_button",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Top bar */}
      <div className="bg-blue-700 px-4 py-4 flex items-center justify-between shadow-sm">
        <Link to="/" className="flex items-center gap-2">
          <div className="bg-white/20 rounded-lg p-1">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="font-display font-bold text-white text-lg">
            OdiGyan
          </span>
        </Link>
        <span className="text-white/80 text-sm font-medium">Admin Panel</span>
      </div>

      <div className="px-4 pt-6">
        {/* Stats strip */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-blue-600 rounded-2xl p-4 text-white">
            <p className="font-display font-bold text-2xl">
              {stats.courses.toString()}
            </p>
            <p className="text-blue-100 text-xs font-medium mt-0.5">
              Total Courses
            </p>
          </div>
          <div className="bg-indigo-600 rounded-2xl p-4 text-white">
            <p className="font-display font-bold text-2xl">
              {stats.students.toString()}
            </p>
            <p className="text-indigo-100 text-xs font-medium mt-0.5">
              Total Students
            </p>
          </div>
        </div>

        <h2 className="font-display font-bold text-gray-900 text-base mb-3">
          Dashboard
        </h2>

        {/* 2-col grid of tiles */}
        <div className="grid grid-cols-2 gap-3">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            const inner = (
              <motion.div
                whileTap={{ scale: 0.97 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-start gap-3 hover:shadow-md hover:border-blue-100 transition-all h-full"
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${tile.color}`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-display font-semibold text-gray-900 text-sm">
                    {tile.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {tile.subtitle}
                  </p>
                </div>
              </motion.div>
            );

            if (tile.action) {
              return (
                <button
                  key={tile.label}
                  type="button"
                  onClick={tile.action}
                  className="text-left"
                  data-ocid={tile.ocid ?? "admin.open_modal_button"}
                >
                  {inner}
                </button>
              );
            }

            return (
              <Link key={tile.label} to={tile.to!}>
                {inner}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Banner Modal */}
      <AnimatePresence>
        {bannerOpen && (
          <BannerModal
            onClose={() => setBannerOpen(false)}
            courses={coursesQuery.data ?? []}
            actor={actor}
            initialSlides={bannerSlidesQuery.data ?? []}
          />
        )}
      </AnimatePresence>

      {/* Secret Login Modal */}
      <AnimatePresence>
        {secretLoginOpen && (
          <SecretLoginModal onClose={() => setSecretLoginOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
