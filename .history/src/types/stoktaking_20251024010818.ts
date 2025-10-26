export type StocktakingSession = {
  sessionId: string;
  status: "in-progress" | "paused" | "finished" | "approved";
  startedBy: string;
  startedAt: string;
  pausedBy?: string;
  pausedReason?: string;
  finishedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  progress: {
    totalItems: number;
    countedItems: number;
  };
};