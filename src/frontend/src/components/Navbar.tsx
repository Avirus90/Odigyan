import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useStudentSession } from "../hooks/useStudentSession";
import { useAdminCheck } from "../pages/admin/AdminDashboard";

export default function Navbar() {
  const { identity, clear, isLoggingIn } = useInternetIdentity();
  const { studentSession, clearStudentSession } = useStudentSession();
  const navigate = useNavigate();
  const { isAdmin } = useAdminCheck();

  const handleLogout = () => {
    if (studentSession) {
      clearStudentSession();
    }
    if (identity) {
      clear();
      localStorage.removeItem("admin_check");
    }
    void navigate({ to: "/login" });
  };

  const isLoggedIn = !!studentSession || !!identity;

  return (
    <nav
      className="sticky top-0 z-50 bg-white border-b border-gray-100"
      style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
    >
      <div className="flex items-center justify-between h-14 px-4">
        <Link to="/" className="flex items-center gap-2" data-ocid="nav.link">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-1.5">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="font-display font-bold text-lg text-gray-900 tracking-tight">
            OdiGyan
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {isLoggedIn ? (
            <>
              {isAdmin && identity && (
                <Link to="/admin">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-blue-600 text-white hover:bg-blue-700 rounded-xl px-3 h-8 text-sm font-semibold gap-1"
                  >
                    <Settings className="h-4 w-4" /> Admin
                  </Button>
                </Link>
              )}
              {studentSession && (
                <div className="flex items-center gap-1.5 px-2.5 h-8 rounded-xl bg-blue-50">
                  <User className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-xs font-medium text-blue-700 max-w-[80px] truncate">
                    {studentSession.name.split(" ")[0]}
                  </span>
                </div>
              )}
              <Link to="/courses">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:bg-gray-50 h-8 px-2.5 text-sm gap-1 rounded-xl"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Courses</span>
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl p-1.5 h-auto"
                data-ocid="nav.button"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-600 font-semibold hover:bg-blue-50 h-8 px-3 text-sm rounded-xl"
                disabled={isLoggingIn}
                data-ocid="nav.link"
              >
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
