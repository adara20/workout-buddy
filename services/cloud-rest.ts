import { repository } from './repository';
import { getToken } from './auth';
import { auth } from './firebase-config';

const DB_URL = import.meta.env.VITE_FIREBASE_DATABASE_URL.endsWith('/') 
  ? import.meta.env.VITE_FIREBASE_DATABASE_URL 
  : `${import.meta.env.VITE_FIREBASE_DATABASE_URL}/`;

export interface CloudData {
  pillars: any[];
  accessories: any[];
  sessions: any[];
  config: any;
  updatedAt: number;
}

/**
 * Uploads all local Dexie data to the user's private path in Realtime Database.
 */
export async function uploadToCloud(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required for upload');

  const token = await getToken();
  if (!token) throw new Error('Failed to retrieve authentication token');

  const data: CloudData = {
    pillars: await repository.getAllPillars(),
    accessories: await repository.getAllAccessories(),
    sessions: await repository.getAllSessions(),
    config: await repository.getConfig() || {},
    updatedAt: Date.now()
  };

  const url = `${DB_URL}users/${user.uid}.json?auth=${token}`;
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
}

/**
 * Downloads data from the cloud and overwrites local Dexie tables.
 * Returns true if data was found and restored, false if no cloud data exists.
 */
export async function downloadFromCloud(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required for download');

  const token = await getToken();
  if (!token) throw new Error('Failed to retrieve authentication token');

  const url = `${DB_URL}users/${user.uid}.json?auth=${token}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }

  const data: CloudData | null = await response.json();
  if (!data) return false;

  // Overwrite local data using transactions for safety
  await repository.runTransaction('rw', ['pillars', 'accessories', 'sessions', 'config'], async () => {
    if (data.pillars) {
      await repository.clearPillars();
      await repository.bulkPutPillars(data.pillars);
    }
    if (data.accessories) {
      await repository.clearAccessories();
      await repository.bulkPutAccessories(data.accessories);
    }
    if (data.sessions) {
      await repository.clearSessions();
      // Restore empty arrays that Firebase RTDB strips
      const sanitizedSessions = data.sessions.map(s => ({
        ...s,
        pillarsPerformed: s.pillarsPerformed || [],
        accessoriesPerformed: s.accessoriesPerformed || []
      }));
      await repository.bulkPutSessions(sanitizedSessions);
    }
    if (data.config) {
      // Ensure we preserve the local 'main' ID for config
      await repository.putConfig({ ...data.config, id: 'main' });
    }
  });

  return true;
}
