import client from "./axiosClient";

export const getGamification = () => client.get("/gamification");
export const recordActivity = () =>
  client.patch("/gamification", { action_type: "record_activity" });
export const claimReward = (rewardId) =>
  client.patch("/gamification", { action_type: "claim_reward", reward_id: rewardId });
export const resetStreak = () =>
  client.patch("/gamification", { action_type: "reset_streak" });
