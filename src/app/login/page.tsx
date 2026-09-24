import Login from "@/components/login";
import { demoEnabled } from "@/modules/auth/session";
export const dynamic = "force-dynamic";
export default function Page() {
  return <Login enabled={demoEnabled()} />;
}
