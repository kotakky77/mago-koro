import { app } from "./app";
import { sendBirthdayNotices } from "./scheduled";
import type { Env } from "./types";

export default {
  fetch: app.fetch,
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(
      (async () => {
        const result = await sendBirthdayNotices(env, new Date(controller.scheduledTime));
        console.log("birthday notices", result);
      })(),
    );
  },
} satisfies ExportedHandler<Env>;
