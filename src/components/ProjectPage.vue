<template>
  <div id="project">
    <el-row id="topButton">
      <el-button size="small" icon="el-icon-bottom" @click="clickPullAllRepo()">全部拉取</el-button>
      <el-button size="small" icon="el-icon-refresh" @click="clickRefresh()">刷新状态</el-button>
    </el-row>
    <el-table
        :data="projectConfig.repos"
        :key="key"
        v-loading="isTableLoading"
        style="width: 90%; margin: 0 auto">
      <el-table-column
          prop="repoName"
          label="仓库名">
      </el-table-column>
      <el-table-column
          label="分支">
        <template slot-scope="scope">
          <el-tag type="info">{{scope.row.branch}}</el-tag>
        </template>
      </el-table-column>
      <el-table-column
          label="状态">
        <template slot-scope="scope">
          <i class="el-icon-warning-outline" v-show="scope.row.status === '获取失败'" style="color: red;"> 获取失败 </i>
          <i class="el-icon-bottom" v-show="scope.row.status.includes('落后')" style="color: gray;"> {{ scope.row.status }} </i>
          <i class="el-icon-top" v-show="scope.row.status.includes('领先')" style="color: #e6a23c;"> {{ scope.row.status }} </i>
          <i class="el-icon-check" v-show="scope.row.status.includes('最新')" style="color: green;"> {{ scope.row.status }} </i>
        </template>
      </el-table-column>
      <el-table-column
          prop="localPath"
          label="操作">
        <template slot-scope="scope">
          <el-button
              size="mini"
              :loading="scope.row.isPullLoading"
              @click="clickPullOneRepo(scope.row)">拉取
          </el-button>
          <el-button
              size="mini"
              @click="clickOpenLocal(scope.row)">本地
          </el-button>
        </template>
      </el-table-column>
    </el-table>

  </div>

</template>

<script>
const {simpleGit} = window.require('simple-git')
const {ipcRenderer} = window.require('electron')

const projectName = window.location.href.split('/').slice(-1)[0]
console.log("projectName: " + projectName)
const config = ipcRenderer.sendSync("getConfig", projectName)
console.log("get config", config)

export default {
  name: "ProjectPage",
  data() {
    return {
      projectName: this.$route.params.name,
      projectConfig: config,
      // 这个key的作用就是刷新data，无实际意义
      key: Math.random(),
      isTableLoading: false,
    }
  },
  mounted() {
    this.refreshProjectData()
    // 窗口关闭前保存配置
    window.addEventListener('beforeunload', () => {
      ipcRenderer.send("saveConfig", this.projectConfig)
    })
  },
  methods: {
    refreshProjectData() {
      for (let i of this.projectConfig.repos) {
        this.getRepoStatus(i)
        i.isPullLoading = false  // 保证每次打开项目时拉取按钮都是可点击的
      }
      this.key = Math.random()
    },
    async refreshProjectDataSync() {
      for (let i of this.projectConfig.repos) {
        await this.getRepoStatus(i)
      }
      this.key = Math.random()
    },
    clickRefresh() {
      this.isTableLoading = true
      this.refreshProjectDataSync().then(() => {
        this.isTableLoading = false
        this.$message({
          message: '已刷新',
          showClose: true,
          type: 'success'
        });
      })
    },
    getRealBranch(branch) {
      // 替换分支名中的变量
      for (let i of this.projectConfig.parameters) {
        let re = `\${${i.name}}`
        branch = branch.replace(re, i.value)
      }
      return branch
    },
    async getRepoStatus(repo) {
      try {
        const git = simpleGit(repo.localPath);
        await git.fetch()
        await git.status().then(r => {
          console.log(r)
          let status = null;
          if (r.ahead > 0) {
            status = "领先 " + r.ahead
          } else if (r.behind > 0) {
            status = "落后 " + r.behind
          } else {
            status = "已是最新"
          }
          repo.status = status
          repo.branch = r.current
        }).catch(e => {
          console.log(e)
        })
      } catch (e) {
        console.log(e)
        repo.status = "获取失败"
        repo.branch = "获取失败"
      }
    },
    async pullRepo(repo) {
      try {
        const git = simpleGit(repo.localPath);
        await git.pull().then((r) => {
          console.log(r)
          this.getRepoStatus(repo)
        })
      } catch (e) {
        console.log(e)
        this.$alert(e, repo.repoName + " 拉取失败", {
          confirmButtonText: '好的',
        });
      }
    },
    clickPullOneRepo(repo) {
      repo.isPullLoading = true
      console.log("单独更新 " + repo.repoName)
      this.pullRepo(repo).then(() => {
        repo.isPullLoading = false
      }).catch(e => {
        console.log(e)
        repo.isPullLoading = false
      })
    },
    clickPullAllRepo() {
      for (let i of this.projectConfig.repos) {
        this.clickPullOneRepo(i)
      }
    },
    clickOpenLocal(repo) {
      ipcRenderer.send("open-path", repo.localPath)
    },
  },
  beforeCreate() {
    document.getElementsByTagName("title")[0].innerHTML = "项目 - " + this.$route.params.name
  }
}
</script>

<style scoped>
#topButton {
  margin-top: 20px;
  margin-bottom: 20px;
  margin-left: 15px;
}

</style>
