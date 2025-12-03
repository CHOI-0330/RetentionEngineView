import { apiFetch } from "../../../lib/apiClient";
import type { MbtiType } from "../../../domain/mbti.types";

/**
 * MBTI API 게이트웨이
 * retention-engine-server의 /users/mbti 엔드포인트와 통신합니다.
 */

interface GetMbtiResponse {
  mbti: MbtiType | null;
}

interface UpdateMbtiRequest {
  mbti: MbtiType;
  userId?: string; // 개발 환경에서 인증 우회용
}

interface UpdateMbtiResponse {
  message: string;
}

/**
 * MBTI 조회
 * @param userId 사용자 ID
 * @param accessToken 액세스 토큰 (옵션)
 * @returns MBTI 타입 또는 null
 */
export async function getMbti(
  userId: string,
  accessToken?: string
): Promise<MbtiType | null> {
  try {
    const response = await apiFetch<GetMbtiResponse>(
      `/users/mbti?userId=${userId}`,
      { method: "GET" },
      accessToken
    );
    return response.mbti;
  } catch (error) {
    console.error("Failed to fetch MBTI:", error);
    throw error;
  }
}

/**
 * MBTI 갱신
 * @param userId 사용자 ID
 * @param mbti MBTI 타입
 * @param accessToken 액세스 토큰 (옵션)
 */
export async function updateMbti(
  userId: string,
  mbti: MbtiType,
  accessToken?: string
): Promise<void> {
  try {
    const body: UpdateMbtiRequest = {
      mbti,
      userId, // 개발 환경에서 인증 우회를 위해 userId 포함
    };

    await apiFetch<UpdateMbtiResponse>(
      "/users/mbti",
      {
        method: "PUT",
        body: JSON.stringify(body),
      },
      accessToken
    );
  } catch (error) {
    console.error("Failed to update MBTI:", error);
    throw error;
  }
}
