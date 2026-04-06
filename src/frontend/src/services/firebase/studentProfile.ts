import { httpsCallable } from 'firebase/functions';
import { firebaseFunctions } from './config';

export type StudentProfileInput = {
  name: string;
  dob: string;
  phone: string;
  email: string;
  mode: 'new' | 'link';
};

export async function createOrLinkStudentProfile(payload: StudentProfileInput) {
  const callable = httpsCallable<StudentProfileInput, { status: string }>(
    firebaseFunctions,
    'createOrLinkStudentProfile',
  );
  const response = await callable(payload);
  return response.data;
}
