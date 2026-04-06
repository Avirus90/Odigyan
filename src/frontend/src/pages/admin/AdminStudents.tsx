import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  Calendar,
  ChevronLeft,
  GraduationCap,
  Mail,
  Phone,
  Search,
  User,
} from "lucide-react";
import { useState } from "react";
import { useActor } from "../../hooks/useActor";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";
import { useAdminCheck } from "./AdminDashboard";

type StudentPublicInfo = {
  studentId: string;
  name: string;
  email: string;
  phone: string;
  dob: string;
  createdAt: bigint;
  principalId: string;
  enrollmentCount: bigint;
};

type StudentInfo = {
  student: { toString(): string };
  enrollmentCount: bigint;
};

function formatDate(ts: bigint) {
  // Backend stores nanoseconds
  try {
    const ms = Number(ts) / 1_000_000;
    if (ms < 1e10) return "-";
    return new Date(ms).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

function formatDob(dob: string) {
  if (!dob) return "-";
  try {
    return new Date(dob).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dob;
  }
}

export default function AdminStudents() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();
  const { isAdmin, checking } = useAdminCheck();
  const [search, setSearch] = useState("");

  // Try to get rich profiles first
  const profilesQuery = useQuery({
    queryKey: ["admin-student-profiles"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        const profiles = await (actor as any).getAllStudentProfiles();
        if (Array.isArray(profiles) && profiles.length > 0)
          return profiles as StudentPublicInfo[];
        return [];
      } catch {
        return [];
      }
    },
    enabled: !!actor && isAdmin,
  });

  // Fallback to basic student records
  const studentsQuery = useQuery({
    queryKey: ["admin-students"],
    queryFn: async () => {
      if (!actor) return [];
      return await actor.getAllStudents();
    },
    enabled: !!actor && isAdmin,
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

  const richProfiles: StudentPublicInfo[] = Array.isArray(profilesQuery.data)
    ? profilesQuery.data
    : [];
  const fallbackStudents: StudentInfo[] = Array.isArray(studentsQuery.data)
    ? studentsQuery.data
    : [];
  const hasRich = richProfiles.length > 0;

  const filteredRich = richProfiles.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.phone.includes(q) ||
      s.studentId.toLowerCase().includes(q)
    );
  });

  const filteredFallback = fallbackStudents.filter((s) => {
    if (!search) return true;
    return s.student.toString().toLowerCase().includes(search.toLowerCase());
  });

  const totalCount = hasRich ? filteredRich.length : filteredFallback.length;
  const isLoading = profilesQuery.isLoading || studentsQuery.isLoading;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-blue-700 px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
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
          <h1 className="font-bold text-white text-base flex-1">
            Students ({totalCount})
          </h1>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
          <Input
            placeholder="Search by name, email, phone or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl"
            data-ocid="admin.search_input"
          />
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse"
            />
          ))
        ) : hasRich ? (
          filteredRich.length === 0 ? (
            <div
              className="text-center py-12 text-gray-400"
              data-ocid="admin.empty_state"
            >
              No students found.
            </div>
          ) : (
            filteredRich.map((s, idx) => (
              <div
                key={s.studentId}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
                data-ocid={`admin.item.${idx + 1}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        {s.name}
                      </p>
                      <Badge className="text-xs px-2 py-0 h-5 rounded-full bg-blue-600 text-white font-mono">
                        {s.studentId}
                      </Badge>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs rounded-xl">
                    <BookOpen className="h-3 w-3 mr-1" />
                    {s.enrollmentCount.toString()} courses
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{s.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span>{s.phone}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span>DOB: {formatDob(s.dob)}</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      Joined: {formatDate(s.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )
        ) : filteredFallback.length === 0 ? (
          <div
            className="text-center py-12 text-gray-400"
            data-ocid="admin.empty_state"
          >
            No students enrolled yet.
          </div>
        ) : (
          filteredFallback.map((s, idx) => (
            <div
              key={s.student.toString()}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3"
              data-ocid={`admin.item.${idx + 1}`}
            >
              <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono text-gray-600 truncate">
                  {s.student.toString()}
                </p>
                <p className="text-xs text-gray-400">
                  {s.enrollmentCount.toString()} course(s) enrolled
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
