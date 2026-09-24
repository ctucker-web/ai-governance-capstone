import { redirect } from "next/navigation";
import { getActor } from "@/modules/auth/session";
import { AppError } from "@/modules/auth/policy";
import GovernanceApp from "@/components/governance-app";
import { getWorkspace, type Workspace } from "@/modules/workflow/service";
export const dynamic = "force-dynamic";
export default async function Page() {
  let workspace;
  try {
    workspace = await getWorkspace(await getActor());
  } catch (e) {
    if (e instanceof AppError && e.status === 401) redirect("/login");
    throw e;
  }
  return (
    <GovernanceApp
      initial={JSON.parse(JSON.stringify(workspace)) as Workspace}
    />
  );
}
