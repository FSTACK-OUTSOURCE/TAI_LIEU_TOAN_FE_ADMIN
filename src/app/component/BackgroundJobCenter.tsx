"use client";

import { Progress } from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  BackgroundJob,
  clearBackgroundJob,
  getBackgroundJobs,
  hasActiveBackgroundJobs,
  markInterruptedBackgroundJobs,
  subscribeBackgroundJobs,
} from "../utils/backgroundJobs";
import styles from "../page.module.css";

export default function BackgroundJobCenter() {
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);

  const activeCount = useMemo(() => jobs.filter((job) => job.status === "active").length, [jobs]);

  useEffect(() => {
    const syncJobs = () => setJobs(getBackgroundJobs());
    markInterruptedBackgroundJobs();
    syncJobs();
    const unsubscribe = subscribeBackgroundJobs(syncJobs);

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasActiveBackgroundJobs()) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      unsubscribe();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  if (!jobs.length) return null;

  return (
    <div className={styles.backgroundJobCenter}>
      <div className={styles.backgroundJobHeader}>
        <div>
          <strong>Tiến trình nền</strong>
          <span>{activeCount ? `${activeCount} tác vụ đang chạy` : "Không còn tác vụ đang chạy"}</span>
        </div>
      </div>

      <div className={styles.backgroundJobList}>
        {jobs.map((job) => (
          <div className={styles.backgroundJobItem} key={job.id}>
            <div className={styles.backgroundJobTitleRow}>
              <strong>{job.title}</strong>
              {job.status !== "active" && (
                <button type="button" onClick={() => clearBackgroundJob(job.id)}>
                  ×
                </button>
              )}
            </div>
            <p>{job.description}</p>
            <Progress
              percent={job.percent}
              status={job.status === "exception" ? "exception" : job.status === "success" ? "success" : "active"}
              size="small"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
