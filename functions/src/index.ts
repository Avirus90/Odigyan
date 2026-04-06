import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import Razorpay from 'razorpay';

admin.initializeApp();
const db = admin.firestore();

const RAZORPAY_KEY_ID = defineSecret('RAZORPAY_KEY_ID');
const RAZORPAY_KEY_SECRET = defineSecret('RAZORPAY_KEY_SECRET');

type ProfileInput = {
  name: string;
  dob: string;
  phone: string;
  email: string;
  mode: 'new' | 'link';
};

function requireUid(auth: { uid?: string } | null | undefined): string {
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }
  return auth.uid;
}

async function isAdmin(uid: string): Promise<boolean> {
  const appConfig = await db.doc('config/app').get();
  const adminUids = (appConfig.get('adminUids') as string[] | undefined) ?? [];
  return adminUids.includes(uid);
}

export const createOrLinkStudentProfile = onCall<ProfileInput>(async (request) => {
  const uid = requireUid(request.auth);
  const { name, dob, phone, email, mode } = request.data;

  if (!name || !dob || !phone || !email || !mode) {
    throw new HttpsError('invalid-argument', 'Missing required profile fields');
  }

  if (await isAdmin(uid)) {
    return { status: 'admin', skipped: true };
  }

  const uidDocRef = db.collection('uidMap').doc(uid);
  const existingUidDoc = await uidDocRef.get();
  if (existingUidDoc.exists) {
    return { status: 'already-linked', studentDocId: existingUidDoc.get('studentDocId') };
  }

  if (mode === 'new') {
    const result = await db.runTransaction(async (tx) => {
      const counterRef = db.doc('config/counters');
      const counterSnap = await tx.get(counterRef);
      const next = ((counterSnap.get('studentSeq') as number | undefined) ?? 0) + 1;
      tx.set(counterRef, { studentSeq: next }, { merge: true });

      const studentCode = `ODG-${String(next).padStart(6, '0')}`;
      const studentRef = db.collection('students').doc();
      const now = admin.firestore.FieldValue.serverTimestamp();

      tx.set(studentRef, {
        studentCode,
        name,
        dob,
        phone,
        email: email.toLowerCase(),
        linkedUids: [uid],
        enrolledCourseIds: [],
        createdAt: now,
        updatedAt: now,
      });

      tx.set(uidDocRef, {
        studentDocId: studentRef.id,
        linkedAt: now,
      });

      return { studentDocId: studentRef.id, studentCode };
    });

    return { status: 'created', ...result };
  }

  const candidates = await db
    .collection('students')
    .where('email', '==', email.toLowerCase())
    .where('phone', '==', phone)
    .where('dob', '==', dob)
    .limit(1)
    .get();

  if (candidates.empty) {
    throw new HttpsError('not-found', 'No matching student profile found');
  }

  const studentRef = candidates.docs[0].ref;
  await db.runTransaction(async (tx) => {
    const now = admin.firestore.FieldValue.serverTimestamp();
    tx.update(studentRef, {
      linkedUids: admin.firestore.FieldValue.arrayUnion(uid),
      updatedAt: now,
    });
    tx.set(uidDocRef, { studentDocId: studentRef.id, linkedAt: now });
  });

  return { status: 'linked', studentDocId: studentRef.id };
});

export const enrollInCourse = onCall<{ courseId: string; paymentVerified?: boolean }>(async (request) => {
  const uid = requireUid(request.auth);
  const { courseId, paymentVerified } = request.data;
  if (!courseId) {
    throw new HttpsError('invalid-argument', 'courseId is required');
  }

  const uidDoc = await db.doc(`uidMap/${uid}`).get();
  if (!uidDoc.exists) {
    throw new HttpsError('failed-precondition', 'Student profile not linked');
  }

  const studentDocId = uidDoc.get('studentDocId') as string;
  const courseRef = db.doc(`courses/${courseId}`);
  const studentRef = db.doc(`students/${studentDocId}`);

  await db.runTransaction(async (tx) => {
    const [courseSnap, studentSnap] = await Promise.all([tx.get(courseRef), tx.get(studentRef)]);
    if (!courseSnap.exists || !courseSnap.get('isPublished')) {
      throw new HttpsError('not-found', 'Course not available');
    }
    const isFree = Boolean(courseSnap.get('isFree'));
    if (!isFree && !paymentVerified) {
      throw new HttpsError('failed-precondition', 'Payment verification required');
    }
    if (!studentSnap.exists) {
      throw new HttpsError('not-found', 'Student profile not found');
    }

    tx.update(studentRef, {
      enrolledCourseIds: admin.firestore.FieldValue.arrayUnion(courseId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return { status: 'enrolled', courseId };
});

export const updateBanner = onCall<{
  bannerId: string;
  imageUrl: string;
  courseLink?: string;
  order?: number;
  style?: string;
  isActive?: boolean;
}>(async (request) => {
  const uid = requireUid(request.auth);
  if (!(await isAdmin(uid))) {
    throw new HttpsError('permission-denied', 'Admin access required');
  }

  const { bannerId, imageUrl, courseLink, order, style, isActive } = request.data;
  if (!bannerId || !imageUrl) {
    throw new HttpsError('invalid-argument', 'bannerId and imageUrl are required');
  }

  await db.doc(`banners/${bannerId}`).set(
    {
      imageUrl,
      courseLink: courseLink ?? null,
      order: order ?? 0,
      style: style ?? 'default',
      isActive: isActive ?? true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { status: 'updated', bannerId };
});

export const createRazorpayOrder = onCall<{ amount: number; currency?: string; receipt: string }>(
  { secrets: [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET] },
  async (request) => {
    requireUid(request.auth);
    const { amount, currency, receipt } = request.data;
    if (!amount || !receipt) {
      throw new HttpsError('invalid-argument', 'amount and receipt are required');
    }

    const razorpay = new Razorpay({
      key_id: RAZORPAY_KEY_ID.value(),
      key_secret: RAZORPAY_KEY_SECRET.value(),
    });

    const order = await razorpay.orders.create({
      amount,
      currency: currency ?? 'INR',
      receipt,
    });

    return order;
  },
);

export const verifyRazorpayPayment = onCall<{
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}>(
  { secrets: [RAZORPAY_KEY_SECRET] },
  async (request) => {
    requireUid(request.auth);
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = request.data;
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new HttpsError('invalid-argument', 'Invalid payment verification payload');
    }

    const crypto = await import('node:crypto');
    const digest = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET.value())
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (digest !== razorpaySignature) {
      throw new HttpsError('permission-denied', 'Signature verification failed');
    }

    return { verified: true };
  },
);
