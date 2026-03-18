import { redirect } from "next/navigation";

export default function AdminAuthLoginRedirectPage(): null {
  redirect("/admin/login");
}
