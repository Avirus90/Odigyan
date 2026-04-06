import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Category {
    name: string;
    description: string;
}
export type Time = bigint;
export type LessonId = bigint;
export interface ContentItem {
    id: string;
    url: string;
    order: bigint;
    sectionType: string;
    name: string;
    createdAt: bigint;
    folderId?: string;
    courseId?: string;
}
export interface Course {
    title: string;
    thumbnailUrl: string;
    published: boolean;
    description: string;
    creationDate: Time;
    category: CategoryId;
    instructorName: string;
}
export interface Lesson {
    title: string;
    content: string;
    order: bigint;
    videoUrl: string;
    courseId: CourseId;
}
export interface StudentInfo {
    student: Principal;
    enrollmentCount: bigint;
}
export interface StudentProfile {
    studentId: string;
    name: string;
    email: string;
    phone: string;
    dob: string;
    passwordHash: string;
    createdAt: bigint;
    principalId: string;
}
export interface StudentPublicInfo {
    studentId: string;
    name: string;
    email: string;
    phone: string;
    dob: string;
    createdAt: bigint;
    principalId: string;
    enrollmentCount: bigint;
}
export type CategoryId = bigint;
export type CourseId = bigint;
export interface ContentFolder {
    id: string;
    order: bigint;
    sectionType: string;
    icon: string;
    name: string;
    createdAt: bigint;
    parentId?: string;
    courseId?: string;
}
export interface UserProfile {
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    checkEmailExists(email: string): Promise<boolean>;
    checkPhoneExists(phone: string): Promise<boolean>;
    completeLesson(courseId: CourseId, lessonId: LessonId): Promise<void>;
    createCategory(category: Category): Promise<CategoryId>;
    createContentFolder(folder: ContentFolder): Promise<void>;
    createContentItem(item: ContentItem): Promise<void>;
    createCourse(course: Course): Promise<CourseId>;
    createLesson(lesson: Lesson): Promise<LessonId>;
    deleteCategory(id: CategoryId): Promise<void>;
    deleteContentFolder(id: string): Promise<void>;
    deleteContentItem(id: string): Promise<void>;
    deleteCourse(id: CourseId): Promise<void>;
    deleteLesson(id: LessonId): Promise<void>;
    enroll(courseId: CourseId): Promise<void>;
    getAllStudents(): Promise<Array<StudentInfo>>;
    getAllStudentProfiles(): Promise<Array<StudentPublicInfo>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCompletedLessons(courseId: CourseId): Promise<Array<LessonId>>;
    getCompletionStatus(courseId: CourseId): Promise<bigint>;
    getCourse(id: CourseId): Promise<Course | null>;
    getEnrolledCourses(): Promise<Array<CourseId>>;
    getLesson(id: LessonId): Promise<Lesson | null>;
    getMostPopularCourses(): Promise<Array<[CourseId, bigint]>>;
    getMyStudentProfile(): Promise<StudentProfile | null>;
    getTotalCourses(): Promise<bigint>;
    getTotalEnrollments(): Promise<bigint>;
    getTotalStudents(): Promise<bigint>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    importContentItem(sourceItemId: string, targetCourseId: string | null, targetFolderId: string | null, newId: string): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    listCategories(): Promise<Array<Category>>;
    listContentFolders(courseId: string | null, sectionType: string): Promise<Array<ContentFolder>>;
    listContentItems(courseId: string | null, sectionType: string, folderId: string | null): Promise<Array<ContentItem>>;
    listCourses(): Promise<Array<Course>>;
    listCoursesWithIds(): Promise<Array<[CourseId, Course]>>;
    listLessons(courseId: CourseId): Promise<Array<Lesson>>;
    loginStudent(emailOrPhone: string, passwordHash: string): Promise<{ ok: { studentId: string; name: string; email: string } } | { err: string }>;
    markLessonComplete(courseId: CourseId, lessonId: LessonId): Promise<void>;
    registerStudent(name: string, email: string, phone: string, dob: string, passwordHash: string): Promise<{ ok: string } | { err: string }>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    unenroll(courseId: CourseId): Promise<void>;
    updateContentFolder(id: string, folder: ContentFolder): Promise<void>;
    updateContentItem(id: string, item: ContentItem): Promise<void>;
    updateCourse(id: CourseId, course: Course): Promise<void>;
    updateLesson(id: LessonId, lesson: Lesson): Promise<void>;
}
