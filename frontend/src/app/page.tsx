// frontend/src/app/page.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

interface JwtPayload {
  is_admin?: boolean;
}

function parseJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  try {
    const payload = Buffer.from(parts[1], "base64url").toString("utf-8");
    return JSON.parse(payload) as JwtPayload;
  } catch {
    return null;
  }
}

export default function HomePage(): null {
  const token = cookies().get("access_token")?.value;
  // CI/CD webhook smoke test: keep this branch lightweight and side-effect free.
  // Automated deploy verification: this comment should not change runtime behavior.
  if (token) {
    const payload = parseJwtPayload(token);
    if (payload?.is_admin) {
      redirect("/admin");
    }
  }
  // Keep the storefront landing route on products by default.
  redirect("/products");
}
