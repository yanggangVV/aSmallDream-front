<template>
  <div class="essay-container">
    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索内容..."
        class="search-input"
        clearable
        @input="handleSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select
        v-model="searchType"
        placeholder="筛选类型"
        class="search-select"
      >
        <el-option label="按日期" value="date" />
        <el-option label="按用户" value="user" />
        <el-option label="按内容" value="content" />
      </el-select>
      <el-button type="primary" @click="router.push('/essay/create')">
        <el-icon><Plus /></el-icon>
        <span class="hidden sm:inline">发布文章</span>
      </el-button>
    </div>

    <!-- 文章列表 -->
    <div
      class="essay-list"
      v-infinite-scroll="loadMore"
      :infinite-scroll-disabled="loading"
    >
      <div v-for="post in posts" :key="post.oid" class="essay-item">
        <div class="essay-header">
          <div class="user-info" @click="goToUserProfile(post.oauthor_id)">
            <el-avatar :src="post.author_avatar" :size="40" />
            <div class="user-meta">
              <span class="user-name">{{ post.author_name }}</span>
              <div class="post-meta">
                <span class="post-time">
                  {{ formatDate(post.ocreate_time) }}
                </span>
                <div class="action-icons">
                  <el-tooltip content="发送留言">
                    <el-icon @click.stop="openMessageDialog(post)">
                      <Message />
                    </el-icon>
                  </el-tooltip>
                  <el-tooltip content="生成分享图">
                    <el-icon @click.stop="generateShareImage(post)">
                      <Camera />
                    </el-icon>
                  </el-tooltip>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="essay-content" @click="viewDetail(post.oid)">
          <p class="content-text">{{ post.ocontent }}</p>
          <!-- 如果有图片，显示图片网格 -->
          <div v-if="post.images && post.images.length" class="image-grid">
            <el-image
              v-for="(img, index) in post.images"
              :key="index"
              :src="img"
              :preview-src-list="post.images"
              fit="cover"
              class="grid-image"
            />
          </div>
        </div>

        <div class="essay-footer">
          <div class="interaction-btns">
            <el-button text @click="handleLike(post)">
              <el-icon :class="{ 'is-liked': post.isLiked }">
                <Pointer as ThumbUp />
              </el-icon>
              <span>{{ post.likes_count || 0 }}</span>
            </el-button>
            <el-button text @click="viewDetail(post.oid)">
              <el-icon><ChatRound /></el-icon>
              <span>{{ post.comments_count || 0 }}</span>
            </el-button>
          </div>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-more">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>加载中...</span>
      </div>
    </div>

    <!-- 返回顶部按钮 -->
    <el-backtop :right="20" :bottom="20">
      <el-icon><ArrowUp /></el-icon>
    </el-backtop>

    <!-- 发送留言对话框 -->
    <el-dialog
      v-model="messageDialogVisible"
      title="发送留言"
      width="90%"
      max-width="500px"
    >
      <el-form :model="messageForm">
        <el-form-item>
          <el-input
            v-model="messageForm.content"
            type="textarea"
            :rows="4"
            placeholder="请输入留言内容..."
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="messageDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            @click="sendMessage"
            :loading="sendingMessage"
          >
            发送
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 分享图预览对话框 -->
    <el-dialog
      v-model="shareImageDialogVisible"
      title="分享图片"
      width="90%"
      max-width="500px"
    >
      <div class="share-image-container" ref="shareImageRef">
        <div class="share-content">
          <!-- 分享图片内容 -->
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="shareImageDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="downloadShareImage">
            下载图片
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import { useRouter } from "vue-router";
import type { Post } from "@/types/essay";
import { ElMessage } from "element-plus";
import html2canvas from "html2canvas";
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
import { debounce } from "@/utils/debounce";

const router = useRouter();
const posts = ref<Post[]>([]);
const currentPage = ref(1);
const pageSize = ref(10);
const loading = ref(false);
const searchKeyword = ref("");
const searchType = ref("content");

// 留言相关
const messageDialogVisible = ref(false);
const messageForm = ref({ content: "", toUserId: "" });
const sendingMessage = ref(false);

// 分享图相关
const shareImageDialogVisible = ref(false);
const shareImageRef = ref<HTMLElement | undefined>();
const currentPost = ref<Post | undefined>();

// 搜索处理
const handleSearch = debounce(async () => {
  currentPage.value = 1;
  posts.value = [];
  await fetchPosts();
}, 300);

// 获取文章列表
const fetchPosts = async () => {
  if (loading.value) return;
  loading.value = true;

  try {
    const queryParams = new URLSearchParams({
      page: currentPage.value.toString(),
      size: pageSize.value.toString(),
      type: searchType.value,
      keyword: searchKeyword.value,
      status: "published",
      sort: "ocreate_time,desc",
    }).toString();

    const response = await fetch(`/api/essays?${queryParams}`);
    const data = await response.json();

    if (currentPage.value === 1) {
      posts.value = data.content;
    } else {
      posts.value.push(...data.content);
    }

    loading.value = data.content.length < pageSize.value;
  } catch (error) {
    console.error("获取文章列表失败：", error);
    ElMessage.error("获取文章列表失败");
    posts.value = [];
    loading.value = true;
  }
};

// 加载更多
const loadMore = async () => {
  // 只有在非加载状态且有更多数据时才继续加载
  if (!loading.value) {
    currentPage.value++;
    await fetchPosts();
  }
};

// 处理点赞
const handleLike = async (post: Post) => {
  try {
    await fetch(`/api/essays/${post.oid}/like`, { method: "POST" });
    post.likes_count = (post.likes_count || 0) + 1;
    post.isLiked = true;
  } catch (error) {
    console.error("点赞失败：", error);
    ElMessage.error("点赞失败");
  }
};

// 查看文章详情
const viewDetail = (id: string) => {
  router.push(`/essay/detail/${id}`);
};

// 跳转到用户主页
const goToUserProfile = (userId: string) => {
  router.push(`/user/profile/${userId}`);
};

// 打开留言对话框
const openMessageDialog = (post: Post) => {
  messageForm.value.toUserId = post.oauthor_id;
  messageDialogVisible.value = true;
};

// 发送留言
const sendMessage = async () => {
  if (!messageForm.value.content.trim()) {
    ElMessage.warning("请输入留言内容");
    return;
  }

  sendingMessage.value = true;
  try {
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messageForm.value),
    });
    ElMessage.success("留言发送成功");
    messageDialogVisible.value = false;
    messageForm.value.content = "";
  } catch (error) {
    console.error("发送留言失败：", error);
    ElMessage.error("发送留言失败");
  } finally {
    sendingMessage.value = false;
  }
};

// 生成分享图
const generateShareImage = async (post: Post) => {
  currentPost.value = post;
  shareImageDialogVisible.value = true;
  // 等待 DOM 更新
  await nextTick();
  if (shareImageRef.value) {
    try {
      const canvas = await html2canvas(shareImageRef.value);
      // 保存 canvas 数据用于下载
      currentPost.value.shareImageData = canvas.toDataURL("image/png");
    } catch (error) {
      console.error("生成分享图失败：", error);
      ElMessage.error("生成分享图失败");
    }
  }
};

// 下载分享图
const downloadShareImage = () => {
  if (currentPost.value?.shareImageData) {
    const link = document.createElement("a");
    link.download = `share-${currentPost.value.oid}.png`;
    link.href = currentPost.value.shareImageData;
    link.click();
  }
};

// 格式化日期
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString();
};

onMounted(() => {
  fetchPosts();
});
</script>

<style scoped>
.essay-container {
  max-width: 800px;
  padding: 16px;
  margin: 0 auto;
}

.search-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  gap: 12px;
  padding: 12px 0;
  margin-bottom: 20px;
  background: var(--el-bg-color);
}

.search-input {
  flex: 1;
}

.search-select {
  width: 120px;
}

.essay-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.essay-item {
  padding: 16px;
  background: var(--el-bg-color);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgb(0 0 0 / 5%);
  transition: all 0.3s ease;
}

.essay-item:hover {
  box-shadow: 0 4px 16px rgb(0 0 0 / 10%);
  transform: translateY(-2px);
}

.essay-header {
  margin-bottom: 12px;
}

.user-info {
  display: flex;
  gap: 12px;
  align-items: center;
  cursor: pointer;
}

.user-meta {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.post-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 0.9em;
  color: var(--el-text-color-secondary);
}

.action-icons {
  display: flex;
  gap: 8px;
  color: var(--el-text-color-secondary);
}

.action-icons .el-icon {
  padding: 4px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.action-icons .el-icon:hover {
  color: var(--el-color-primary);
  background: var(--el-fill-color-light);
}

.essay-content {
  cursor: pointer;
}

.content-text {
  margin-bottom: 12px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.grid-image {
  width: 100%;
  height: 150px;
  object-fit: cover;
  border-radius: 4px;
}

.essay-footer {
  padding-top: 12px;
  margin-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.interaction-btns {
  display: flex;
  gap: 16px;
}

.interaction-btns .el-button {
  display: flex;
  gap: 4px;
  align-items: center;
}

.is-liked {
  color: var(--el-color-primary);
}

.loading-more {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
  color: var(--el-text-color-secondary);
}

.share-image-container {
  padding: 20px;
  background: white;
  border-radius: 8px;
}

/* 移动端适配 */
@media (width <= 640px) {
  .essay-container {
    padding: 12px;
  }

  .search-bar {
    flex-wrap: wrap;
  }

  .search-select {
    width: 100%;
  }

  .image-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }

  .grid-image {
    height: 100px;
  }
}
</style>
