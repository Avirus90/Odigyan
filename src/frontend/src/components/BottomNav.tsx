import { Link, useRouter } from "@tanstack/react-router";
import { BookOpen, Home, User } from "lucide-react";

const tabs = [
  { label: "Home", icon: Home, to: "/" },
  { label: "Courses", icon: BookOpen, to: "/courses" },
  { label: "Profile", icon: User, to: "/login" },
];

export default function BottomNav() {
  const router = useRouter();
  const pathname = router.state.location.pathname;

  // Hide on course content pages (section/item views)
  if (pathname.includes("/content")) return null;

  return (
    <div
      id="bottom-nav-bar"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden"
    >
      <div
        className="flex items-center gap-1 bg-white/95 backdrop-blur-md rounded-full border border-gray-100 px-2 py-1.5"
        style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            tab.to === "/" ? pathname === "/" : pathname.startsWith(tab.to);
          return (
            <Link key={tab.to} to={tab.to}>
              <div
                className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-full transition-all active:scale-95 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-gray-700"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[11px] font-bold">{tab.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
