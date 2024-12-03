import request from "@/utils/request";

const USER_BASE_URL = "/api/essay/posts";

class EssayAPI {
  /**
   * 获取帖子分页列表
   *
   * @param queryParams 查询参数
   */
  static getPage(queryParams: PostPageQuery) {
    return request<any, PageResult<EssayPost[]>>({
      url: `${USER_BASE_URL}/page`,
      method: "get",
      params: queryParams,
    });
  }
  /**
   * 获取帖子表单详情
   *
   * @param id 帖子ID
   * @returns 帖子表单详情
   */
  static getFormData(id: number) {
    return request<any, EssayPost>({
      url: `${USER_BASE_URL}/${id}`,
      method: "get",
    });
  }
  /**
   * 添加或更新帖子
   *
   * @param data 帖子表单数据
   * @returns Promise
   */
  static addOrUpdate(data: EssayPost) {
    return request({
      url: USER_BASE_URL,
      method: "post",
      data: data,
    });
  }

  /**
   * 批量删除帖子，多个以英文逗号(,)分割
   *
   * @param ids 帖子ID字符串，多个以英文逗号(,)分割
   */
  static deleteByIds(ids: string) {
    return request({
      url: `${USER_BASE_URL}/${ids}`,
      method: "delete",
    });
  }
}

export default EssayAPI;
/**
 * 文章分页查询对象
 */
export interface PostPageQuery extends PageQuery {
  /** 帖子唯一ID */
  id?: number;
  /** 帖子标题 */
  title?: string;
  /** 帖子内容 */
  content?: string;
  /** 作者ID */
  authorId?: string;
  /** 帖子标签，多个标签以逗号分隔 */
  tag?: number;
  /** 帖子状态：未发布或已发布 */
  status?: number;
  /** 点赞数量 */
  likesCount?: number;
  /** 评论数量 */
  commentsCount?: number;
  /** 创建时间 */
  createTime?: string;
}
/** 文章帖子信息 */
export interface EssayPost {
  /** 帖子唯一ID */
  id?: number;
  /** 帖子标题 */
  title?: string;
  /** 帖子内容 */
  content?: string;
  /** 作者ID */
  authorId?: number;
  /** 创建时间 */
  createTime?: Date;
  /** 帖子标签，多个标签以逗号分隔 */
  tag?: number;
  /** 帖子状态：未发布或已发布 */
  status?: number;
  /** 点赞数量 */
  likesCount?: number;
  /** 评论数量 */
  commentsCount?: number;
}
/** 文章帖子评论信息 */
export interface Comment {
  /** 评论唯一ID */
  id?: number;
  /** 关联的帖子ID */
  postId?: number;
  /** 评论用户ID */
  userId?: number;
  /** 评论内容 */
  content?: string;
  /** 评论创建时间 */
  createTime?: Date;
}

/** 文章帖子点赞信息 */
export interface Like {
  /** 点赞记录唯一ID */
  id?: number;
  /** 被点赞的帖子ID */
  postId?: number;
  /** 点赞用户ID */
  userId?: number;
  /** 点赞时间 */
  createTime?: Date;
}
