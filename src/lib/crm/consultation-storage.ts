import fs from 'fs';
import path from 'path';

export interface StoredConsultation {
  id: string;
  customer_name: string;
  phone: string;
  email?: string | null;
  preferred_language?: string | null;
  preferred_date?: string | null;
  preferred_time?: string | null;
  services_requested?: string[];
  notes?: string | null;
  status: 'new' | 'contacted' | 'booked' | 'declined' | 'archived';
  source: string;
  created_at: string;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const CONSULTATIONS_FILE = path.join(DATA_DIR, 'consultations.json');

export function loadStoredConsultations(): StoredConsultation[] {
  try {
    if (fs.existsSync(CONSULTATIONS_FILE)) {
      const content = fs.readFileSync(CONSULTATIONS_FILE, 'utf-8');
      const data = JSON.parse(content);
      return Array.isArray(data) ? data : [];
    }
  } catch {}
  return [];
}

export function saveStoredConsultation(consultation: StoredConsultation): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const current = loadStoredConsultations();
    const updated = [consultation, ...current.filter((c) => c.id !== consultation.id)];
    fs.writeFileSync(CONSULTATIONS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Consultation Storage Warning]:', err);
  }
}
