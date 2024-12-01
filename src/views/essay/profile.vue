<template>
  <div class="profile-container">
    <!-- 用户信息头部 -->
    <div class="user-header">
      <div class="user-info">
        <el-avatar :src="userInfo.avatar" :size="80" />
        <div class="user-meta">
          <h2 class="user-name">{{ userInfo.nickname }}</h2>
          <p class="user-bio">
            {{ userInfo.bio || "这个人很懒，什么都没写~" }}
          </p>
        </div>
      </div>
      <div class="user-stats">
        <div class="stat-item">
          <span class="stat-value">{{ userInfo.postCount || 0 }}</span>
          <span class="stat-label">文章</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ userInfo.likeCount || 0 }}</span>
          <span class="stat-label">获赞</span>
        </div>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索该用户的文章..."
        class="search-input"
        clearable
        @input="handleSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select
        v-model="searchDate"
        placeholder="选择时间"
        class="search-select"
      >
        <el-option label="全部时间" value="" />
        <el-option label="最近一周" value="week" />
        <el-option label="最近一月" value="month" />
        <el-option label="最近一年" value="year" />
      </el-select>
    </div>

    <!-- 文章列表 -->
    <div
      class="essay-list"
      v-infinite-scroll="loadMore"
      :infinite-scroll-disabled="loading"
    >
      <div v-for="post in posts" :key="post.oid" class="essay-item">
        <div class="essay-header">
          <div class="post-meta">
            <span class="post-time">{{ formatDate(post.ocreate_time) }}</span>
            <div class="action-icons">
              <el-tooltip content="生成分享图">
                <el-icon @click.stop="generateShareImage(post)">
                  <Camera />
                </el-icon>
              </el-tooltip>
              <el-tooltip v-if="isCurrentUser" content="编辑">
                <el-icon @click.stop="editPost(post)">
                  <Edit />
                </el-icon>
              </el-tooltip>
            </div>
          </div>
        </div>

        <div class="essay-content" @click="viewDetail(post.oid)">
          <p class="content-text">{{ post.ocontent }}</p>
          <!-- 图片网格 -->
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
                <Pointer />
              </el-icon>
              <span>{{ post.likes_count || 0 }}</span>
            </el-button>
            <el-button text @click="viewDetail(post.oid)">
              <el-icon><ChatLineRound /></el-icon>
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

      <!-- 无数据提示 -->
      <el-empty v-if="!loading && posts.length === 0" description="暂无文章" />
    </div>

    <!-- 返回顶部按钮 -->
    <el-backtop :right="20" :bottom="20">
      <el-icon><ArrowUp /></el-icon>
    </el-backtop>

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
          <div class="share-header">
            <el-avatar :src="userInfo.avatar" :size="40" />
            <div class="share-user-info">
              <span class="share-username">{{ userInfo.nickname }}</span>
              <span class="share-time">
                {{ formatDate(currentPost?.ocreate_time ?? "") }}
              </span>
            </div>
          </div>
          <div class="share-body">
            <p class="share-text">{{ currentPost?.ocontent }}</p>
            <div v-if="currentPost?.images?.length" class="share-images">
              <el-image
                v-for="(img, index) in currentPost.images"
                :key="index"
                :src="img"
                fit="cover"
              />
            </div>
          </div>
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
import { ref, onMounted, computed, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "@/store";
import type { Post } from "@/types/essay";
import { ElMessage } from "element-plus";
import html2canvas from "html2canvas";
import {
  Search,
  Camera,
  Edit,
  Pointer as ThumbsUp,
  ChatRound as ChatLineRound,
  Loading,
  ArrowUp,
} from "@element-plus/icons-vue";
import { debounce } from "lodash-es";
import { getEssayUserInfo, getUserEssays } from "@/api/essay";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

// 用户信息
const userInfo = ref<any>({});
const isCurrentUser = computed(
  () => String(userStore.user.userId) === route.params.id
);

// 文章列表相关
const posts = ref<Post[]>([]);
const currentPage = ref(1);
const pageSize = ref(10);
const loading = ref(false);
const searchKeyword = ref("");
const searchDate = ref("");

// 分享图相关
const shareImageDialogVisible = ref(false);
const shareImageRef = ref<HTMLElement>();
const currentPost = ref<Post>();

// 获取用户信息
const fetchUserInfo = async () => {
  try {
    const data = await getEssayUserInfo(route.params.id as string);
    userInfo.value = data;
  } catch (error) {
    console.error("获取用户信息失败：", error);
    ElMessage.error("获取用户信息失败");
  }
};

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
    const params = {
      page: currentPage.value,
      size: pageSize.value,
      keyword: searchKeyword.value,
      dateRange: searchDate.value,
    };

    const data = await getUserEssays(route.params.id as string, params);

    if (currentPage.value === 1) {
      posts.value = data.content;
    } else {
      posts.value.push(...data.content);
    }
  } catch (error) {
    console.error("获取文章列表失败：", error);
    ElMessage.error("获取文章列表失败");
  } finally {
    loading.value = false;
  }
};

// 加载更多
const loadMore = async () => {
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

// 编辑文章
const editPost = (post: Post) => {
  router.push(`/essay/edit/${post.oid}`);
};

// 查看文章详情
const viewDetail = (id: string) => {
  router.push(`/essay/detail/${id}`);
};

// 生成分享图
const generateShareImage = async (post: Post) => {
  currentPost.value = post;
  shareImageDialogVisible.value = true;
  await nextTick();
  if (shareImageRef.value) {
    try {
      const canvas = await html2canvas(shareImageRef.value);
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
  fetchUserInfo();
  fetchPosts();
});
</script>

<style scoped>
.profile-container {
  max-width: 800px;
  padding: 16px;
  margin: 0 auto;
}

.user-header {
  padding: 24px;
  margin-bottom: 20px;
  background: var(--el-bg-color);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgb(0 0 0 / 5%);
}

.user-info {
  display: flex;
  gap: 20px;
  align-items: center;
  margin-bottom: 16px;
}

.user-meta {
  flex: 1;
}

.user-name {
  margin: 0 0 8px;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.user-bio {
  margin: 0;
  font-size: 0.9rem;
  color: var(--el-text-color-secondary);
}

.user-stats {
  display: flex;
  gap: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.stat-label {
  font-size: 0.9rem;
  color: var(--el-text-color-secondary);
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

/* 其他样式与 list.vue 相同 */
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

/* 继承 list.vue 中的其他样式... */

/* 移动端适配 */
@media (width <= 640px) {
  .profile-container {
    padding: 12px;
  }

  .user-header {
    padding: 16px;
  }

  .user-info {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }

  .user-stats {
    justify-content: center;
  }

  .search-bar {
    flex-wrap: wrap;
  }

  .search-select {
    width: 100%;
  }
}
</style>
