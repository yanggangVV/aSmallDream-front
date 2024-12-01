import request from "@/utils/request";

const USER_BASE_URL = "/api/essay";

/**
 * 获取用户的文章相关信息
 * @param userId - 用户ID
 * @returns 返回用户的文章统计信息
 */
export const getEssayUserInfo = async (userId: string) => {
  const response = await fetch(`/api/essay/user/${userId}`);
  return response.json();
};

/**
 * 获取指定用户的文章列表
 * @param userId - 用户ID
 * @param params - 查询参数对象，可包含分页、排序等条件
 * @returns 返回文章列表数据
 */
export const getUserEssays = async (userId: string, params: any) => {
  const queryString = new URLSearchParams(params).toString();
  const response = await fetch(
    `/api/essay/user/${userId}/essays?${queryString}`
  );
  return response.json();
};
