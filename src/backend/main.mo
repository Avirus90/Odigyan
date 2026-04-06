import Time "mo:core/Time";
import Map "mo:core/Map";
import Array "mo:core/Array";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Order "mo:core/Order";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";

actor {
  include MixinStorage();

  type CategoryId = Nat;
  type CourseId = Nat;
  type LessonId = Nat;

  // Types
  type Category = {
    name : Text;
    description : Text;
  };
  type Course = {
    title : Text;
    description : Text;
    category : CategoryId;
    instructorName : Text;
    thumbnailUrl : Text;
    published : Bool;
    creationDate : Time.Time;
  };
  type Lesson = {
    title : Text;
    content : Text;
    videoUrl : Text;
    order : Nat;
    courseId : CourseId;
  };
  type ContentFolder = {
    id : Text;
    name : Text;
    icon : Text;
    sectionType : Text;
    parentId : ?Text;
    courseId : ?Text;
    order : Nat;
    createdAt : Int;
  };
  type ContentItem = {
    id : Text;
    name : Text;
    url : Text;
    sectionType : Text;
    folderId : ?Text;
    courseId : ?Text;
    order : Nat;
    createdAt : Int;
  };
  type Enrollment = {
    student : Principal;
    courseId : CourseId;
    enrolledAt : Time.Time;
  };
  type Progress = {
    student : Principal;
    courseId : CourseId;
    lessonId : LessonId;
    completed : Bool;
  };

  // Student Profile for custom auth
  public type StudentProfile = {
    studentId : Text;
    name : Text;
    email : Text;
    phone : Text;
    dob : Text;
    passwordHash : Text;
    createdAt : Int;
    principalId : Text;
  };

  public type StudentLoginResult = {
    #ok : { studentId : Text; name : Text; email : Text };
    #err : Text;
  };

  // Module helpers
  module Category {
    public func compare(cat1 : Category, cat2 : Category) : Order.Order {
      Text.compare(cat1.name, cat2.name);
    };
  };

  module Course {
    public func compare(c1 : Course, c2 : Course) : Order.Order {
      Text.compare(c1.title, c2.title);
    };
  };

  module Lesson {
    public func compare(l1 : Lesson, l2 : Lesson) : Order.Order {
      Nat.compare(l1.order, l2.order);
    };
  };

  module ContentFolder {
    public func compare(f1 : ContentFolder, f2 : ContentFolder) : Order.Order {
      Nat.compare(f1.order, f2.order);
    };
  };

  module ContentItem {
    public func compare(i1 : ContentItem, i2 : ContentItem) : Order.Order {
      Nat.compare(i1.order, i2.order);
    };
  };

  module Enrollment {
    public func compare(e1 : Enrollment, e2 : Enrollment) : Order.Order {
      Principal.compare(e1.student, e2.student);
    };
  };

  module Progress {
    public func compare(p1 : Progress, p2 : Progress) : Order.Order {
      Principal.compare(p1.student, p2.student);
    };
  };

  // State variables
  var nextCategoryId = 1;
  var nextCourseId = 1;
  var nextLessonId = 1;
  var nextStudentCounter = 1;

  let categories = Map.empty<Nat, Category>();
  let courses = Map.empty<Nat, Course>();
  let lessons = Map.empty<Nat, Lesson>();
  let contentFolders = Map.empty<Text, ContentFolder>();
  let contentItems = Map.empty<Text, ContentItem>();
  let enrollments = Map.empty<Principal, List.List<CourseId>>();
  let progressMap = Map.empty<Principal, List.List<(LessonId, Bool)>>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  // Student auth maps
  let studentsByEmail = Map.empty<Text, StudentProfile>();
  let studentsByPhone = Map.empty<Text, StudentProfile>();
  let studentsByPrincipal = Map.empty<Text, StudentProfile>();
  // StudentId-based enrollments (no Internet Identity required)
  let studentEnrollments = Map.empty<Text, List.List<CourseId>>();
  
  // Banner slides stored as JSON text
  var bannerSlidesJson : Text = "";

  // Authorization
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User Profile (legacy II-based)
  public type UserProfile = {
    name : Text;
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // ============================================================
  // STUDENT CUSTOM AUTH
  // ============================================================

  func padNat(n : Nat) : Text {
    let s = n.toText();
    let len = s.size();
    if (len >= 6) { return s };
    var pad = "";
    var i = len;
    while (i < 6) {
      pad := pad # "0";
      i += 1;
    };
    pad # s;
  };

  public shared ({ caller }) func registerStudent(
    name : Text,
    email : Text,
    phone : Text,
    dob : Text,
    passwordHash : Text
  ) : async { #ok : Text; #err : Text } {
    // Check email already exists
    switch (studentsByEmail.get(email)) {
      case (?_) { return #err("Email already registered") };
      case (null) {};
    };
    // Check phone already exists
    switch (studentsByPhone.get(phone)) {
      case (?_) { return #err("Phone number already registered") };
      case (null) {};
    };

    let studentId = "ODG-" # padNat(nextStudentCounter);
    nextStudentCounter += 1;

    let profile : StudentProfile = {
      studentId = studentId;
      name = name;
      email = email;
      phone = phone;
      dob = dob;
      passwordHash = passwordHash;
      createdAt = Time.now();
      principalId = caller.toText();
    };

    studentsByEmail.add(email, profile);
    studentsByPhone.add(phone, profile);
    // Only map to principal if caller is not anonymous
    if (not caller.isAnonymous()) {
      studentsByPrincipal.add(caller.toText(), profile);
      accessControlState.userRoles.add(caller, #user);
    };

    #ok(studentId);
  };

  public shared ({ caller }) func loginStudent(
    emailOrPhone : Text,
    passwordHash : Text
  ) : async StudentLoginResult {
    // Try email first, then phone
    let profileOpt : ?StudentProfile = switch (studentsByEmail.get(emailOrPhone)) {
      case (?p) { ?p };
      case (null) {
        switch (studentsByPhone.get(emailOrPhone)) {
          case (?p) { ?p };
          case (null) { null };
        };
      };
    };

    switch (profileOpt) {
      case (null) {
        #err("No account found with this email or phone number");
      };
      case (?profile) {
        if (profile.passwordHash != passwordHash) {
          #err("Incorrect password");
        } else {
          // Update the principal mapping for this session (only if non-anonymous)
          if (not caller.isAnonymous()) {
            let updatedProfile = {
              profile with principalId = caller.toText()
            };
            studentsByEmail.add(profile.email, updatedProfile);
            studentsByPhone.add(profile.phone, updatedProfile);
            studentsByPrincipal.add(caller.toText(), updatedProfile);
            accessControlState.userRoles.add(caller, #user);
          };

          #ok({
            studentId = profile.studentId;
            name = profile.name;
            email = profile.email;
          });
        };
      };
    };
  };

  public query ({ caller }) func getMyStudentProfile() : async ?StudentProfile {
    studentsByPrincipal.get(caller.toText());
  };

  public query (_) func checkEmailExists(email : Text) : async Bool {
    switch (studentsByEmail.get(email)) {
      case (?_) { true };
      case (null) { false };
    };
  };

  public query (_) func checkPhoneExists(phone : Text) : async Bool {
    switch (studentsByPhone.get(phone)) {
      case (?_) { true };
      case (null) { false };
    };
  };

  public type StudentPublicInfo = {
    studentId : Text;
    name : Text;
    email : Text;
    phone : Text;
    dob : Text;
    createdAt : Int;
    principalId : Text;
    enrollmentCount : Nat;
  };

  public query ({ caller }) func getAllStudentProfiles() : async [StudentPublicInfo] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view student profiles");
    };
    studentsByEmail.values().map(
      func(p : StudentProfile) : StudentPublicInfo {
        let enrollCount = switch (enrollments.get(Principal.fromText(p.principalId))) {
          case (null) { 0 };
          case (?list) { list.size() };
        };
        {
          studentId = p.studentId;
          name = p.name;
          email = p.email;
          phone = p.phone;
          dob = p.dob;
          createdAt = p.createdAt;
          principalId = p.principalId;
          enrollmentCount = enrollCount;
        };
      }
    ).toArray();
  };

  // ============================================================
  // Helper function to check if user is enrolled in a course
  func isEnrolledInCourse(student : Principal, courseId : CourseId) : Bool {
    switch (enrollments.get(student)) {
      case (null) { false };
      case (?enrollmentList) {
        let arr = enrollmentList.toArray();
        var found = false;
        for (c in arr.vals()) {
          if (c == courseId) { found := true };
        };
        found;
      };
    };
  };

  // Helper function to parse courseId from Text
  func parseCourseId(courseIdText : ?Text) : ?CourseId {
    switch (courseIdText) {
      case (null) { null };
      case (?text) {
        var result : Nat = 0;
        for (char in text.chars()) {
          let digit = switch (char) {
            case ('0') { 0 };
            case ('1') { 1 };
            case ('2') { 2 };
            case ('3') { 3 };
            case ('4') { 4 };
            case ('5') { 5 };
            case ('6') { 6 };
            case ('7') { 7 };
            case ('8') { 8 };
            case ('9') { 9 };
            case (_) { return null };
          };
          result := result * 10 + digit;
        };
        ?result;
      };
    };
  };

  // Content Folders (ADMIN ONLY)
  public shared ({ caller }) func createContentFolder(folder : ContentFolder) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can create content folders");
    };
    contentFolders.add(folder.id, folder);
  };

  public shared ({ caller }) func updateContentFolder(id : Text, folder : ContentFolder) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update content folders");
    };
    if (not contentFolders.containsKey(id)) {
      Runtime.trap("Content folder not found");
    };
    contentFolders.add(id, folder);
  };

  public shared ({ caller }) func deleteContentFolder(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete content folders");
    };
    if (not contentFolders.containsKey(id)) {
      Runtime.trap("Content folder not found");
    };
    contentFolders.remove(id);
    for ((itemId, item) in contentItems.entries()) {
      switch (item.folderId) {
        case (?folderId) {
          if (folderId == id) {
            contentItems.remove(itemId);
          };
        };
        case (null) {};
      };
    };
  };

  public query ({ caller }) func listContentFolders(courseId : ?Text, sectionType : Text) : async [ContentFolder] {
    switch (courseId) {
      case (null) {
        if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
          Runtime.trap("Unauthorized: Only admins can access media library");
        };
      };
      case (?cid) {
        switch (parseCourseId(?cid)) {
          case (null) {
            Runtime.trap("Invalid course ID");
          };
          case (?courseIdNat) {
            if (not (AccessControl.isAdmin(accessControlState, caller)) and not isEnrolledInCourse(caller, courseIdNat)) {
              Runtime.trap("Unauthorized: Must be enrolled in course or be admin");
            };
          };
        };
      };
    };
    
    let filtered = contentFolders.values().filter(
      func(f) {
        f.sectionType == sectionType and f.courseId == courseId;
      }
    ).toArray();
    filtered.sort(func(a : ContentFolder, b : ContentFolder) : Order.Order {
      Nat.compare(a.order, b.order);
    });
  };

  // Content Items
  public shared ({ caller }) func createContentItem(item : ContentItem) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can create content items");
    };
    contentItems.add(item.id, item);
  };

  public shared ({ caller }) func updateContentItem(id : Text, item : ContentItem) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update content items");
    };
    if (not contentItems.containsKey(id)) {
      Runtime.trap("Content item not found");
    };
    contentItems.add(id, item);
  };

  public shared ({ caller }) func deleteContentItem(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete content items");
    };
    if (not contentItems.containsKey(id)) {
      Runtime.trap("Content item not found");
    };
    contentItems.remove(id);
  };

  public query ({ caller }) func listContentItems(courseId : ?Text, sectionType : Text, folderId : ?Text) : async [ContentItem] {
    switch (courseId) {
      case (null) {
        if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
          Runtime.trap("Unauthorized: Only admins can access media library");
        };
      };
      case (?cid) {
        switch (parseCourseId(?cid)) {
          case (null) {
            Runtime.trap("Invalid course ID");
          };
          case (?courseIdNat) {
            if (not (AccessControl.isAdmin(accessControlState, caller)) and not isEnrolledInCourse(caller, courseIdNat)) {
              Runtime.trap("Unauthorized: Must be enrolled in course or be admin");
            };
          };
        };
      };
    };
    
    let filtered = contentItems.values().filter(
      func(i) {
        i.sectionType == sectionType and i.courseId == courseId and i.folderId == folderId;
      }
    ).toArray();
    filtered.sort(func(a : ContentItem, b : ContentItem) : Order.Order {
      Nat.compare(a.order, b.order);
    });
  };

  public shared ({ caller }) func importContentItem(sourceItemId : Text, targetCourseId : ?Text, targetFolderId : ?Text, newId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can import content items");
    };
    switch (contentItems.get(sourceItemId)) {
      case (null) { Runtime.trap("Source content item not found") };
      case (?item) {
        let newItem = { item with id = newId; courseId = targetCourseId; folderId = targetFolderId };
        contentItems.add(newId, newItem);
      };
    };
  };

  // Category
  public shared ({ caller }) func createCategory(category : Category) : async CategoryId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can create categories");
    };
    let id = nextCategoryId;
    categories.add(id, category);
    nextCategoryId += 1;
    id;
  };

  public query (_) func listCategories() : async [Category] {
    let arr = categories.values().toArray();
    arr.sort(func(a : Category, b : Category) : Order.Order {
      Text.compare(a.name, b.name);
    });
  };

  public shared ({ caller }) func deleteCategory(id : CategoryId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete categories");
    };
    categories.remove(id);
  };

  // Course
  public shared ({ caller }) func createCourse(course : Course) : async CourseId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can create courses");
    };
    let id = nextCourseId;
    courses.add(id, course);
    nextCourseId += 1;
    id;
  };

  public query (_) func getCourse(id : CourseId) : async ?Course {
    courses.get(id);
  };

  public shared ({ caller }) func updateCourse(id : CourseId, course : Course) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update courses");
    };
    courses.add(id, course);
  };

  public shared ({ caller }) func deleteCourse(id : CourseId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete courses");
    };
    courses.remove(id);
  };

  public query (_) func listCourses() : async [Course] {
    let arr = courses.values().toArray();
    arr.sort(func(a : Course, b : Course) : Order.Order {
      Text.compare(a.title, b.title);
    });
  };

  public query (_) func listCoursesWithIds() : async [(CourseId, Course)] {
    let entries = courses.entries().toArray();
    entries.sort(func(a : (CourseId, Course), b : (CourseId, Course)) : Order.Order {
      Text.compare(a.1.title, b.1.title);
    });
  };

  // Lesson
  public shared ({ caller }) func createLesson(lesson : Lesson) : async LessonId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can create lessons");
    };
    let id = nextLessonId;
    lessons.add(id, lesson);
    nextLessonId += 1;
    id;
  };

  public query (_) func getLesson(id : LessonId) : async ?Lesson {
    lessons.get(id);
  };

  public shared ({ caller }) func updateLesson(id : LessonId, lesson : Lesson) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update lessons");
    };
    lessons.add(id, lesson);
  };

  public shared ({ caller }) func deleteLesson(id : LessonId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete lessons");
    };
    lessons.remove(id);
  };

  public query (_) func listLessons(courseId : CourseId) : async [Lesson] {
    let filtered = lessons.values().filter(func(l) { l.courseId == courseId }).toArray();
    filtered.sort(func(a : Lesson, b : Lesson) : Order.Order {
      Nat.compare(a.order, b.order);
    });
  };

  // Enrollment
  public shared ({ caller }) func enroll(courseId : CourseId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can enroll in courses");
    };
    switch (enrollments.get(caller)) {
      case (null) {
        let newEnrollment = List.fromArray<Nat>([courseId]);
        enrollments.add(caller, newEnrollment);
      };
      case (?enrollmentList) {
        enrollmentList.add(courseId);
      };
    };
  };

  public shared ({ caller }) func unenroll(courseId : CourseId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unenroll from courses");
    };
    switch (enrollments.get(caller)) {
      case (null) { () };
      case (?enrollmentList) {
        let filtered = enrollmentList.filter(func(c) { c != courseId });
        enrollments.add(caller, filtered);
      };
    };
  };

  public query ({ caller }) func getEnrolledCourses() : async [CourseId] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view their enrollments");
    };
    switch (enrollments.get(caller)) {
      case (null) { [] };
      case (?enrollmentList) { enrollmentList.toArray() };
    };
  };

  // Progress
  public shared ({ caller }) func markLessonComplete(courseId : CourseId, lessonId : LessonId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark lessons as complete");
    };
    if (not isEnrolledInCourse(caller, courseId)) {
      Runtime.trap("Unauthorized: Must be enrolled in course to mark lessons complete");
    };
    switch (lessons.get(lessonId)) {
      case (null) {
        Runtime.trap("Lesson not found");
      };
      case (?lesson) {
        if (lesson.courseId != courseId) {
          Runtime.trap("Lesson does not belong to specified course");
        };
      };
    };
    
    switch (progressMap.get(caller)) {
      case (null) {
        let newProgress = List.fromArray<(Nat, Bool)>([(lessonId, true)]);
        progressMap.add(caller, newProgress);
      };
      case (?progressList) {
        progressList.add((lessonId, true));
      };
    };
  };

  public query ({ caller }) func getCompletionStatus(courseId : CourseId) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view their progress");
    };
    if (not isEnrolledInCourse(caller, courseId)) {
      Runtime.trap("Unauthorized: Must be enrolled in course to view progress");
    };
    
    let lessonsForCourse = lessons.values().filter(func(l) { l.courseId == courseId }).toArray();
    let totalLessons = lessonsForCourse.size();
    if (totalLessons == 0) { return 0 };

    let completedLessons : Nat = switch (progressMap.get(caller)) {
      case (null) { 0 };
      case (?progressList) {
        progressList.toArray().filter(
          func(p) {
            let lessonOpt = lessons.get(p.0);
            switch (lessonOpt) {
              case (null) { false };
              case (?l) { l.courseId == courseId and p.1 };
            };
          }
        ).size();
      };
    };

    (completedLessons * 100) / totalLessons;
  };

  public query ({ caller }) func getCompletedLessons(courseId : CourseId) : async [LessonId] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view their completed lessons");
    };
    if (not isEnrolledInCourse(caller, courseId)) {
      Runtime.trap("Unauthorized: Must be enrolled in course to view progress");
    };
    
    switch (progressMap.get(caller)) {
      case (null) { [] };
      case (?progressList) {
        progressList.toArray().filter(
          func(p) {
            let lessonOpt = lessons.get(p.0);
            switch (lessonOpt) {
              case (null) { false };
              case (?l) { l.courseId == courseId and p.1 };
            };
          }
        ).map(func(p) { p.0 });
      };
    };
  };

  // Admin Stats
  public query ({ caller }) func getTotalStudents() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view statistics");
    };
    enrollments.size();
  };

  public query ({ caller }) func getTotalCourses() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view statistics");
    };
    courses.size();
  };

  public query ({ caller }) func getTotalEnrollments() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view statistics");
    };
    var total = 0;
    for ((student, enrollmentList) in enrollments.entries()) {
      total += enrollmentList.size();
    };
    total;
  };

  public query ({ caller }) func getMostPopularCourses() : async [(CourseId, Nat)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view statistics");
    };
    let courseEnrollmentCounts = Map.empty<CourseId, Nat>();
    for ((student, enrollmentList) in enrollments.entries()) {
      for (courseId in enrollmentList.values()) {
        let currentCount = switch (courseEnrollmentCounts.get(courseId)) {
          case (null) { 0 };
          case (?count) { count };
        };
        courseEnrollmentCounts.add(courseId, currentCount + 1);
      };
    };
    let result = courseEnrollmentCounts.entries().toArray();
    result.sort(func(a : (CourseId, Nat), b : (CourseId, Nat)) : Order.Order {
      Nat.compare(b.1, a.1);
    });
  };

  public type StudentInfo = {
    student : Principal;
    enrollmentCount : Nat;
  };

  public query ({ caller }) func getAllStudents() : async [StudentInfo] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view student list");
    };
    let students = enrollments.entries().map(
      func((student, enrollmentList) : (Principal, List.List<CourseId>)) : StudentInfo {
        {
          student = student;
          enrollmentCount = enrollmentList.size();
        };
      }
    ).toArray();
    students.sort(func(a : StudentInfo, b : StudentInfo) : Order.Order {
      Principal.compare(a.student, b.student);
    });
  };

  // ============================================================
  // StudentId-based enrollment (no Internet Identity required)
  // ============================================================

  public shared (_) func enrollByStudentId(studentId : Text, courseId : CourseId) : async () {
    switch (studentEnrollments.get(studentId)) {
      case (null) {
        let newList = List.fromArray<Nat>([courseId]);
        studentEnrollments.add(studentId, newList);
      };
      case (?list) {
        var found = false;
        for (c in list.values()) { if (c == courseId) { found := true } };
        if (not found) { list.add(courseId) };
      };
    };
  };

  public query (_) func getEnrolledCoursesByStudentId(studentId : Text) : async [CourseId] {
    switch (studentEnrollments.get(studentId)) {
      case (null) { [] };
      case (?list) { list.toArray() };
    };
  };

  public query (_) func isEnrolledByStudentId(studentId : Text, courseId : CourseId) : async Bool {
    switch (studentEnrollments.get(studentId)) {
      case (null) { false };
      case (?list) {
        var found = false;
        for (c in list.values()) { if (c == courseId) { found := true } };
        found;
      };
    };
  };


  public shared (_) func completeLesson(courseId : CourseId, lessonId : LessonId) : async () {
    await markLessonComplete(courseId, lessonId);
  };

  // ============================================================
  // INTERNET IDENTITY BASED STUDENT AUTH (New Flow)
  // ============================================================

  // Register new student using their Internet Identity principal (no password)
  public shared ({ caller }) func registerStudentII(
    name : Text,
    email : Text,
    phone : Text,
    dob : Text
  ) : async { #ok : Text; #err : Text } {
    if (caller.isAnonymous()) {
      return #err("Please login with Internet Identity first");
    };
    // Check if principal already registered
    switch (studentsByPrincipal.get(caller.toText())) {
      case (?_) { return #err("This identity is already registered") };
      case (null) {};
    };
    // Check email already exists
    switch (studentsByEmail.get(email)) {
      case (?_) { return #err("Email already registered") };
      case (null) {};
    };
    // Check phone already exists
    switch (studentsByPhone.get(phone)) {
      case (?_) { return #err("Phone number already registered") };
      case (null) {};
    };

    let studentId = "ODG-" # padNat(nextStudentCounter);
    nextStudentCounter += 1;

    let profile : StudentProfile = {
      studentId = studentId;
      name = name;
      email = email;
      phone = phone;
      dob = dob;
      passwordHash = "";
      createdAt = Time.now();
      principalId = caller.toText();
    };

    studentsByEmail.add(email, profile);
    studentsByPhone.add(phone, profile);
    studentsByPrincipal.add(caller.toText(), profile);
    accessControlState.userRoles.add(caller, #user);

    #ok(studentId);
  };

  // Get student profile by current caller's II principal
  public query ({ caller }) func getStudentByCallerPrincipal() : async ?{
    studentId : Text;
    name : Text;
    email : Text;
    phone : Text;
    dob : Text;
  } {
    if (caller.isAnonymous()) { return null };
    switch (studentsByPrincipal.get(caller.toText())) {
      case (null) { null };
      case (?p) {
        ?{
          studentId = p.studentId;
          name = p.name;
          email = p.email;
          phone = p.phone;
          dob = p.dob;
        };
      };
    };
  };

  // Link current II principal to existing student (device change)
  // Verifies name + email + phone + dob match
  public shared ({ caller }) func linkPrincipalToStudent(
    name : Text,
    email : Text,
    phone : Text,
    dob : Text
  ) : async { #ok : { studentId : Text; name : Text; email : Text }; #err : Text } {
    if (caller.isAnonymous()) {
      return #err("Please login with Internet Identity first");
    };
    switch (studentsByEmail.get(email)) {
      case (null) {
        #err("No account found with this email");
      };
      case (?profile) {
        if (profile.name != name) {
          return #err("Name does not match our records");
        };
        if (profile.phone != phone) {
          return #err("Phone number does not match our records");
        };
        if (profile.dob != dob) {
          return #err("Date of birth does not match our records");
        };
        let updatedProfile = { profile with principalId = caller.toText() };
        studentsByEmail.add(profile.email, updatedProfile);
        studentsByPhone.add(profile.phone, updatedProfile);
        studentsByPrincipal.add(caller.toText(), updatedProfile);
        accessControlState.userRoles.add(caller, #user);
        #ok({
          studentId = profile.studentId;
          name = profile.name;
          email = profile.email;
        });
      };
    };
  };


  // ============================================================
  // BANNER SETTINGS
  // ============================================================

  // Get banner slides JSON (public - visible to all users)
  public query func getBannerSlides() : async Text {
    bannerSlidesJson
  };

  // Save banner slides JSON (admin only)
  public shared ({ caller }) func saveBannerSlides(json : Text) : async { #ok; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      return #err("Unauthorized: Only admins can update banner settings");
    };
    bannerSlidesJson := json;
    #ok
  };

};
