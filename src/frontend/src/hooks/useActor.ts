import { useQuery } from "@tanstack/react-query";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { useMemo } from "react";
import { firestore } from "../services/firebase/config";
import { useInternetIdentity } from "./useInternetIdentity";

function toBigIntId(id: string, fallback = 0): bigint {
  try {
    return BigInt(id);
  } catch {
    const hash = Array.from(id).reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 1_000_000_000, 7 + fallback);
    return BigInt(hash);
  }
}

function encodePriceMeta(course: any): string {
  const priceType = course.isFree ? "free" : "paid";
  const tag = course.tag ?? "";
  const price = String(course.price ?? "");
  return `${priceType}|${tag}|${price}`;
}

export function useActor() {
  const { user, isAdmin } = useInternetIdentity();

  const actor = useMemo(() => {
    const uid = user?.uid;

    return {
      async _initializeAccessControlWithSecret() {
        return;
      },
      async isCallerAdmin() {
        return isAdmin;
      },
      async assignCallerUserRole() {
        return;
      },
      async getTotalCourses() {
        const snap = await getDocs(collection(firestore, "courses"));
        return BigInt(snap.size);
      },
      async getTotalStudents() {
        const snap = await getDocs(collection(firestore, "students"));
        return BigInt(snap.size);
      },
      async listCoursesWithIds() {
        const snap = await getDocs(collection(firestore, "courses"));
        return snap.docs.map((d, index) => {
          const data = d.data() as any;
          const cid = toBigIntId(d.id, index);
          return [
            cid,
            {
              title: data.title ?? "Untitled Course",
              thumbnailUrl: data.thumbnailUrl ?? "",
              published: Boolean(data.isPublished ?? data.published ?? false),
              description: data.description ?? "",
              creationDate: BigInt(new Date(data.createdAt?.toDate?.() ?? Date.now()).getTime()),
              category: 0n,
              instructorName: data.instructorName ?? encodePriceMeta(data),
            },
          ] as const;
        });
      },
      async getCourse(id: bigint) {
        const snap = await getDocs(collection(firestore, "courses"));
        const found = snap.docs.find((d, index) => toBigIntId(d.id, index) === id);
        if (!found) return null;
        const data = found.data() as any;
        return {
          title: data.title ?? "Untitled Course",
          thumbnailUrl: data.thumbnailUrl ?? "",
          published: Boolean(data.isPublished ?? data.published ?? false),
          description: data.description ?? "",
          creationDate: BigInt(new Date(data.createdAt?.toDate?.() ?? Date.now()).getTime()),
          category: 0n,
          instructorName: data.instructorName ?? encodePriceMeta(data),
        };
      },
      async getEnrolledCoursesByStudentId(studentId: string) {
        const studentRef = doc(firestore, "students", studentId);
        const studentSnap = await getDoc(studentRef);
        if (!studentSnap.exists()) return [] as bigint[];
        const enrolled = (studentSnap.data().enrolledCourseIds as string[] | undefined) ?? [];
        return enrolled.map((id) => toBigIntId(id));
      },
      async enrollByStudentId(studentId: string, courseId: bigint) {
        const studentRef = doc(firestore, "students", studentId);
        const studentSnap = await getDoc(studentRef);
        if (!studentSnap.exists()) throw new Error("Student not found");
        const current = (studentSnap.data().enrolledCourseIds as string[] | undefined) ?? [];
        const courseKey = courseId.toString();
        if (!current.includes(courseKey)) {
          await updateDoc(studentRef, {
            enrolledCourseIds: [...current, courseKey],
            updatedAt: serverTimestamp(),
          });
        }
      },
      async listContentFolders(courseId: string | null, sectionType: string) {
        const q = query(
          collection(firestore, "contentFolders"),
          where("sectionType", "==", sectionType),
          where("courseId", "==", courseId ?? null),
          orderBy("order", "asc"),
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      },
      async listContentItems(courseId: string | null, sectionType: string, folderId: string | null) {
        const q = query(
          collection(firestore, "contentItems"),
          where("sectionType", "==", sectionType),
          where("courseId", "==", courseId ?? null),
          where("folderId", "==", folderId ?? null),
          orderBy("order", "asc"),
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      },
      async createContentFolder(folder: any) {
        await setDoc(doc(firestore, "contentFolders", folder.id), {
          ...folder,
          createdAt: folder.createdAt ?? Date.now(),
        });
      },
      async deleteContentFolder(id: string) {
        await deleteDoc(doc(firestore, "contentFolders", id));
      },
      async createContentItem(item: any) {
        await setDoc(doc(firestore, "contentItems", item.id), {
          ...item,
          createdAt: item.createdAt ?? Date.now(),
        });
      },
      async deleteContentItem(id: string) {
        await deleteDoc(doc(firestore, "contentItems", id));
      },
      async createCourse(course: any) {
        await addDoc(collection(firestore, "courses"), {
          title: course.title,
          description: course.description,
          thumbnailUrl: course.thumbnailUrl,
          isPublished: Boolean(course.published),
          instructorName: course.instructorName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return 0n;
      },
      async updateCourse(id: bigint, course: any) {
        const snap = await getDocs(collection(firestore, "courses"));
        const target = snap.docs.find((d, index) => toBigIntId(d.id, index) === id);
        if (!target) throw new Error("Course not found");
        await updateDoc(target.ref, {
          title: course.title,
          description: course.description,
          thumbnailUrl: course.thumbnailUrl,
          isPublished: Boolean(course.published),
          instructorName: course.instructorName,
          updatedAt: serverTimestamp(),
        });
      },
      async deleteCourse(id: bigint) {
        const snap = await getDocs(collection(firestore, "courses"));
        const target = snap.docs.find((d, index) => toBigIntId(d.id, index) === id);
        if (target) await deleteDoc(target.ref);
      },
      async saveBannerSlides(payload: string) {
        await setDoc(doc(firestore, "config", "bannerSlides"), { json: payload, updatedAt: serverTimestamp() });
        return { ok: null };
      },
      async getBannerSlides() {
        const snap = await getDoc(doc(firestore, "config", "bannerSlides"));
        return (snap.data()?.json as string | undefined) ?? "";
      },
      async getAllStudentProfiles() {
        const snap = await getDocs(query(collection(firestore, "students"), orderBy("createdAt", "desc"), limit(200)));
        return snap.docs.map((d) => ({
          studentId: d.id,
          ...(d.data() as any),
        }));
      },
      async getAllStudents() {
        const snap = await getDocs(collection(firestore, "students"));
        return snap.docs.map((d) => ({ student: d.id, enrollmentCount: BigInt(((d.data() as any).enrolledCourseIds ?? []).length) }));
      },
      async getStudentByCallerPrincipal() {
        if (!uid) return [];
        const map = await getDoc(doc(firestore, "uidMap", uid));
        if (!map.exists()) return [];
        const studentId = map.data().studentDocId as string;
        const student = await getDoc(doc(firestore, "students", studentId));
        if (!student.exists()) return [];
        const data = student.data() as any;
        return [{ studentId, name: data.name ?? "Student", email: data.email ?? "" }];
      },
      async registerStudentII(name: string, email: string, phone: string, dob: string) {
        if (!uid) return { err: "Not logged in" };
        const existing = await getDocs(query(collection(firestore, "students"), where("email", "==", email), where("phone", "==", phone), where("dob", "==", dob), limit(1)));
        if (!existing.empty) {
          const studentId = existing.docs[0].id;
          await setDoc(doc(firestore, "uidMap", uid), { studentDocId: studentId, linkedAt: serverTimestamp() });
          await updateDoc(existing.docs[0].ref, { linkedUids: [uid], updatedAt: serverTimestamp() });
          return { ok: studentId };
        }
        const studentRef = await addDoc(collection(firestore, "students"), {
          name,
          email,
          phone,
          dob,
          linkedUids: [uid],
          enrolledCourseIds: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(firestore, "uidMap", uid), { studentDocId: studentRef.id, linkedAt: serverTimestamp() });
        return { ok: studentRef.id };
      },
      async linkPrincipalToStudent(name: string, email: string, phone: string, dob: string) {
        if (!uid) return { err: "Not logged in" };
        const existing = await getDocs(query(collection(firestore, "students"), where("email", "==", email), where("phone", "==", phone), where("dob", "==", dob), limit(1)));
        if (existing.empty) return { err: "No matching student found" };
        const docSnap = existing.docs[0];
        const data = docSnap.data() as any;
        if ((data.name ?? "").toLowerCase() !== name.toLowerCase()) {
          return { err: "Name does not match" };
        }
        await setDoc(doc(firestore, "uidMap", uid), { studentDocId: docSnap.id, linkedAt: serverTimestamp() });
        await updateDoc(docSnap.ref, {
          linkedUids: Array.from(new Set([...(data.linkedUids ?? []), uid])),
          updatedAt: serverTimestamp(),
        });
        return { ok: { studentId: docSnap.id, name: data.name, email: data.email } };
      },
    };
  }, [user?.uid, isAdmin]);

  const actorQuery = useQuery({
    queryKey: ["firebase-actor", user?.uid ?? "guest", isAdmin],
    queryFn: async () => actor,
    staleTime: Number.POSITIVE_INFINITY,
  });

  return {
    actor: actorQuery.data ?? actor,
    isFetching: actorQuery.isFetching,
  };
}
