import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  BookOpen,
  ChevronLeft,
  ClipboardList,
  FileText,
  Globe,
  Landmark,
  Newspaper,
  Video,
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { useStudentSession } from "../hooks/useStudentSession";

const RAZORPAY_KEY = "rzp_live_SYADhzyhslVmtS";

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

function parseInstructorName(instructorName: string) {
  if (instructorName.includes("|")) {
    const parts = instructorName.split("|");
    return {
      priceType: parts[0] || "free",
      tag: parts[1] || "",
      price: parts[2] || "",
    };
  }
  return {
    priceType: instructorName === "paid" ? "paid" : "free",
    tag: "",
    price: "",
  };
}

// Load Razorpay script dynamically
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as unknown as Record<string, unknown>).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CourseDetail() {
  const params = useParams({ from: "/public/courses/$id" });
  const courseId = BigInt(params.id);
  const { actor } = useActor();
  const { studentSession } = useStudentSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const courseQuery = useQuery({
    queryKey: ["course", params.id],
    queryFn: async () => {
      if (!actor) return null;
      return await actor.getCourse(courseId);
    },
    enabled: !!actor,
  });

  // Use studentId-based enrollment check (no Internet Identity needed)
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

  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      if (!studentSession?.studentId) throw new Error("Not logged in");
      await (actor as any).enrollByStudentId(
        studentSession.studentId,
        courseId,
      );
    },
    onSuccess: () => {
      toast.success("Enrolled successfully!");
      void queryClient.invalidateQueries({
        queryKey: ["enrolled-student", studentSession?.studentId ?? ""],
      });
      // Direct redirect to course content after enrollment
      void navigate({
        to: "/courses/$id/content",
        params: { id: params.id },
      });
    },
    onError: () => toast.error("Enrollment failed. Please try again."),
  });

  const course = courseQuery.data;
  const enrolledIds = Array.isArray(enrolledQuery.data)
    ? enrolledQuery.data
    : [];
  const isEnrolled = enrolledIds.some((id) => id === courseId);
  const { priceType, price } = course
    ? parseInstructorName(course.instructorName)
    : { priceType: "free", price: "" };

  async function handleEnroll() {
    if (!studentSession) {
      void navigate({ to: "/login" });
      return;
    }

    if (priceType === "paid" && price) {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Payment gateway failed to load. Please try again.");
        return;
      }

      const amountInPaise = Math.round(Number(price) * 100);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay({
        key: RAZORPAY_KEY,
        amount: amountInPaise,
        currency: "INR",
        name: "OdiGyan",
        description: course?.title ?? "Course Enrollment",
        image: course?.thumbnailUrl || undefined,
        theme: { color: "#1d4ed8" },
        handler: async () => {
          // Payment successful — enroll the student (redirect happens in onSuccess)
          enrollMutation.mutate();
        },
        modal: {
          ondismiss: () => {
            toast.info("Payment cancelled.");
          },
        },
      });
      rzp.open();
    } else {
      // Free course — enroll directly (redirect happens in onSuccess)
      enrollMutation.mutate();
    }
  }

  if (courseQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <p className="text-gray-500 mb-4">Course not found.</p>
        <Link to="/courses" className="text-blue-600 font-medium">
          Back to Courses
        </Link>
      </div>
    );
  }

  // Split description on "@" for line-by-line rendering
  const descriptionLines = course.description.includes("@")
    ? course.description.split("@").filter((l) => l.trim())
    : null;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-6">
      {/* Back button */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void navigate({ to: "/courses" })}
          className="p-1.5 rounded-xl hover:bg-gray-100"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h1 className="font-display font-bold text-gray-900 text-base line-clamp-1">
          {course.title}
        </h1>
      </div>

      {/* Thumbnail with gradient overlay */}
      <div className="relative aspect-video bg-gradient-to-br from-blue-500 to-blue-700 w-full">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="w-full h-full object-cover"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Globe className="h-16 w-16 text-white/30" />
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {/* Title over image */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
          <h2 className="font-display font-bold text-white text-2xl leading-tight">
            {course.title}
          </h2>
        </div>
        {/* Price badge — top right */}
        <div className="absolute top-4 right-4">
          <span
            className={`text-sm font-bold px-3 py-1.5 rounded-xl shadow-lg backdrop-blur-sm ${
              priceType === "free"
                ? "bg-white/95 text-emerald-700"
                : "bg-green-500 text-white"
            }`}
          >
            {priceType === "free" ? "Free" : price ? `\u20B9${price}` : "Paid"}
          </span>
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Description — split on @ for line-by-line rendering */}
        {descriptionLines ? (
          <div className="text-gray-600 text-[15px] leading-relaxed mb-5 space-y-1">
            {descriptionLines.map((line) => (
              <p key={line}>{line.trim()}</p>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 text-[15px] leading-relaxed mb-5">
            {course.description}
          </p>
        )}

        {/* Section previews */}
        <h3 className="font-display font-bold text-gray-900 text-base mb-3">
          Course Content
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.id}
                whileTap={{ scale: 0.96 }}
                className="bg-white border border-gray-100 shadow-sm rounded-2xl p-0 overflow-hidden hover:shadow-md hover:border-blue-100 transition-all"
              >
                <div
                  className={`h-20 flex items-center justify-center ${section.bgColor}`}
                >
                  <div className={`rounded-xl p-3 mb-1 ${section.bgColor}`}>
                    <Icon className={`h-8 w-8 ${section.iconColor}`} />
                  </div>
                </div>
                <div className="py-2.5 px-2 text-center">
                  <span className="text-xs font-semibold text-gray-700">
                    {section.label}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Price info for paid courses */}
        {priceType === "paid" && !isEnrolled && price && (
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
            <span className="text-2xl font-bold text-green-600">
              \u20B9{price}
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                One-time Payment
              </p>
              <p className="text-xs text-gray-500">
                Lifetime access after payment
              </p>
            </div>
          </div>
        )}

        {/* Enroll / Access Course */}
        {!studentSession ? (
          <Link
            to="/login"
            className="block w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-center py-4 rounded-2xl text-base shadow-md hover:shadow-lg transition-shadow"
          >
            Login to Enroll
          </Link>
        ) : isEnrolled ? (
          <button
            type="button"
            onClick={() =>
              void navigate({
                to: "/courses/$id/content",
                params: { id: params.id },
              })
            }
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-4 rounded-2xl text-base shadow-md hover:shadow-lg transition-shadow"
          >
            Open Course
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleEnroll()}
            disabled={enrollMutation.isPending}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-4 rounded-2xl text-base shadow-md hover:shadow-lg transition-shadow disabled:opacity-60"
          >
            {enrollMutation.isPending
              ? "Enrolling..."
              : priceType === "paid" && price
                ? `Pay \u20B9${price} & Enroll`
                : "Enroll Now"}
          </button>
        )}
      </div>
    </div>
  );
}
