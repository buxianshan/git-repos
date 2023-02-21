const fs = require('fs');
const path = require('path')


let dbFile = path.join(process.cwd(), "db.json")
console.log("platform: " + process.platform)
if (!process.env.WEBPACK_DEV_SERVER_URL && process.platform === "darwin") {
    dbFile = path.join(process.env.HOME, "Library", "Application Support", "git-repos", "db.json")
}
console.log("dbFile path is " + dbFile)

try {
    fs.accessSync(dbFile, fs.constants.F_OK)
    console.log('dbFile exist')
} catch (e) {
    console.log(e)
    fs.writeFileSync(dbFile, JSON.stringify({"projects": []}), "utf-8")
    console.log('created dbFile')

}

const db = {
    data: {},
    readSync: function () {
        const jsonString = fs.readFileSync(dbFile, 'utf-8');
        // parse JSON object
        const jsonData = JSON.parse(jsonString.toString());

        // print JSON object
        console.log(jsonData);
        this.data = jsonData
    },
    write: function () {
        // convert JSON object to string
        const jsonString = JSON.stringify(this.data, null, 4);
        // write JSON string to a file
        fs.writeFile(dbFile, jsonString, (err) => {
            if (err) {
                throw err;
            }
            console.log("JSON data is saved.");
        });
    },
    getProjectByName: function (projectName) {
        for (let i of this.data.projects) {
            if (i.projectName === projectName) {
                return i
            }
        }
        return null
    },
    saveProjectConfig: function (config) {
        for (let i in this.data.projects) {
            if (this.data.projects[i].projectName === config.projectName) {
                this.data.projects[i] = config
                this.write()
                return true
            }
        }
        // 如果上面没找到则是新增项目
        this.data.projects.push(config)
        this.write()
        console.log("add project config: " + config.projectName)
        return true
    },
    deleteProjectConfig: function (projectName) {
        for (let i = 0; i < this.data.projects.length; i++) {
            if (this.data.projects[i].projectName === projectName) {
                console.log("delete project index " + i)
                this.data.projects.splice(i, 1)
                console.log(this.data.projects)
                this.write()
                return true
            }
        }
        return false
    }
}

db.readSync()


export default db
