<template>
  <div class="essay-create-container">
    <el-card class="create-card">
      <template #header>
        <div class="card-header flex justify-between items-center">
          <span class="text-lg font-bold">发布文章</span>
          <!-- <el-button link @click="router.back()" class="sm:hidden">
            <el-icon><Close /></el-icon>
          </el-button> -->
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="postForm"
        :rules="rules"
        label-position="top"
        class="create-form"
      >
        <el-form-item label="标题" prop="otitle">
          <el-input
            v-model="postForm.otitle"
            placeholder="请输入文章标题"
            :maxlength="100"
            show-word-limit
          />
        </el-form-item>

        <!-- <el-form-item label="标签" prop="otags">
          <el-input
            v-model="postForm.otags"
            placeholder="请输入标签，多个标签用逗号分隔"
          />
        </el-form-item> -->

        <el-form-item label="内容" prop="ocontent">
          <editor
            v-model="postForm.ocontent"
            :style="{ height: isMobile ? '300px' : '500px' }"
          />
        </el-form-item>

        <div class="form-actions">
          <el-button
            type="primary"
            @click="submitForm"
            :loading="loading"
            class="submit-btn"
          >
            发布
          </el-button>
          <el-button @click="saveAsDraft" :loading="loading" class="draft-btn">
            保存草稿
          </el-button>
          <el-button
            @click="router.back()"
            class="hidden sm:inline-block cancel-btn"
          >
            取消
          </el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import type { FormInstance } from "element-plus";
import type { Post } from "@/types/essay";
import { ElMessage } from "element-plus";
import Editor from "@/components/WangEditor/index.vue";

const router = useRouter();
const formRef = ref<FormInstance>();
const loading = ref(false);

// 检测是否为移动端
const isMobile = ref(window.innerWidth < 640);

// 监听窗口大小变化
const handleResize = () => {
  isMobile.value = window.innerWidth < 640;
};

onMounted(() => {
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
});

const postForm = ref<Partial<Post>>({
  otitle: "",
  ocontent: "",
  otags: "",
  ostatus: "published",
});

const rules = {
  otitle: [
    { required: true, message: "请输入文章标题", trigger: "blur" },
    {
      min: 2,
      max: 100,
      message: "标题长度在2到100个字符之间",
      trigger: "blur",
    },
  ],
  ocontent: [{ required: true, message: "请输入文章内容", trigger: "blur" }],
};

// 发布文章
const submitForm = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const response = await fetch("/api/essays", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(postForm.value),
        });

        if (response.ok) {
          ElMessage.success("发布成功");
          router.push("/essay/list");
        }
      } catch (error) {
        console.error("发布文章失败：", error);
        ElMessage.error("发布失败");
      }
    }
  });
};

// 保存为草稿
const saveAsDraft = async () => {
  postForm.value.ostatus = "draft";
  await submitForm();
};
</script>

<style scoped>
.essay-create-container {
  position: relative;
  display: flex;
  flex-direction: column;
  max-width: 1000px;
  height: 100%;
  padding: 10px;
  margin: 0 auto;
}

.create-card {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}

/* 固定头部样式 */
.card-header {
  position: sticky;
  top: 0;
  z-index: 2;
  background-color: var(--el-bg-color);
}

.create-form {
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden; /* 改为 hidden */
}

/* 新增：标题部分固定样式 */
.create-form :deep(.el-form-item:nth-child(-n + 2)) {
  position: sticky;
  top: 0;
  z-index: 1;
  padding-bottom: 10px;
  background-color: var(--el-bg-color);
}

/* 新增：内容编辑器容器样式 */
.create-form :deep(.el-form-item:nth-child(3)) {
  flex: 1;
  margin-bottom: 70px;
  overflow-y: auto;
}

.form-actions {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1;
  display: flex;
  gap: 10px;
  justify-content: center;
  padding: 15px;
  background-color: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color-light);
}

@media (width <= 640px) {
  .form-actions {
    flex-direction: column;
    padding: 10px;
  }

  .submit-btn,
  .draft-btn,
  .cancel-btn {
    width: 100%;
    margin-bottom: 10px;
  }

  .cancel-btn {
    margin-bottom: 0;
  }
}

/* 适配深色模式 */
:deep(.el-input__wrapper),
:deep(.el-textarea__wrapper) {
  background-color: var(--el-bg-color);
}

/* 确保编辑器不会覆盖按钮 */
:deep(.w-e-text-container) {
  z-index: 0 !important;
}
</style>
