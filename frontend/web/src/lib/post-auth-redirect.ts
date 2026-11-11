import { getMe } from "@/lib/api";

export async function getPostAuthPath(): Promise<"/onboarding" | "/dashboard"> {
  try {
    const me = await getMe();
    return me.business ? "/dashboard" : "/onboarding";
  } catch {
    return "/onboarding";
  }
}
