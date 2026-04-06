import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { Component, type ErrorInfo, type ReactNode } from "react";
import BottomNav from "./components/BottomNav";
import Navbar from "./components/Navbar";
import StudentProfileModal from "./components/StudentProfileModal";
import CourseContent from "./pages/CourseContent";
import CourseDetail from "./pages/CourseDetail";
import Courses from "./pages/Courses";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import AdminCourseContent from "./pages/admin/AdminCourseContent";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMedia from "./pages/admin/AdminMedia";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminTemplate from "./pages/admin/AdminTemplate";

// Error Boundary
type ErrorBoundaryState = { hasError: boolean; error?: Error };

class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
          <div className="bg-card border border-border rounded-2xl shadow-sm p-8 max-w-md w-full">
            <div className="text-4xl mb-3 text-center">⚠️</div>
            <h2 className="font-bold text-xl text-foreground mb-4 text-center">
              Kuch Galat Ho Gaya
            </h2>
            {this.state.error?.message && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <p className="text-sm font-semibold text-red-700 mb-1">
                  Error:
                </p>
                <p className="text-sm text-red-600 break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}
            {this.state.error?.stack && (
              <details className="mb-6">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none">
                  Stack Trace dekhne ke liye click karo
                </summary>
                <pre className="mt-2 text-xs text-muted-foreground bg-muted rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap break-words">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: undefined });
                  window.history.back();
                }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-medium hover:bg-muted transition-colors"
              >
                Wapas Jao
              </button>
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: undefined });
                  window.location.href = "/";
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Home Page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function GlobalNotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="bg-card border border-border rounded-2xl shadow-sm p-8 max-w-sm w-full text-center">
        <div className="text-4xl mb-3">🔍</div>
        <h2 className="font-display text-xl font-bold text-foreground mb-2">
          Page nahi mila
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Yeh page exist nahi karta. Home page pe wapas jao.
        </p>
        <a
          href="/"
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Home Page
        </a>
      </div>
    </div>
  );
}

function PublicLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <StudentProfileModal />
      <main className="pb-24 md:pb-0">
        <Outlet />
      </main>
      <BottomNav />
      <Toaster />
    </div>
  );
}

function AuthLayout() {
  return (
    <div className="min-h-screen bg-background">
      <StudentProfileModal />
      <Outlet />
      <Toaster />
    </div>
  );
}

function AdminLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Outlet />
      <Toaster />
    </div>
  );
}

const rootRoute = createRootRoute({
  notFoundComponent: () => <GlobalNotFound />,
});

const publicLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "public",
  component: PublicLayout,
});
const authLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "auth",
  component: AuthLayout,
});
const adminLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "admin",
  component: AdminLayout,
});

// Public routes
const landingRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: "/",
  component: Landing,
});
const coursesRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: "/courses",
  component: Courses,
});
const courseDetailRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: "/courses/$id",
  component: CourseDetail,
});
const courseContentRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: "/courses/$id/content",
  component: CourseContent,
});

// Auth routes
const loginRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: "/login",
  component: Login,
});

// Admin routes
const adminDashboardRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin",
  component: AdminDashboard,
});
const adminCoursesRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/courses",
  component: AdminCourses,
});
const adminCourseContentRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/courses/$id/content",
  component: AdminCourseContent,
});
const adminStudentsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/students",
  component: AdminStudents,
});
const adminMediaRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/media",
  component: AdminMedia,
});
const adminTemplateRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/template",
  component: AdminTemplate,
});

const routeTree = rootRoute.addChildren([
  publicLayoutRoute.addChildren([
    landingRoute,
    coursesRoute,
    courseDetailRoute,
    courseContentRoute,
  ]),
  authLayoutRoute.addChildren([loginRoute]),
  adminLayoutRoute.addChildren([
    adminDashboardRoute,
    adminCoursesRoute,
    adminCourseContentRoute,
    adminStudentsRoute,
    adminMediaRoute,
    adminTemplateRoute,
  ]),
]);

const router = createRouter({
  routeTree,
  defaultNotFoundComponent: () => <GlobalNotFound />,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export { useNavigate, useRouter };

export default function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}
