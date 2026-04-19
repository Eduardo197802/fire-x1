import AdminDashboardClient from "./AdminDashboardClient";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findActiveAdminById } from "../../../services/admin-users";
import { decodeAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } from "../../../services/admin-session";

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value || "";
  const session = decodeAdminSessionToken(sessionToken);

  if (!session?.userId) {
    redirect("/admin");
  }

  const admin = await findActiveAdminById(session.userId);
  if (!admin || !admin.twofa_ativo) {
    redirect("/admin");
  }

  return <AdminDashboardClient />;
}
