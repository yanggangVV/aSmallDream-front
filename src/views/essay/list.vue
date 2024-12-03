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
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import EssayAPI from "@/api/essay";
import { debounce } from "@/utils/debounce";
import type { EssayPost } from "@/api/essay";

const router = useRouter();
const posts = ref<EssayPost[]>([]); // 帖子列表
const loading = ref(false); // 加载状态
const queryParams = reactive({
  pageNum: 1, // 当前页码
  pageSize: 10, // 每页显示数量
  status: 1, // 1为已发布的帖子
  createTime: undefined, // 创建时间
  title: "", // 搜索标题
});

// 使用与create.vue相同的API获取帖子
const fetchPosts = async () => {
  loading.value = true;
  try {
    const data = await EssayAPI.getPage(queryParams);
    posts.value = data.list; // 更新帖子列表
  } catch (error) {
    console.error("获取文章列表失败：", error);
    ElMessage.error("获取文章列表失败");
  } finally {
    loading.value = false;
  }
};

// 使用防抖函数处理搜索
const handleSearch = debounce(() => {
  queryParams.pageNum = 1; // 重置页码
  fetchPosts(); // 重新获取帖子
}, 300);

// 处理点赞操作
const handleLike = async (post: EssayPost) => {
  // try {
  //   await EssayAPI.addOrUpdate({ ...post, isLiked: !post.isLiked });
  //   post.isLiked = !post.isLiked; // 切换点赞状态
  //   post.likes_count += post.isLiked ? 1 : -1; // 更新点赞数
  // } catch (error) {
  //   console.error("点赞失败：", error);
  //   ElMessage.error("点赞失败");
  // }
};

// 组件挂载时初始化数据
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
