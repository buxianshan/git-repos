import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)


const router = new VueRouter({
    routes: [
        {
            path: '/',
            component: () => import('@/components/HomePage')
        },
        {
            // 动态路径参数 以冒号开头
            path: '/project/:name',
            props:true,
            component: () => import('@/components/ProjectPage')
        }
    ]
})

export default router