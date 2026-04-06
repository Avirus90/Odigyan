import { useCallback, useState } from "react";

export interface StudentSession {
  studentId: string;
  name: string;
  email: string;
  loggedInAt: number;
}

const SESSION_KEY = "odg_student_session";

function readSession(): StudentSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StudentSession;
  } catch {
    return null;
  }
}

export function useStudentSession() {
  const [studentSession, setStudentSessionState] =
    useState<StudentSession | null>(readSession);

  const setStudentSession = useCallback((session: StudentSession) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setStudentSessionState(session);
  }, []);

  const clearStudentSession = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setStudentSessionState(null);
  }, []);

  return { studentSession, setStudentSession, clearStudentSession };
}
