import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { BookOpen, ChevronLeft, Flame, Search, Star, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useActor } from "../hooks/useActor";
import { useStudentSession } from "../hooks/useStudentSession";

type CourseTag = "new" | "hot" | "popular" | "";
type PriceType = "free" | "paid";

function parseInstructorName(instructorName: string): {
  priceType: PriceType;
  tag: CourseTag;
  price: string;
} {
  if (instructorName.includes("|")) {
    const [priceRaw, tagRaw, priceVal] = instructorName.split("|");
    return {
      priceType: (priceRaw as PriceType) || "free",
      tag: (tagRaw as CourseTag) || "",
      price: priceVal || "",
    };
  }
  return { priceType: "free", tag: "", price: "" };
}

function CourseCard({
  courseId,
  course,
  isEnrolled,
}: {
  courseId: bigint;
  course: {
    title: string;
    thumbnailUrl: string;
    description: string;
    instructorName: string;
  };
  isEnrolled: boolean;
}) {
  const navigate = useNavigate();
  const { priceType, tag, price } = parseInstructorName(course.instructorName);

  function handleClick() {
    if (isEnrolled) {
      void navigate({
        to: "/courses/$id/content",
        params: { id: courseId.toString() },
      });
    } else {
      void navigate({
        to: "/courses/$id",
        params: { id: courseId.toString() },
      });
    }
  }

  function handleDetailClick(e: React.MouseEvent) {
    e.stopPropagation();
    void navigate({
      to: "/courses/$id",
      params: { id: courseId.toString() },
    });
  }

  return (
    <button type="button" onClick={handleClick} className="w-full text-left">
      <motion.div
        whileTap={{ scale: 0.97 }}
        className="bg-white rounded-2xl shadow-md border border-white hover:shadow-xl transition-shadow duration-200 overflow-hidden"
      >
        {/* Thumbnail — full image visible */}
        <div className="relative h-44 bg-gray-50 overflow-hidden">
          {course.thumbnailUrl ? (
            <img
              src={course.thumbnailUrl}
              alt={course.title}
              className="w-full h-full object-contain"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : null}
          {/* Bottom gradient + title overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 px-3 pb-2">
            <p className="text-sm font-bold text-white leading-tight line-clamp-2">
              {course.title}
            </p>
          </div>
          {/* Tag badge — top right */}
          {tag === "hot" && (
            <span className="absolute top-2 right-2 bg-red-500 text-white text-[11px] font-bold px-2 py-1 rounded-full flex items-center gap-0.5">
              <Flame className="h-2.5 w-2.5" /> Hot
            </span>
          )}
          {tag === "new" && (
            <span className="absolute top-2 right-2 bg-blue-500 text-white text-[11px] font-bold px-2 py-1 rounded-full flex items-center gap-0.5">
              <Zap className="h-2.5 w-2.5" /> New
            </span>
          )}
          {tag === "popular" && (
            <span className="absolute top-2 right-2 bg-purple-500 text-white text-[11px] font-bold px-2 py-1 rounded-full flex items-center gap-0.5">
              <Star className="h-2.5 w-2.5" /> Popular
            </span>
          )}
        </div>
        {/* Price + Detail */}
        <div className="px-3 py-2.5 flex items-center justify-between gap-2">
          <span
            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
              priceType === "free"
                ? "bg-emerald-500 text-white"
                : "bg-amber-500 text-white"
            }`}
          >
            {priceType === "free" ? "Free" : price ? `\u20B9${price}` : "Paid"}
          </span>
          <button
            type="button"
            onClick={handleDetailClick}
            className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full hover:bg-blue-100 transition-colors shrink-0"
          >
            Detail
          </button>
        </div>
      </motion.div>
    </button>
  );
}

export default function Courses() {
  const { actor, isFetching: actorLoading } = useActor();
  const { studentSession } = useStudentSession();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const coursesQuery = useQuery({
    queryKey: ["courses-scan"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.listCoursesWithIds().catch(() => []);
      return (Array.isArray(result) ? result : []).map(
        ([id, course]: [bigint, typeof course]) => ({ id, course }),
      );
    },
    enabled: !!actor,
    staleTime: 30_000,
    refetchOnMount: true,
  });

  // Use studentId-based enrollment check
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

  const allCourses = Array.isArray(coursesQuery.data) ? coursesQuery.data : [];
  const filtered = allCourses.filter(
    (c) =>
      c.course.published &&
      (search === "" ||
        c.course.title.toLowerCase().includes(search.toLowerCase())),
  );
  const enrolledIds = Array.isArray(enrolledQuery.data)
    ? enrolledQuery.data
    : [];

  const isLoading = actorLoading || coursesQuery.isLoading;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-6">
      {/* Header — sticky with blur */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <button
            type="button"
            onClick={() => void navigate({ to: "/" })}
            className="p-1.5 rounded-xl hover:bg-gray-100"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="font-display font-bold text-gray-900 text-base">
            All Courses
          </h1>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400" />
          <input
            type="text"
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-3 bg-blue-50 border-0 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
          />
        </div>
      </div>

      <div className="px-4 pt-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse"
              >
                <div className="h-44 bg-gray-200" />
                <div className="p-3">
                  <div className="h-3 bg-gray-200 rounded mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-2xl mb-3">
              <BookOpen className="h-7 w-7 text-blue-600" />
            </div>
            <p className="text-gray-500 text-sm">
              {search ? "No courses found." : "No courses available yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(({ id, course }) => (
              <CourseCard
                key={id.toString()}
                courseId={id}
                course={course}
                isEnrolled={enrolledIds.some((eid) => eid === id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
