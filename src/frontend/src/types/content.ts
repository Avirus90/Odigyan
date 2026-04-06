export type CourseId = bigint;

export interface Course {
  title: string;
  thumbnailUrl: string;
  published: boolean;
  description: string;
  creationDate: bigint;
  category: bigint;
  instructorName: string;
}

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
