'use strict'

import {app, protocol, BrowserWindow, ipcMain, globalShortcut, Menu, dialog, shell} from 'electron'
import {createProtocol} from 'vue-cli-plugin-electron-builder/lib'
import installExtension, {VUEJS_DEVTOOLS} from 'electron-devtools-installer'
import db from "./utils/dbUtils"

console.log(db.data)


const isDevelopment = process.env.NODE_ENV !== 'production'

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
    {scheme: 'app', privileges: {secure: true, standard: true}}
])

async function createWindow() {
    // Create the browser window.
    const win = new BrowserWindow({
        width: 700,
        height: 600,
        show: false,
        webPreferences: {
            // Use pluginOptions.nodeIntegration, leave this alone
            // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    // 优雅地显示窗口
    // https://www.electronjs.org/zh/docs/latest/api/browser-window#%E4%BC%98%E9%9B%85%E5%9C%B0%E6%98%BE%E7%A4%BA%E7%AA%97%E5%8F%A3
    win.once('ready-to-show', () => {
        win.show()
    })

    if (process.env.WEBPACK_DEV_SERVER_URL) {
        // Load the url of the dev server if in development mode
        await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
        // if (!process.env.IS_TEST) win.webContents.openDevTools()
    } else {
        createProtocol('app')
        // Load the index.html when not in development
        win.loadURL('app://./index.html')
    }
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
    if (isDevelopment && !process.env.IS_TEST) {
        // Install Vue Devtools
        try {
            await installExtension(VUEJS_DEVTOOLS)
        } catch (e) {
            console.error('Vue Devtools failed to install:', e.toString())
        }
    }
    // 注册一个快捷键：Ctrl + D 打开调试页面
    globalShortcut.register('Control+D', () => {
        BrowserWindow.getFocusedWindow().toggleDevTools()
    })

    // 渲染进程获取配置
    ipcMain.on('getAllConfig', (event) => {
        event.returnValue = db.data
    })

    // 渲染进程获取配置
    ipcMain.on('getConfig', (event, projectName) => {
        event.returnValue = db.getProjectByName(projectName)
    })

    // 渲染进程保存配置
    ipcMain.on('saveConfig', (event, newConfig) => {
        console.log("will save config", newConfig)
        db.saveProjectConfig(newConfig)
    })

    // 删除某个项目
    ipcMain.on('deleteConfig', (event, projectName) => {
        console.log("will delete project " + projectName)
        db.deleteProjectConfig(projectName)
    })

    // 选择本地目录
    ipcMain.on('open-directory-dialog', function (event) {
        dialog.showOpenDialog({
            properties: ['openDirectory'],
            title: '请选择文件夹',
            buttonLabel: '选择'
        }).then(result => {
            console.log(result)
            event.returnValue = result.filePaths[0]
        }).catch(e => {
            console.log(e)
            event.returnValue = ""
        })
    })

    // 多选本地目录
    ipcMain.on('open-multi-directory-dialog', function (event) {
        dialog.showOpenDialog({
            properties: ['openDirectory', 'multiSelections'],
            title: '请选择本地git仓库(可多选)',
            buttonLabel: '确定'
        }).then(result => {
            console.log(result)
            event.returnValue = result.filePaths
        }).catch(e => {
            console.log(e)
            event.returnValue = false
        })
    })

    // 选择本地json配置文件
    ipcMain.on('open-file-dialog', function (event) {
        dialog.showOpenDialog({
            properties: ['openFile'],
            title: '请选择配置文件',
            buttonLabel: '选择',
            filters: [
                { name: 'GitRepos Config File', extensions: ['json'] },
            ]
        }).then(result => {
            console.log(result)
            event.returnValue = result.filePaths[0]
        }).catch(e => {
            console.log(e)
            event.returnValue = ""
        })
    })

    // 打开本地目录
    ipcMain.on('open-path', function (event, path) {
        shell.openPath(path)
    })

    // 记录已打开的窗口
    const projectWindowMap = new Map()

    // 打开某个项目的窗口
    ipcMain.on('openProject', async (event, projectName) => {
        const webContents = event.sender
        console.log(typeof webContents)
        console.log("want to open " + projectName)
        if (projectWindowMap.has(projectName)) {
            projectWindowMap.get(projectName).focus()
        } else {
            const child = new BrowserWindow({
                width: 800,
                height: 600,
                show: false,
                webPreferences: {
                    nodeIntegration: true,
                    contextIsolation: false
                }
            })
            child.once('ready-to-show', () => {
                child.show()
            })
            projectWindowMap.set(projectName, child)
            if (process.env.WEBPACK_DEV_SERVER_URL) {
                await child.loadURL(`${process.env.WEBPACK_DEV_SERVER_URL}#/project/${projectName}`)
            } else {
                child.loadURL(`app://./index.html#/project/${projectName}`)
            }
            child.on("close", () => {
                projectWindowMap.delete(projectName)
            })
        }
    })
    createWindow()
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
    if (process.platform === 'win32') {
        process.on('message', (data) => {
            if (data === 'graceful-exit') {
                app.quit()
            }
        })
    } else {
        process.on('SIGTERM', () => {
            app.quit()
        })
    }
}

Menu.setApplicationMenu(null);
