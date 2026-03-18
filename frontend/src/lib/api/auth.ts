import { AxiosError } from "axios";

import api from "@/lib/api/axios";
import { LoginRequest, LoginResponse, MeResponse, RegisterRequest, User } from "@/types/auth";

export async function login(request: LoginRequest): Promise<LoginResponse> {
  try {
    const { data } = await api.post<LoginResponse>("/api/users/login", request);
    return data;
  } catch (e) {
    const err = e as AxiosError<{ detail?: string }>;
    if (err.response?.status === 401) {
      throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
    }
    throw new Error("로그인에 실패했습니다. 잠시 후 다시 시도해주세요.");
  }
}

export async function register(request: RegisterRequest): Promise<User> {
  try {
    const { data } = await api.post<User>("/api/users/register", request);
    return data;
  } catch (e) {
    const err = e as AxiosError<{ detail?: string }>;
    if (err.response?.status === 409) {
      throw new Error("이미 사용 중인 이메일입니다.");
    }
    if (err.response?.status === 422) {
      const detail = err.response.data?.detail;
      throw new Error(typeof detail === "string" ? detail : "입력값을 다시 확인해주세요.");
    }
    throw new Error("회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.");
  }
}

export async function me(token: string): Promise<User> {
  try {
    const { data } = await api.get<MeResponse>("/api/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    return {
      id: data.user_id,
      email: data.email,
      username: data.username,
      is_active: true,
      is_admin: data.is_admin,
      created_at: new Date().toISOString(),
    };
  } catch {
    throw new Error("사용자 정보를 불러오지 못했습니다.");
  }
}

export async function logout(): Promise<void> {
  try {
    await api.post("/api/users/logout");
  } catch {
    // 서버 로그아웃 실패 시에도 클라이언트 상태는 정리
  }
}
