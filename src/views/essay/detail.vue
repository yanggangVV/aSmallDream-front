<template>
  <div class="essay-detail-container">
    <el-card class="detail-card">
      <!-- 文章头部 -->
      <template #header>
        <div
          class="flex flex-col sm:flex-row justify-between items-start sm:items-center"
        >
          <h1 class="text-xl sm:text-2xl font-bold mb-2 sm:mb-0">
            {{ post.otitle }}
          </h1>
          <div class="flex items-center text-gray-500 text-sm">
            <span>{{ formatDate(post.ocreate_time) }}</span>
            <el-tag size="small" class="mx-2">{{ post.otags }}</el-tag>
            <span>作者：{{ post.author_name }}</span>
          </div>
        </div>
      </template>

      <!-- 文章内容 -->
      <div class="content-wrapper">
        <div class="post-content text-base leading-relaxed">
          {{ post.ocontent }}
        </div>

        <!-- 点赞按钮 -->
        <div class="flex justify-center my-6">
          <el-button
            type="primary"
            :icon="ThumbUp"
            circle
            @click="handleLike"
            :loading="likeLoading"
          />
          <span class="ml-2 text-gray-500">{{ post.likes_count || 0 }}</span>
        </div>

        <!-- 评论区 -->
        <div class="comments-section mt-8">
          <h3 class="text-lg font-bold mb-4">评论区</h3>

          <!-- 发表评论 -->
          <div class="comment-form mb-6">
            <el-input
              v-model="commentContent"
              type="textarea"
              :rows="2"
              placeholder="写下你的评论..."
              resize="none"
            />
            <div class="flex justify-end mt-2">
              <el-button
                type="primary"
                @click="submitComment"
                :loading="commentLoading"
              >
                发表评论
              </el-button>
            </div>
          </div>

          <!-- 评论列表 -->
          <div class="comments-list">
            <div
              v-for="comment in comments"
              :key="comment.oid"
              class="comment-item mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded"
            >
              <div class="flex justify-between items-start mb-2">
                <span class="font-bold">{{ comment.user_name }}</span>
                <span class="text-sm text-gray-500">
                  {{ formatDate(comment.ocreate_time) }}
                </span>
              </div>
              <p class="text-gray-700 dark:text-gray-300">
                {{ comment.ocontent }}
              </p>
            </div>
          </div>

          <!-- 加载更多评论 -->
          <div v-if="hasMoreComments" class="text-center mt-4">
            <el-button link @click="loadMoreComments" :loading="loadingMore">
              加载更多评论
            </el-button>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { Post, Comment } from "@/types/essay";
import { ElMessage } from "element-plus";
import {
  Search,
  Plus,
  Message,
  Camera,
  Pointer as ThumbUp,
  ChatRound,
  Loading,
  ArrowUp,
} from "@element-plus/icons-vue";

const route = useRoute();
const router = useRouter();
const postId = route.params.id as string;

// 文章数据
const post = ref<Post>({} as Post);
const likeLoading = ref(false);

// 评论相关
const commentContent = ref("");
const commentLoading = ref(false);
const comments = ref<Comment[]>([]);
const commentPage = ref(1);
const commentPageSize = ref(10);
const hasMoreComments = ref(true);
const loadingMore = ref(false);

// 获取文章详情
const fetchPostDetail = async () => {
  try {
    const response = await fetch(`/api/essays/${postId}`);
    const data = await response.json();
    post.value = data;
  } catch (error) {
    console.error("获取文章详情失败：", error);
    ElMessage.error("获取文章详情失败");
  }
};

// 获取评论列表
const fetchComments = async (loadMore = false) => {
  if (loadMore) {
    loadingMore.value = true;
  }
  try {
    const response = await fetch(
      `/api/essays/${postId}/comments?page=${commentPage.value}&size=${commentPageSize.value}`
    );
    const data = await response.json();

    if (loadMore) {
      comments.value.push(...data.content);
    } else {
      comments.value = data.content;
    }

    hasMoreComments.value = data.content.length === commentPageSize.value;
  } catch (error) {
    console.error("获取评论失败：", error);
    ElMessage.error("获取评论失败");
  } finally {
    loadingMore.value = false;
  }
};

// 加载更多评论
const loadMoreComments = async () => {
  commentPage.value += 1;
  await fetchComments(true);
};

// 提交评论
const submitComment = async () => {
  if (!commentContent.value.trim()) {
    ElMessage.warning("请输入评论内容");
    return;
  }

  commentLoading.value = true;
  try {
    await fetch(`/api/essays/${postId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ocontent: commentContent.value,
      }),
    });

    ElMessage.success("评论成功");
    commentContent.value = "";
    commentPage.value = 1;
    await fetchComments();
  } catch (error) {
    console.error("发表评论失败：", error);
    ElMessage.error("发表评论失败");
  } finally {
    commentLoading.value = false;
  }
};

// 点赞
const handleLike = async () => {
  likeLoading.value = true;
  try {
    await fetch(`/api/essays/${postId}/like`, {
      method: "POST",
    });
    await fetchPostDetail();
    ElMessage.success("点赞成功");
  } catch (error) {
    console.error("点赞失败：", error);
    ElMessage.error("点赞失败");
  } finally {
    likeLoading.value = false;
  }
};

// 格式化日期
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString();
};

onMounted(() => {
  fetchPostDetail();
  fetchComments();
});
</script>

<style scoped>
.essay-detail-container {
  max-width: 1000px;
  padding: 10px;
  margin: 0 auto;
}

@media (width >= 640px) {
  .essay-detail-container {
    padding: 20px;
  }
}

.detail-card {
  margin-bottom: 20px;
}

.content-wrapper {
  max-width: 100%;
}

.post-content {
  color: var(--el-text-color-primary);
  word-break: break-word;
  white-space: pre-wrap;
}

.comment-item {
  transition: all 0.3s ease;
}

.comment-item:hover {
  transform: translateX(4px);
}

/* 适配深色模式 */
:deep(.el-textarea__wrapper) {
  background-color: var(--el-bg-color);
}
</style>
