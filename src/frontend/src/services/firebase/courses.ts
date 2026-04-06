import { httpsCallable } from 'firebase/functions';
import { firebaseFunctions } from './config';

export async function enrollInCourse(courseId: string, paymentVerified = false) {
  const callable = httpsCallable<{ courseId: string; paymentVerified?: boolean }, { status: string }>(
    firebaseFunctions,
    'enrollInCourse',
  );
  const response = await callable({ courseId, paymentVerified });
  return response.data;
}
