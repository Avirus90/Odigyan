import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  Edit2,
  GraduationCap,
  Layers,
  Plus,
  Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Course, CourseId } from "../../backend.d.ts";
import { useActor } from "../../hooks/useActor";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";
import { useAdminCheck } from "./AdminDashboard";

type PriceType = "free" | "paid";
type CourseTag = "" | "new" | "hot" | "popular";

// Format: priceType|tag|price  (tag and price optional)
function encodeInstructorName(
  priceType: PriceType,
  tag: CourseTag,
  price: string,
) {
  const parts: string[] = [priceType];
  // always include tag slot so price position is stable
  parts.push(tag || "");
  if (priceType === "paid" && price.trim()) {
    parts.push(price.trim());
  }
  // trim trailing empty slots
  while (parts.length > 1 && parts[parts.length - 1] === "") parts.pop();
  return parts.join("|");
}

function parseInstructorName(instructorName: string): {
  priceType: PriceType;
  tag: CourseTag;
  price: string;
} {
  if (instructorName.includes("|")) {
    const parts = instructorName.split("|");
    return {
      priceType: (parts[0] || "free") as PriceType,
      tag: (parts[1] || "") as CourseTag,
      price: parts[2] || "",
    };
  }
  return {
    priceType: instructorName === "paid" ? "paid" : "free",
    tag: "",
    price: "",
  };
}

type CourseWithId = { id: bigint; course: Course };
// Suppress unused import warning for CourseId
type _CourseId = CourseId;

export default function AdminCourses() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();
  const { isAdmin, checking } = useAdminCheck();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<CourseWithId | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    thumbnailUrl: "",
    published: false,
    priceType: "free" as PriceType,
    tag: "" as CourseTag,
    price: "",
  });

  const coursesQuery = useQuery({
    queryKey: ["admin-courses-scan"],
    queryFn: async () => {
      if (!actor) return [];
      const total = await actor.getTotalCourses().catch(() => 0n);
      const totalNum = Number(total);
      if (totalNum === 0) return [];
      const max = totalNum + 20;
      const promises = Array.from({ length: max }, (_, i) => i + 1).map(
        async (id) => {
          try {
            const course = await actor.getCourse(BigInt(id));
            if (course) return { id: BigInt(id), course };
            return null;
          } catch {
            return null;
          }
        },
      );
      const results = await Promise.all(promises);
      return results.filter((r): r is NonNullable<typeof r> => r !== null);
    },
    enabled: !!actor && isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("No actor");
      const course: Course = {
        title: form.title,
        description: form.description,
        thumbnailUrl: form.thumbnailUrl,
        published: form.published,
        instructorName: encodeInstructorName(
          form.priceType,
          form.tag,
          form.price,
        ),
        category: 0n,
        creationDate: BigInt(Date.now()),
      };
      await actor.createCourse(course);
    },
    onSuccess: () => {
      toast.success("Course created!");
      void queryClient.invalidateQueries({ queryKey: ["admin-courses-scan"] });
      void queryClient.invalidateQueries({ queryKey: ["courses-with-ids"] });
      void queryClient.invalidateQueries({ queryKey: ["courses-scan"] });
      setShowModal(false);
    },
    onError: () => toast.error("Failed to create course."),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!actor || !editItem) throw new Error("No actor or item");
      const course: Course = {
        title: form.title,
        description: form.description,
        thumbnailUrl: form.thumbnailUrl,
        published: form.published,
        instructorName: encodeInstructorName(
          form.priceType,
          form.tag,
          form.price,
        ),
        category: 0n,
        creationDate: editItem.course.creationDate,
      };
      await actor.updateCourse(editItem.id, course);
    },
    onSuccess: () => {
      toast.success("Course updated!");
      void queryClient.invalidateQueries({ queryKey: ["admin-courses-scan"] });
      void queryClient.invalidateQueries({ queryKey: ["courses-with-ids"] });
      void queryClient.invalidateQueries({ queryKey: ["courses-scan"] });
      setShowModal(false);
      setEditItem(null);
    },
    onError: () => toast.error("Failed to update course."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      await actor.deleteCourse(id);
    },
    onSuccess: () => {
      toast.success("Course deleted!");
      void queryClient.invalidateQueries({ queryKey: ["admin-courses-scan"] });
      void queryClient.invalidateQueries({ queryKey: ["courses-with-ids"] });
      void queryClient.invalidateQueries({ queryKey: ["courses-scan"] });
    },
    onError: () => toast.error("Failed to delete course."),
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, course }: { id: bigint; course: Course }) => {
      if (!actor) throw new Error("No actor");
      await actor.updateCourse(id, { ...course, published: !course.published });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-courses-scan"] });
      void queryClient.invalidateQueries({ queryKey: ["courses-with-ids"] });
      void queryClient.invalidateQueries({ queryKey: ["courses-scan"] });
    },
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

  const courses = Array.isArray(coursesQuery.data) ? coursesQuery.data : [];

  function openCreate() {
    setEditItem(null);
    setForm({
      title: "",
      description: "",
      thumbnailUrl: "",
      published: false,
      priceType: "free",
      tag: "",
      price: "",
    });
    setShowModal(true);
  }

  function openEdit(item: CourseWithId) {
    const { priceType, tag, price } = parseInstructorName(
      item.course.instructorName,
    );
    setEditItem(item);
    setForm({
      title: item.course.title,
      description: item.course.description,
      thumbnailUrl: item.course.thumbnailUrl,
      published: item.course.published,
      priceType,
      tag,
      price,
    });
    setShowModal(true);
  }

  function handleSubmit() {
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    if (
      form.priceType === "paid" &&
      (!form.price.trim() || Number.isNaN(Number(form.price)))
    ) {
      toast.error("Please enter a valid price for paid course.");
      return;
    }
    if (editItem) updateMutation.mutate();
    else createMutation.mutate();
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Top bar */}
      <div className="bg-blue-700 px-4 py-4 flex items-center gap-3 shadow-sm">
        <Link to="/" className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-white" />
        </Link>
        <button
          type="button"
          onClick={() => void navigate({ to: "/admin" })}
          className="p-1 rounded-lg hover:bg-white/10"
        >
          <ChevronLeft className="h-5 w-5 text-white" />
        </button>
        <h1 className="font-display font-bold text-white text-base flex-1">
          Courses
        </h1>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-white text-blue-700 font-semibold text-sm px-3 py-1.5 rounded-xl hover:bg-blue-50 transition-colors"
        >
          <Plus className="h-4 w-4" /> New
        </button>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {coursesQuery.isLoading ? (
          [1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse"
            />
          ))
        ) : courses.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No courses yet. Create one!
          </div>
        ) : (
          courses.map(({ id, course }) => (
            <motion.div
              key={id.toString()}
              whileTap={{ scale: 0.99 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
            >
              <div className="flex items-start gap-3">
                {course.thumbnailUrl ? (
                  <img
                    src={course.thumbnailUrl}
                    alt=""
                    className="w-16 h-12 rounded-xl object-cover shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-16 h-12 rounded-xl bg-blue-100 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-semibold text-gray-900 text-sm line-clamp-1">
                    {course.title}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        course.published
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {course.published ? "Published" : "Draft"}
                    </span>
                    {(() => {
                      const { priceType, price } = parseInstructorName(
                        course.instructorName,
                      );
                      if (priceType === "paid") {
                        return (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                            {price ? `₹${price}` : "Paid"}
                          </span>
                        );
                      }
                      return (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                          Free
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => togglePublishMutation.mutate({ id, course })}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${
                      course.published
                        ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                        : "bg-green-100 text-green-700 hover:bg-green-200"
                    }`}
                  >
                    {course.published ? "Unpublish" : "Publish"}
                  </button>
                  <Link
                    to="/admin/courses/$id/content"
                    params={{ id: id.toString() }}
                  >
                    <button
                      type="button"
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"
                    >
                      <Layers className="h-4 w-4" />
                    </button>
                  </Link>
                  <button
                    type="button"
                    onClick={() => openEdit({ id, course })}
                    className="p-1.5 rounded-lg hover:bg-gray-100"
                  >
                    <Edit2 className="h-4 w-4 text-gray-500" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Delete this course?"))
                        deleteMutation.mutate(id);
                    }}
                    className="p-1.5 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
          >
            <h2 className="font-display font-bold text-gray-900 text-xl mb-4">
              {editItem ? "Edit Course" : "New Course"}
            </h2>
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-gray-600 mb-1 block">
                  Title *
                </span>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  id="course-title"
                  placeholder="Course title"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-600 mb-1 block">
                  Description
                </span>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  id="course-desc"
                  placeholder="Course description"
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-600 mb-1 block">
                  Thumbnail URL
                </span>
                <input
                  value={form.thumbnailUrl}
                  onChange={(e) =>
                    setForm({ ...form, thumbnailUrl: e.target.value })
                  }
                  id="course-thumb"
                  placeholder="https://..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="off"
                />
                {form.thumbnailUrl && (
                  <img
                    src={form.thumbnailUrl}
                    alt="Preview"
                    className="mt-2 rounded-xl w-full aspect-video object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <span className="text-xs font-semibold text-gray-600 mb-1 block">
                    Price
                  </span>
                  <div className="flex gap-2">
                    {(["free", "paid"] as PriceType[]).map((p) => (
                      <button
                        type="button"
                        key={p}
                        onClick={() =>
                          setForm({
                            ...form,
                            priceType: p,
                            price: p === "free" ? "" : form.price,
                          })
                        }
                        className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                          form.priceType === p
                            ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1">
                  <span className="text-xs font-semibold text-gray-600 mb-1 block">
                    Tag
                  </span>
                  <select
                    value={form.tag}
                    onChange={(e) =>
                      setForm({ ...form, tag: e.target.value as CourseTag })
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">None</option>
                    <option value="new">New</option>
                    <option value="hot">Hot</option>
                    <option value="popular">Popular</option>
                  </select>
                </div>
              </div>

              {/* Price amount — only for paid */}
              {form.priceType === "paid" && (
                <div>
                  <span className="text-xs font-semibold text-gray-600 mb-1 block">
                    Price Amount (₹) *
                  </span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-semibold">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={form.price}
                      onChange={(e) =>
                        setForm({ ...form, price: e.target.value })
                      }
                      placeholder="e.g. 499"
                      className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Students will be charged this amount via Razorpay before
                    enrolling.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">
                  Published
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setForm({ ...form, published: !form.published })
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.published ? "bg-blue-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      form.published ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditItem(null);
                }}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {isPending ? "Saving..." : editItem ? "Update" : "Create"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
