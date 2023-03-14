<template>
  <div id="home">
    <el-row id="topButton">
      <el-button size="small" icon="el-icon-plus" @click="addProjectDialogVisible = true">创建项目</el-button>
      <el-button size="small" icon="el-icon-upload" @click="handleUploadConfig">导入配置</el-button>
      <el-button size="small" icon="el-icon-question" @click="aboutDialogVisible = true">使用说明</el-button>
    </el-row>
    <el-table
        :data="tableData.projects"
        empty-text='暂无项目'
        style="width: 90%; margin: 0 auto">
      <el-table-column
          prop="projectName"
          align="center"
          label="项目">
      </el-table-column>
      <el-table-column
          prop="repos.length"
          align="center"
          label="仓库个数">
      </el-table-column>
      <el-table-column label="操作" align="center">
        <template slot-scope="scope">
          <el-tooltip content="打开" placement="top" effect="light" :disabled="true">
            <el-button
                size="mini"
                icon="el-icon-zoom-in"
                @click="handleOpenProject(scope.$index, scope.row)"></el-button>
          </el-tooltip>
          <el-tooltip content="编辑" placement="top" effect="light" :disabled="true">
            <el-button
                size="mini"
                icon="el-icon-edit"
                @click="handleEditProject(scope.$index, scope.row)"></el-button>
          </el-tooltip>
          <el-tooltip content="删除" placement="top" effect="light" :disabled="true">
            <el-button
                size="mini"
                icon="el-icon-delete"
                @click="handleDeleteProject(scope.$index, scope.row)"></el-button>
          </el-tooltip>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog title="项目配置" :visible.sync="addProjectDialogVisible" @closed="clearFormData" :close-on-click-modal="false" width="80%">
      <el-form :model="addProjectForm" ref="addProjectForm" label-width="80px">
        <el-form-item label="项目名称" prop="projectName" :rules="{required: true, message: '项目名称不能为空', trigger: 'blur'}">
          <el-input v-model="addProjectForm.projectName"></el-input>
        </el-form-item>
        <el-form-item label="仓库路径" v-for="(repo, index) in addProjectForm.repos" :key="repo.key"
                      :prop="'repos.' + index + '.localPath'"
                      :rules="{required: true, message: '仓库路径不能为空', trigger: 'blur'}">
          <el-input v-model="repo.localPath"></el-input>
          <el-tooltip content="选择本地文件夹" placement="top" effect="light">
            <el-button @click.prevent="getLocalPath(repo)" class="repo-button" icon="el-icon-folder-add" :circle="true"
                       size="medium"></el-button>
          </el-tooltip>
          <el-tooltip content="删除仓库" placement="top" effect="light">
            <el-button @click.prevent="removeRepo(repo)" class="repo-button" icon="el-icon-close" :circle="true"
                       size="medium"></el-button>
          </el-tooltip>
        </el-form-item>
        <el-form-item>
          <el-button @click="saveProject('addProjectForm')">保存项目</el-button>
          <el-button @click="addRepo">新增仓库</el-button>
          <el-tooltip content="本地选择多个Git仓库文件夹" placement="top" effect="light">
            <el-button @click="addMultiRepo">批量选择</el-button>
          </el-tooltip>
        </el-form-item>
      </el-form>
    </el-dialog>

    <el-dialog :visible.sync="aboutDialogVisible" width="80%">
      <template slot="title">
        <div>GitRepos <el-tag type="info">{{`v${appVersion}`}}</el-tag></div>
      </template>
      <div>
        <p>此工具用于管理本地多Git仓库项目。点击创建项目，选择本地仓库路径即可。目前支持批量拉取和更新状态。</p>
        <br>
        源码地址：<el-link type="primary" @click="openBrowser('https://github.com/buxianshan/git-repos')">
        https://github.com/buxianshan/git-repos
        </el-link>
      </div>
    </el-dialog>
  </div>
</template>

<script>
const {simpleGit} = window.require('simple-git')
const {ipcRenderer} = window.require('electron')
const path = require('path')
const fs = require('fs');


const config = ipcRenderer.sendSync("getAllConfig")
console.log("get config", config)

export default {
  name: "HomePage",
  data() {
    return {
      tableData: config,
      addProjectDialogVisible: false,
      aboutDialogVisible: false,
      addProjectForm: {
        projectName: "",
        repos: [
          {
            "localPath": "",
          }
        ],
        isEdit: false,
      },
      hasGitEnv: true,
      appVersion: process.env.VUE_APP_VERSION,
    }
  },
  mounted() {
    this.checkGitEnv().catch(e => {
      console.log(e)
      this.hasGitEnv = false
      this.noGitEnvAlert()
    })
  },
  methods: {
    async checkGitEnv() {
      await simpleGit().version();
    },
    noGitEnvAlert() {
      this.$alert('请检查是否安装和配置Git环境变量！', '未检测到Git环境', {
        confirmButtonText: '好的',
        type: 'error',
      });
    },
    handleOpenProject(index, row) {
      if (!this.hasGitEnv) {
        this.noGitEnvAlert()
        return false
      }
      console.log(index)
      console.log(row.projectName)
      ipcRenderer.send("openProject", row.projectName)
    },
    handleDeleteProject(index, row) {
      console.log(index, row)
      this.$confirm('此操作将永久删除该项目, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        ipcRenderer.send("deleteConfig", row.projectName)
        this.$message({
          type: 'success',
          showClose: true,
          message: '删除成功!'
        });
        // 刷新配置
        this.tableData = ipcRenderer.sendSync("getAllConfig")
      }).catch(() => {
        this.$message({
          type: 'info',
          showClose: true,
          message: '已取消删除'
        });
      });
    },
    handleEditProject(index, row) {
      console.log(index, row)
      // 修改表单数据
      this.addProjectForm = row
      this.addProjectForm.isEdit = true
      // 显示表单
      this.addProjectDialogVisible = true
    },
    handleAbout() {
      this.$alert('此工具用于管理本地多Git仓库项目，在创建项目之前您应该先把Git仓库克隆到本地。', '使用说明', {
        confirmButtonText: 'ok',
        type: 'success',
      })
    },
    handleUploadConfig() {
      const jsonFilePath = ipcRenderer.sendSync('open-file-dialog')
      const jsonString = fs.readFileSync(jsonFilePath, 'utf-8');
      const jsonData = JSON.parse(jsonString.toString());
      // 检测配置格式是否正确
      if (!("projects" in jsonData)) {
        this.$alert("导入失败，请检查配置文件！", '出错了', {
          confirmButtonText: 'ok',
          type: 'error',
        })
        return false
      }

      // 开始导入
      for (const p of jsonData.projects) {
        const newProjectConfig = this.generateNewProject(p)
        console.log("importProjectConfig", newProjectConfig)
        ipcRenderer.send("saveConfig", newProjectConfig)
      }

      // 刷新配置
      this.tableData = ipcRenderer.sendSync("getAllConfig")

      this.$alert("已成功导入配置文件！" + jsonData.projectName, '提示', {
        confirmButtonText: 'ok',
        type: 'success',
      })
    },
    addRepo() {
      this.addProjectForm.repos.push({
        localPath: '',
        key: Date.now()
      });
    },
    addMultiRepo() {
      const repoPaths = ipcRenderer.sendSync('open-multi-directory-dialog')
      console.log(repoPaths)
      if (repoPaths) {
        for (const repoPath of repoPaths) {
          this.addProjectForm.repos.push({
            localPath: repoPath,
            key: Date.now()
          });
        }
      }
    },
    removeRepo(item) {
      let index = this.addProjectForm.repos.indexOf(item)
      if (index !== -1) {
        this.addProjectForm.repos.splice(index, 1)
      }
    },
    generateNewProject(config) {
      for (let i of config.repos) {
        // 补上缺少的属性
        i.repoName = path.basename(i.localPath)
        i.remote = ""
        i.branch = ""
        i.status = ""
        i.isPullLoading = false
      }
      return config
    },
    saveProject(formName) {
      this.$refs[formName].validate((valid) => {
        if (valid) {
          for (const i of this.tableData.projects) {
            if (this.addProjectForm.projectName === i.projectName) {
              if (this.addProjectForm.isEdit) {
                break
              } else {
                this.$message({
                  message: '项目名称不能重复！',
                  showClose: true,
                  type: 'error'
                });
                return false
              }
            }
          }
          const newProjectConfig = this.generateNewProject(this.addProjectForm)
          console.log("newProjectConfig", newProjectConfig)
          ipcRenderer.send("saveConfig", newProjectConfig)
          // 保存之后关掉Dialog，重置form数据
          this.addProjectDialogVisible = false
          this.addProjectForm = {projectName: "", repos: [{"localPath": ""}]}
          this.$message({
            message: '项目已保存',
            showClose: true,
            type: 'success'
          });
          // 刷新配置
          this.tableData = ipcRenderer.sendSync("getAllConfig")
          this.clearFormData()
        } else {
          console.log('error submit!!');
          return false;
        }
      })
    },
    getLocalPath(item) {
      item.localPath = ipcRenderer.sendSync('open-directory-dialog')
    },
    clearFormData() {
      this.addProjectForm = {
        projectName: "",
        repos: [
          {
            "localPath": "",
          }
        ],
      }
    },
    openBrowser(url) {
      ipcRenderer.send("open-url", url)
    }
  },
  beforeCreate() {
    document.getElementsByTagName("title")[0].innerHTML = "GitRepos"
  }
}
</script>

<style scoped>
#topButton {
  margin-top: 20px;
  margin-bottom: 20px;
  margin-left: 15px;
}

.el-input {
  width: 70%
}

.repo-button {
  margin-left: 10px;
}
</style>
