const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  devServer: {
    "port": 9080,
    "open": false,
  },
  transpileDependencies: true,
  pluginOptions: {
    electronBuilder: {
      // List native deps here if they don't work
      externals: ['simple-git'],
      customFileProtocol: "./",  // 解决element-ui打包后icon资源不显示的问题
      nodeIntegration:true,  // 解决渲染进程报错 Module not found: Error: Can‘t resolve ‘fs‘
      builderOptions: {
        productName: 'GitRepos',
        appId: 'ink.bxs.gitrepos',
        win: {
          icon: 'build/icons/icon.png',
          // eslint-disable-next-line no-template-curly-in-string
          artifactName: 'GitRepos-Setup-${version}-${arch}.exe',
          requestedExecutionLevel: "highestAvailable",
        },
        mac: {
          icon: 'build/icons/icon.png',
          // eslint-disable-next-line no-template-curly-in-string
          artifactName: 'GitRepos-${version}-${arch}.dmg'
        },
        nsis: {
          "oneClick":false,
          "allowToChangeInstallationDirectory": true
        },
      }
    }
  },

})
