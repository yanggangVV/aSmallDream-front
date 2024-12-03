<!-- 用户管理 -->
<template>
  <div class="app-container">
    <el-row :gutter="20">
      <!-- 部门树 -->
      <!-- <el-col :lg="4" :xs="24" class="mb-[12px]">
        <dept-tree v-model="queryParams.deptId" @node-click="handleQuery" />
      </el-col> -->

      <!-- 用户列表 -->
      <el-col :lg="20" :xs="24">
        <div class="search-container">
          <el-form ref="queryFormRef" :model="queryParams" :inline="true">
            <el-form-item label="关键字" prop="title">
              <el-input
                v-model="queryParams.title"
                placeholder="标题"
                clearable
                style="width: 200px"
                @keyup.enter="handleQuery"
              />
            </el-form-item>

            <el-form-item label="状态" prop="status">
              <el-select
                v-model="queryParams.status"
                placeholder="全部"
                clearable
                class="!w-[100px]"
              >
                <el-option label="已发布" :value="1" />
                <el-option label="未发布" :value="0" />
              </el-select>
            </el-form-item>

            <el-form-item label="创建时间">
              <el-date-picker
                :editable="false"
                class="!w-[240px]"
                v-model="queryParams.createTime"
                type="date"
                placeholder="选择日期时间"
                value-format="YYYY-MM-DD"
                format="YYYY-MM-DD"
              />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="handleQuery">
                <i-ep-search />
                搜索
              </el-button>
              <el-button @click="handleResetQuery">
                <i-ep-refresh />
                重置
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <el-card shadow="never" class="table-container">
          <template #header>
            <div class="flex-x-between">
              <div>
                <el-button type="success" @click="handleOpenDialog()">
                  <i-ep-plus />
                  创作
                </el-button>
                <el-button
                  type="danger"
                  :disabled="removeIds.length === 0"
                  @click="handleDelete()"
                >
                  <i-ep-delete />
                  删除
                </el-button>
              </div>
              <!-- <div>
                <el-button class="ml-3" @click="handleOpenImportDialog">
                  <template #icon><i-ep-upload /></template>
                  导入
                </el-button>

                <el-button class="ml-3" @click="handleExport">
                  <template #icon><i-ep-download /></template>
                  导出
                </el-button>
              </div> -->
            </div>
          </template>

          <el-table
            v-loading="loading"
            :data="pageData"
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="50" align="center" />
            <el-table-column
              key="id"
              label="编号"
              align="center"
              prop="id"
              width="80"
            />
            <el-table-column
              key="title"
              label="标题"
              align="center"
              prop="title"
            />

            <el-table-column
              label="状态"
              align="center"
              prop="status"
              width="100"
            >
              <template #default="scope">
                <el-tag :type="scope.row.status == 1 ? 'success' : 'info'">
                  {{ scope.row.status == 1 ? "已发布" : "未发布" }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="创建时间"
              align="center"
              prop="createTime"
              width="180"
            />
            <el-table-column label="操作" fixed="right" width="220">
              <template #default="scope">
                <el-button
                  type="primary"
                  size="small"
                  link
                  @click="handleToggleStatus(scope.row)"
                >
                  <i-ep-refresh-left />
                  {{ scope.row.status === 1 ? "取消发布" : "一键发布" }}
                </el-button>
                <el-button
                  type="primary"
                  link
                  size="small"
                  @click="handleOpenDialog(scope.row.id)"
                >
                  <i-ep-edit />
                  编辑
                </el-button>
                <el-button
                  type="danger"
                  link
                  size="small"
                  @click="handleDelete(scope.row.id)"
                >
                  <i-ep-delete />
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <pagination
            v-if="total > 0"
            v-model:total="total"
            v-model:page="queryParams.pageNum"
            v-model:limit="queryParams.pageSize"
            @pagination="handleQuery"
          />
        </el-card>
      </el-col>
    </el-row>

    <!-- 用户表单弹窗 -->
    <el-drawer
      v-model="dialog.visible"
      :title="dialog.title"
      :size="screenWidth <= 768 ? '100%' : '80%'"
      :with-header="true"
      append-to-body
      @close="handleCloseDialog"
    >
      <el-form
        ref="postFormRef"
        :model="formData"
        :rules="rules"
        label-width="80px"
        class="drawer-form"
      >
        <el-form-item label="标题" prop="title">
          <el-input
            v-model="formData.title"
            placeholder="请输入标题"
            class="title-input"
          />
        </el-form-item>

        <el-form-item label="正文" prop="content" class="content-item">
          <wang-editor
            v-model="formData.content"
            class="wang-editor"
            placeholder="请输入文章内容..."
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="drawer-footer">
          <el-button type="primary" @click="handleSubmit">保存草稿</el-button>
          <el-button @click="handleCloseDialog">取消</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "EssayCreate",
  inheritAttrs: false,
});

import UserAPI, { UserForm, UserPageQuery, UserPageVO } from "@/api/user";
import EssayAPI, { EssayPost, PostPageQuery } from "@/api/essay";
import DeptAPI from "@/api/dept";
import RoleAPI from "@/api/role";
import { useUserStore } from "@/store/modules/user";
import WangEditor from "@/components/WangEditor/index.vue";

const queryFormRef = ref(ElForm);
const postFormRef = ref(ElForm);
const userStore = useUserStore();
const loading = ref(false);
const removeIds = ref([]);
const total = ref(0);
const pageData = ref<EssayPost[]>();
/** 帖子查询参数  */
const queryParams = reactive<PostPageQuery>({
  pageNum: 1,
  pageSize: 10,
  status: undefined,
  createTime: undefined,
});

/**  帖子弹窗对象  */
const dialog = reactive({
  visible: false,
  title: "",
});

// 帖子表单数据
const formData = reactive<EssayPost>({});

/** 帖子表单校验规则  */
const rules = reactive({
  title: [{ required: true, message: "标题不能为空", trigger: "blur" }],
});

// 添加屏幕宽度响应式代码
const screenWidth = ref(window.innerWidth);

/** 查询 */
function handleQuery() {
  loading.value = true;
  // 如果用户选择了日期，将其转换为 LocalDateTime 格式
  if (queryParams.createTime) {
    queryParams.createTime = `${queryParams.createTime}T00:00:00`; // 补充时间部分
  }
  EssayAPI.getPage(queryParams)
    .then((data) => {
      pageData.value = data.list;
      total.value = data.total;
    })
    .finally(() => {
      loading.value = false;
    });
}

/** 重置查询 */
function handleResetQuery() {
  queryFormRef.value.resetFields();
  queryParams.pageNum = 1;
  queryParams.createTime = undefined;
  queryParams.status = undefined;
  handleQuery();
}

/** 行复选框选中记录选中ID集合 */
function handleSelectionChange(selection: any) {
  removeIds.value = selection.map((item: any) => item.id);
}

/**
 * 打开弹窗
 *
 * @param id 帖子ID
 */
async function handleOpenDialog(id?: number) {
  dialog.visible = true;
  // 加载角色下拉数据源
  if (id) {
    dialog.title = "修改帖子";
    EssayAPI.getFormData(id).then((data) => {
      Object.assign(formData, { ...data });
    });
  } else {
    dialog.title = "新增帖子";
  }
}

/** 关闭弹窗 */
function handleCloseDialog() {
  dialog.visible = false;
  postFormRef.value.resetFields();
  postFormRef.value.clearValidate();
  formData.id = undefined;
}

/** 表单提交 */
const handleSubmit = useThrottleFn(() => {
  postFormRef.value.validate((valid: any) => {
    if (valid) {
      const id = formData.id;
      loading.value = true;

      // 从 store 直接获取用户ID
      formData.authorId = userStore.user.userId;

      // 只有当状态为空或为0时，才设置为未发布状态
      // 如果状态为1(已发布)，则保持不变
      if (!formData.status || formData.status === 0) {
        formData.status = 0;
      }

      if (id) {
        EssayAPI.addOrUpdate(formData)
          .then(() => {
            ElMessage.success("修改帖子成功");
            handleCloseDialog();
            handleResetQuery();
          })
          .finally(() => (loading.value = false));
      } else {
        EssayAPI.addOrUpdate(formData)
          .then(() => {
            ElMessage.success("新增帖子成功");
            handleCloseDialog();
            handleResetQuery();
          })
          .finally(() => (loading.value = false));
      }
    }
  });
}, 3000);

/** 删除帖子 */
function handleDelete(id?: number) {
  const ids = [id || removeIds.value].join(",");
  if (!ids) {
    ElMessage.warning("请勾选删除项");
    return;
  }

  ElMessageBox.confirm("确认删除帖子?", "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(
    function () {
      loading.value = true;
      EssayAPI.deleteByIds(ids)
        .then(() => {
          ElMessage.success("删除成功");
          handleResetQuery();
        })
        .finally(() => (loading.value = false));
    },
    function () {
      ElMessage.info("已取消删除");
    }
  );
}

/** 切换发布状态 */
function handleToggleStatus(row: { [key: string]: any }) {
  const newStatus = row.status === 1 ? 0 : 1;
  const actionText = newStatus === 1 ? "发布" : "取消";
  ElMessageBox.confirm(`确认${actionText}该文章?`, "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(
    function () {
      loading.value = true;
      EssayAPI.addOrUpdate({ ...row, status: newStatus })
        .then(() => {
          ElMessage.success(`${actionText}成功`);
          handleQuery();
        })
        .catch((error) => {
          ElMessage.error(`${actionText}失败`);
        })
        .finally(() => {
          loading.value = false;
        });
    },
    function () {
      ElMessage.info(`已取消${actionText}`);
    }
  );
}

// 监听窗口大小变化
onMounted(() => {
  handleQuery();
  window.addEventListener("resize", () => {
    screenWidth.value = window.innerWidth;
  });
});

onUnmounted(() => {
  window.removeEventListener("resize", () => {
    screenWidth.value = window.innerWidth;
  });
});
</script>

<style lang="scss" scoped>
:deep(.el-drawer) {
  background: #f5f7fa;

  .el-drawer__header {
    padding: 16px 20px;
    margin-bottom: 0;
    border-bottom: 1px solid #e4e7ed;

    span {
      font-size: 18px;
      font-weight: 500;
    }
  }

  .el-drawer__body {
    padding: 20px;
  }
}

.drawer-form {
  height: calc(100% - 120px);
  padding: 20px;
  overflow-y: auto;

  .title-input {
    .el-input__inner {
      padding: 10px 15px;
      font-size: 16px;
    }
  }

  .content-item {
    height: calc(100% - 80px);

    :deep(.el-form-item__content) {
      height: 100%;
    }

    .wang-editor {
      height: 100%;
      min-height: 400px;
      overflow: hidden;
      border-radius: 4px;

      :deep(.w-e-text-container) {
        background: #fff;
      }

      :deep(.w-e-toolbar) {
        background: #f8f9fa;
        border-bottom: 1px solid #e4e7ed;
      }
    }
  }
}

.drawer-footer {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 16px 20px;
  text-align: right;
  background: #fff;
  border-top: 1px solid #e4e7ed;

  .el-button {
    margin-left: 8px;
  }
}

@media screen and (width <= 768px) {
  :deep(.el-drawer) {
    .el-drawer__body {
      padding: 10px;
    }
  }

  .drawer-form {
    padding: 10px;

    .content-item {
      .wang-editor {
        min-height: 300px;
      }
    }
  }

  .drawer-footer {
    padding: 12px 16px;
  }
}
</style>
