import fs from 'fs';
import path from 'path';

interface ModerationState {
  deletedIds: string[];
  statusOverrides: Record<string, boolean>; // reviewId -> isApproved
}

const STORAGE_PATH = path.resolve(process.cwd(), 'src/data/.review-moderation.json');

// In-memory fallback
let memoryState: ModerationState = {
  deletedIds: [],
  statusOverrides: {},
};

function readState(): ModerationState {
  try {
    if (fs.existsSync(STORAGE_PATH)) {
      const content = fs.readFileSync(STORAGE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        deletedIds: Array.isArray(parsed.deletedIds) ? parsed.deletedIds : [],
        statusOverrides: typeof parsed.statusOverrides === 'object' && parsed.statusOverrides ? parsed.statusOverrides : {},
      };
    }
  } catch (err) {
    // If filesystem not accessible, fall back to memory
  }
  return memoryState;
}

function writeState(state: ModerationState) {
  memoryState = state;
  try {
    const dir = path.dirname(STORAGE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STORAGE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    // Silently continue with memoryState
  }
}

export function isReviewDeleted(id: string): boolean {
  const state = readState();
  return state.deletedIds.includes(id);
}

export function getReviewApprovalOverride(id: string): boolean | undefined {
  const state = readState();
  return state.statusOverrides[id];
}

export function recordReviewApproval(id: string, isApproved: boolean): void {
  const state = readState();
  state.statusOverrides[id] = isApproved;
  // If previously marked deleted, undelete on explicit approval change
  state.deletedIds = state.deletedIds.filter((dId) => dId !== id);
  writeState(state);
}

export function recordReviewDeletion(id: string): void {
  const state = readState();
  if (!state.deletedIds.includes(id)) {
    state.deletedIds.push(id);
  }
  delete state.statusOverrides[id];
  writeState(state);
}

export function getModerationState(): ModerationState {
  return readState();
}
