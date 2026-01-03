
export type MuscleGroup = 'Legs' | 'Push' | 'Pull' | 'Core' | 'Full Body' | 'Conditioning';

export interface Pillar {
  id: string; // Stable string ID
  name: string;
  muscleGroup: MuscleGroup;
  cadenceDays: number;
  minWorkingWeight: number;
  regressionFloorWeight: number;
  prWeight: number;
  lastCountedAt: number | null; // Timestamp (epoch ms)
  lastLoggedAt: number | null;  // Timestamp (epoch ms)
  isActive?: boolean;
}

export interface Accessory {
  id: string; // Stable string ID
  name: string;
  tags: string[];
  pairingHints?: string[];
}

export interface PillarEntry {
  pillarId: string;
  name: string;
  weight: number;
  counted: boolean;
  isPR: boolean;
  warning: boolean;
}

export interface AccessoryEntry {
  accessoryId: string;
  name: string;
  didPerform: boolean;
}

export interface WorkoutSession {
  id?: string; 
  date: number; // epoch ms
  pillarsPerformed: PillarEntry[];
  accessoriesPerformed: AccessoryEntry[];
  calories?: number;
  durationMinutes?: number;
  notes?: string;
  isUntracked?: boolean;
}

export interface AppConfig {
  id: string;
  targetExercisesPerSession: number;
  seededAt?: number;
  lastExportAt?: number;
  appDataVersion?: number;
  storagePersisted?: boolean;
  deviceId?: string;
}

export interface ExportPayload {
  exportVersion: number;
  appVersion: string;
  appDataVersion: number;
  exportedAt: string;
  deviceId: string;
  data: {
    pillars: Pillar[];
    accessories: Accessory[];
    sessions: WorkoutSession[];
    config: AppConfig;
  };
}
