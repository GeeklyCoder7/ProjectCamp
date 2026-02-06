import cron from "node-cron";
import { ProjectInvitation } from "../src/models/invitation.models.js";

// This is a background job that runs every 10 minutes and checks for any pending invitations which are expired, and also marks them as expired
export const startInvitationExpiryJob = () => {
  const now = new Date();
  cron.schedule("*/10 * * * *", async () => {
    try {
      const updateResult = await ProjectInvitation.updateMany(
        {
          invitationStatus: "pending",
          expiresAt: { $lt: now },
        },
        {
          invitationStatus: "expired",
        },
      );

      // Means something is updated
      if (updateResult.modifiedCount > 0) {
        console.log(
          `[Invitation Expiry Job]: Expired ${updateResult.modifiedCount} invitation(s)`,
        );
      }
    } catch (error) {
      console.error(`[Invitation Expiry Job]: Failed to expire invitation(s)`);
    }
  });
};
