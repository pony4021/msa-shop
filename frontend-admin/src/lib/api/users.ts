// frontend-admin/src/lib/api/users.ts
import api from "@/lib/api/axios";

export interface PublicUser {
  id: string;
  email: string;
  username: string;
}

export interface AdminUser extends PublicUser {
  is_active: boolean;
  is_admin: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getUserById(userId: string): Promise<PublicUser | null> {
  try {
    const { data } = await api.get<PublicUser>(`/api/users/${userId}`);
    return data;
  } catch {
    return null;
  }
}

export async function getAdminUsers(page = 1, size = 100): Promise<AdminUser[]> {
  try {
    const { data } = await api.get<AdminUser[]>(`/api/users/admin/list?page=${page}&size=${size}`);
    return data;
  } catch {
    throw new Error("사용자 목록을 불러오지 못했습니다.");
  }
}
