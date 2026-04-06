import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Flame,
  Star,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useActor } from "../hooks/useActor";
import { useStudentSession } from "../hooks/useStudentSession";

type CourseTag = "new" | "hot" | "popular" | "";
type PriceType = "free" | "paid";

// ─── Banner Types ─────────────────────────────────────────────────────────────────────

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

function parseBannerSlides(raw: string): BannerSlide[] {
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

// ─── Course Card ─────────────────────────────────────────────────────────────────────

function parseInstructorName(instructorName: string): {
  priceType: PriceType;
  tag: CourseTag;
  price: string;
} {
  if (instructorName.includes("|")) {
    const parts = instructorName.split("|");
    return {
      priceType: (parts[0] as PriceType) || "free",
      tag: (parts[1] as CourseTag) || "",
      price: parts[2] || "",
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
    published: boolean;
  };
  isEnrolled: boolean;
}) {
  const navigate = useNavigate();
  const { priceType, tag, price } = parseInstructorName(course.instructorName);

  function handleCardClick() {
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
    <button
      type="button"
      onClick={handleCardClick}
      className="w-full text-left"
    >
      <motion.div
        whileTap={{ scale: 0.97 }}
        className="bg-white rounded-2xl shadow-md border border-white hover:shadow-xl transition-shadow duration-200 overflow-hidden"
      >
        {/* Thumbnail */}
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
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 px-3 pb-2">
            <p className="text-sm font-bold text-white leading-tight line-clamp-2">
              {course.title}
            </p>
          </div>
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
        {/* Bottom: price + detail */}
        <div className="px-3 py-2.5 flex items-center justify-between gap-2">
          <span
            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
              priceType === "free"
                ? "bg-emerald-500 text-white"
                : "bg-green-600 text-white"
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

// ─── Multi-Slide Hero Banner ─────────────────────────────────────────────────────────

function HeroBanner({
  slides,
  onCourseClick,
}: {
  slides: BannerSlide[];
  onCourseClick: (courseId: string) => void;
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const touchStartX = useRef(0);
  const autoSlideTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = slides.length;

  const goTo = useCallback(
    (idx: number, dir = 1) => {
      setDirection(dir);
      setCurrentSlide(((idx % total) + total) % total);
    },
    [total],
  );

  const next = useCallback(() => {
    goTo(currentSlide + 1, 1);
  }, [currentSlide, goTo]);

  const prev = useCallback(() => {
    goTo(currentSlide - 1, -1);
  }, [currentSlide, goTo]);

  // Auto-slide every 4 seconds
  useEffect(() => {
    if (total <= 1) return;
    autoSlideTimer.current = setInterval(() => {
      next();
    }, 4000);
    return () => {
      if (autoSlideTimer.current) clearInterval(autoSlideTimer.current);
    };
  }, [next, total]);

  function resetAutoSlide() {
    if (autoSlideTimer.current) clearInterval(autoSlideTimer.current);
    autoSlideTimer.current = setInterval(() => next(), 4000);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) {
      if (dx < 0) {
        next();
      } else {
        prev();
      }
      resetAutoSlide();
    }
  }

  const slide = slides[currentSlide];
  const hasImage = !!slide.imageUrl;
  const isClickable = !!slide.linkedCourseId;

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full px-4 pt-4 pb-2"
    >
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ height: 200 }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Slide content */}
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            {/* Background */}
            {hasImage ? (
              <img
                src={slide.imageUrl}
                alt={`Banner ${currentSlide + 1}`}
                className="w-full h-full object-cover"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
              />
            ) : (
              <div
                className="w-full h-full"
                style={{
                  background:
                    "linear-gradient(135deg, #0f2d6b 0%, #1a4db5 50%, #1d68e0 100%)",
                }}
              >
                {/* Decorative glow */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(circle at 70% 50%, rgba(255,255,255,0.10), transparent 60%)",
                  }}
                />
                {/* OdiGyan title on placeholder */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <BookOpen className="h-14 w-14 text-white/20 mb-3" />
                  <h1 className="font-display text-3xl font-bold text-white tracking-tight">
                    OdiGyan
                  </h1>
                  <p className="text-blue-200 text-sm mt-1">
                    {slide.tagline ||
                      "\uD83D\uDE80 Rising — Odisha's Best Learning Platform"}
                  </p>
                </div>
              </div>
            )}

            {/* Tagline overlay on image slides — admin only, hidden for students */}
            {hasImage && slide.tagline && (
              <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-black/60 to-transparent">
                <p className="text-white text-xs font-semibold">
                  {slide.tagline}
                </p>
              </div>
            )}

            {/* Clickable area */}
            {isClickable && (
              <button
                type="button"
                className="absolute inset-0 w-full h-full"
                onClick={() => onCourseClick(slide.linkedCourseId)}
                aria-label="Open course"
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Arrow navigation — only if multiple slides */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => {
                prev();
                resetAutoSlide();
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white z-10 transition-colors"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                next();
                resetAutoSlide();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white z-10 transition-colors"
              aria-label="Next slide"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {total > 1 && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10">
            {slides.map((slide, i) => (
              <button
                key={`dot-${slide.imageUrl || "blank"}-${i}`}
                type="button"
                onClick={() => {
                  goTo(i, i > currentSlide ? 1 : -1);
                  resetAutoSlide();
                }}
                className={`rounded-full transition-all duration-300 ${
                  i === currentSlide
                    ? "w-5 h-2 bg-white"
                    : "w-2 h-2 bg-white/50"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Landing Page ─────────────────────────────────────────────────────────────────────

export default function Landing() {
  const { actor, isFetching: actorLoading } = useActor();
  const { studentSession } = useStudentSession();
  const navigate = useNavigate();
  const bannerQuery = useQuery({
    queryKey: ["banner-slides"],
    queryFn: async () => {
      if (!actor) return DEFAULT_SLIDES;
      try {
        const raw = (await (actor as any).getBannerSlides()) as string;
        return parseBannerSlides(raw);
      } catch {
        return DEFAULT_SLIDES;
      }
    },
    enabled: !!actor,
    staleTime: 30_000,
  });

  const bannerSlides = bannerQuery.data ?? DEFAULT_SLIDES;

  const coursesQuery = useQuery({
    queryKey: ["courses-with-ids"],
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
  const featuredCourses = allCourses.filter((c) => c.course.published);
  const enrolledIds = Array.isArray(enrolledQuery.data)
    ? enrolledQuery.data
    : [];

  const isLoading = actorLoading || coursesQuery.isLoading;

  function handleBannerCourseClick(courseId: string) {
    void navigate({ to: "/courses/$id", params: { id: courseId } });
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      {/* Hero Banner */}
      <HeroBanner
        slides={bannerSlides}
        onCourseClick={handleBannerCourseClick}
      />

      {/* Featured Courses */}
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-bold text-gray-900">
            Featured Courses
          </h2>
          <button
            type="button"
            onClick={() => void navigate({ to: "/courses" })}
            className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full hover:bg-blue-100 transition-colors"
          >
            See all
          </button>
        </div>

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
        ) : featuredCourses.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-2xl mb-3">
              <BookOpen className="h-7 w-7 text-blue-600" />
            </div>
            <p className="text-gray-500 text-sm">
              No courses yet. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {featuredCourses.map(({ id, course }) => (
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
