# OdiGyan ICP -> Firebase Migration Plan

## 1) Folder Structure (new)

```text
.
├── .env.example
├── firebase/
│   ├── firestore.indexes.json
│   └── firestore.rules
├── functions/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/index.ts
└── src/frontend/src/services/firebase/
    ├── auth.ts
    ├── banners.ts
    ├── config.ts
    ├── courses.ts
    └── studentProfile.ts
```

## 2) ICP-to-Firebase Service Mapping

- Internet Identity auth -> Firebase Auth (Google Sign-In)
- Principal mapping -> `uidMap/{uid}`
- Student profile + enrollment maps -> `students/{studentDocId}`
- Banner canister state -> `banners/{bannerId}`
- Course tree canister state -> `courses/{courseId}/sections/...`
- Backend actor methods -> callable Cloud Functions

## 3) Cloud Functions Included

- `createOrLinkStudentProfile`
  - Handles mandatory profile creation on first login
  - Handles device/account relink using email + phone + dob
- `enrollInCourse`
  - Atomic enrollment update
  - Free vs paid gate check
- `updateBanner`
  - Admin-only banner updates
- `createRazorpayOrder`
- `verifyRazorpayPayment`

## 4) Required Frontend Wiring (next step)

1. Replace `useInternetIdentity` and canister login entry points with `signInWithGoogle`.
2. On auth success, show `Verifying profile...` state.
3. Call `createOrLinkStudentProfile` if `uidMap/{uid}` is not found.
4. Route guarded pages based on:
   - user auth state
   - student profile completeness
   - admin UID membership from `/config/app`
5. Replace canister enrollment call with `enrollInCourse`.
6. Replace banner reads with `subscribeToActiveBanners` realtime listener.

## 5) Data Contracts

### `/config/app`

- `adminUids: string[]`
- `iiStyleLoginLabel: string`
- `tagline: string`
- `taglineVisible: boolean`

### `/students/{studentDocId}`

- `studentCode: string` (ODG-XXXXXX)
- `name, dob, phone, email`
- `linkedUids: string[]`
- `enrolledCourseIds: string[]`
- `createdAt, updatedAt`

## 6) Migration Checklist

- [ ] Create Firebase project and enable Google provider.
- [ ] Add web app credentials to `.env`.
- [ ] Deploy Firestore rules and indexes.
- [ ] Deploy Cloud Functions with Razorpay secrets.
- [ ] Integrate frontend service layer in existing pages/hooks.
- [ ] Remove ICP-only registration logic.
- [ ] Verify admin bypass for mandatory student popup.
- [ ] Verify realtime banner updates for all users.

## 7) Testing Checklist

### Auth + Profile
- [ ] New non-admin user signs in -> sees loading -> mandatory popup appears.
- [ ] Submit profile -> student doc created + uidMap created.
- [ ] Existing linked user signs in -> no popup.
- [ ] Admin user signs in -> no mandatory popup.

### Device/Account Link
- [ ] New UID with same email+phone+dob in link mode -> mapped to existing student.
- [ ] Invalid link payload -> proper error message.

### Enrollment
- [ ] Free course enroll succeeds.
- [ ] Paid course blocks without verified payment.
- [ ] Paid course enroll succeeds after verification.

### Content
- [ ] Banner updates visible in realtime to guest/student/admin sessions.
- [ ] Current Affairs list shows titles and opens full content on click.
