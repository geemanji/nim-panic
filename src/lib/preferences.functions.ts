import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const VALID_CATEGORIES = ["SPORTS", "CRYPTO", "ESPORTS", "TECH", "CULTURE", "WORLD"] as const;

/** Return the signed-in user's preferences, creating a default row if absent. */
export const getUserPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data } = await supabaseAdmin
      .from("user_preferences")
      .select("onboarding_complete, preferred_categories, updated_at")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!data) {
      // First-time: insert a default row and return defaults.
      await supabaseAdmin
        .from("user_preferences")
        .insert({ user_id: context.userId, onboarding_complete: false, preferred_categories: [] });
      return { onboardingComplete: false, preferredCategories: [] as string[] };
    }

    return {
      onboardingComplete: Boolean(data.onboarding_complete),
      preferredCategories: (data.preferred_categories ?? []) as string[],
    };
  });

/** Persist the user's chosen categories and mark onboarding complete. */
export const saveUserPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        preferredCategories: z
          .array(z.enum(VALID_CATEGORIES))
          .min(1, "Pick at least one category.")
          .max(6),
        onboardingComplete: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("user_preferences")
      .upsert(
        {
          user_id: context.userId,
          preferred_categories: data.preferredCategories,
          onboarding_complete: data.onboardingComplete ?? true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (error) throw new Error("Could not save your preferences. Please try again.");
    return { ok: true };
  });
