import type { User } from "@supabase/supabase-js";

export type ProfileRole = "user" | "admin";

export type AppVariables = {
  accessToken: string;
  user: User;
  profileRole?: ProfileRole;
};
