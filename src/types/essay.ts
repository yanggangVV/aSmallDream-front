export interface Post {
  /** 帖子唯一ID */
  id: string;
  /** 帖子标题 */
  title: string;
  /** 作者ID */
  author_id: string;
  /** 作者名称 */
  author_name: string;
  /** 作者头像URL */
  author_avatar: string;
  /** 帖子内容 */
  ocontent: string;
  /** 创建时间 */
  ocreate_time: string;
  /** 帖子标签，多个标签以逗号分隔 */
  otag: number;
  /** 帖子状态：草稿或已发布 */
  ostatus: "draft" | "published";
  /** 点赞数量 */
  likes_count?: number;
  /** 评论数量 */
  comments_count?: number;
  /** 当前用户是否已点赞 */
  isLiked?: boolean;
  /** 帖子图片URL数组 */
  images?: string[];
  /** 分享图片数据 */
  shareImageData?: string;
}

export interface Comment {
  /** 评论唯一ID */
  oid: string;
  /** 关联的帖子ID */
  opost_id: string;
  /** 评论用户ID */
  ouser_id: string;
  /** 评论用户名称 */
  user_name: string;
  /** 评论内容 */
  ocontent: string;
  /** 评论创建时间 */
  ocreate_time: string;
}

export interface Like {
  /** 点赞记录唯一ID */
  oid: string;
  /** 被点赞的帖子ID */
  opost_id: string;
  /** 点赞用户ID */
  ouser_id: string;
  /** 点赞时间 */
  ocreate_time: string;
}
