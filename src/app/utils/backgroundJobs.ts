export type BackgroundJobStatus = "active" | "success" | "exception";

export type BackgroundJob = {
  id: string;
  title: string;
  description: string;
  percent: number;
  status: BackgroundJobStatus;
  sessionId?: string;
  startedAt: number;
  updatedAt: number;
  finishedAt?: number;
};

const STORAGE_KEY = "admin_background_jobs";
const EVENT_NAME = "admin-background-jobs-change";
const FINISHED_TTL = 10 * 60 * 1000;
const SESSION_ID = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const isClient = () => typeof window !== "undefined";

const normalizeJobs = (jobs: BackgroundJob[]) => {
  const now = Date.now();
  return jobs.filter((job) => job.status === "active" || !job.finishedAt || now - job.finishedAt < FINISHED_TTL);
};

export const getBackgroundJobs = (): BackgroundJob[] => {
  if (!isClient()) return [];
  try {
    return normalizeJobs(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
  } catch {
    return [];
  }
};

const emitChange = () => {
  if (!isClient()) return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
};

const writeBackgroundJobs = (jobs: BackgroundJob[]) => {
  if (!isClient()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeJobs(jobs)));
  emitChange();
};

export const startBackgroundJob = (job: {
  id?: string;
  title: string;
  description: string;
  percent?: number;
}) => {
  const id = job.id || `job-${Date.now()}`;
  const now = Date.now();
  const jobs = getBackgroundJobs().filter((item) => item.id !== id);
  writeBackgroundJobs([
    ...jobs,
    {
      id,
      title: job.title,
      description: job.description,
      percent: job.percent ?? 0,
      status: "active",
      sessionId: SESSION_ID,
      startedAt: now,
      updatedAt: now,
    },
  ]);
  return id;
};

export const updateBackgroundJob = (id: string, patch: Partial<Pick<BackgroundJob, "description" | "percent" | "status">>) => {
  const jobs = getBackgroundJobs().map((job) =>
    job.id === id
      ? {
          ...job,
          ...patch,
          updatedAt: Date.now(),
        }
      : job,
  );
  writeBackgroundJobs(jobs);
};

export const finishBackgroundJob = (
  id: string,
  patch: Partial<Pick<BackgroundJob, "description" | "percent" | "status">> = {},
) => {
  const now = Date.now();
  const jobs = getBackgroundJobs().map((job) =>
    job.id === id
      ? {
          ...job,
          ...patch,
          percent: patch.percent ?? 100,
          status: patch.status ?? "success",
          updatedAt: now,
          finishedAt: now,
        }
      : job,
  );
  writeBackgroundJobs(jobs);
};

export const clearBackgroundJob = (id: string) => {
  writeBackgroundJobs(getBackgroundJobs().filter((job) => job.id !== id));
};

export const hasActiveBackgroundJobs = () => getBackgroundJobs().some((job) => job.status === "active");

export const markInterruptedBackgroundJobs = () => {
  const now = Date.now();
  const jobs = getBackgroundJobs().map((job) =>
    job.status === "active" && job.sessionId !== SESSION_ID
      ? {
          ...job,
          status: "exception" as BackgroundJobStatus,
          percent: 100,
          description: "Tác vụ đã bị gián đoạn do reload hoặc đóng tab trước khi hoàn tất.",
          updatedAt: now,
          finishedAt: now,
        }
      : job,
  );
  writeBackgroundJobs(jobs);
};

export const subscribeBackgroundJobs = (callback: () => void) => {
  if (!isClient()) return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback();
  };
  window.addEventListener(EVENT_NAME, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT_NAME, callback);
    window.removeEventListener("storage", onStorage);
  };
};
