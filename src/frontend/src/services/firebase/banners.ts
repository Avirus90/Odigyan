import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { firestore } from './config';

export type BannerRecord = {
  id: string;
  imageUrl: string;
  courseLink?: string;
  order: number;
  style?: string;
  isActive: boolean;
};

export function subscribeToActiveBanners(onData: (banners: BannerRecord[]) => void) {
  const bannersRef = collection(firestore, 'banners');
  const q = query(bannersRef, where('isActive', '==', true), orderBy('order', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const banners = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<BannerRecord, 'id'>),
    }));
    onData(banners);
  });
}
