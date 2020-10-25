## vite-study
vite 学习， 原理demo， 一些基础设施的尝试
### 目录结构
- package.json 配置 yarn workspace 
- packages/vite-app: vite 创建的项目,没改功能，作为 vite 或vite-diy 的执行场景
- packages/vite-diy:

### yarn 脚本
- 根目录执行`yarn install` 安装yarn workspace 内依赖；
    - 不要使用 `npm install`: 不支持 yarn workspace
- 观摩vite: 根目录执行 `yarn workspace vite-app run dev`
- 开发模式: 根目录执行 `yarn workspace vite-app run dev-diy-watch`
    - 以 vite-diy 启动 vite-app
    - nodemon watch `vite-diy/index.js` 文件变化

- 其他
    - 验证workspace内link可用:根目录执行 `yarn workspace vite-app run dev-diy`

## 看点/主线
vite 如何响应 各类型模块的 `import` 请求
- png,font 。。。
- 样式
- vue 的sfc 组合拆分 

yarn在workspace范围内: install,link

koa ,koa-send,及中间件 的简单应用


## 记录
### yarn workspace使用
workspace内install 模块install到哪？
- 符合 子项目(如 vite-app,vite-diy)  require 模块规则
    - 本目录找不到，一直沿着向父目录在 node_modules 中找
- 子项目间可以共用模块，不必重复install
- 不同版本的同名模块处理
    - 不能共存：
        - 一个项目的package.json 中dependency
        - 同一node_modules目录
    - 不同项目依赖不同版本同名模块时，错开node_modules目录安装，比如安装到各自的node_modules目录

workspace内repo(子项目) 相互link
- workspace外的办法:`yarn link`
    - 不应该修改/扩展 `yarn link` 功能;`yarn link` 用作全局**范围**依赖
- workspace范围内 link 做法:  
    - `yarn install` 自动在根目录node_modules中 link 子项目
        - 如果子项目要link使用其他子项目,办法如下
            - 直接使用: 父级 node_modules 在 require.resolve 查找范围内
            - `yarn add` 相对路径本地模块: 如 `yarn/npm add ../vite-diy`
                - npm原生姿势，不依赖yarn workspace
        -  如果子项目要使用其他子项目的不同版本: 
            - `yarn add` 时加版本号使用在线版本
            - `yarn add` 相对路径本地模块

    - 验证link: 根目录执行 `ls -al  node_modules|grep vite-` 返回如下
    ```sh 
    lrwxr-xr-x    vite-app -> ../packages/vite-app
    lrwxr-xr-x    vite-diy -> ../packages/vite-diy
    ```

### webServer middleware
- 1 别名path转换，
    - 比如将 `import vue from '/@module/vue'` 中 `path:/@module/vue` 转为 `path: absolutePath(vue).basename,root:absolutePath(vue).dir` 交给下步 静态文件来响应
- 2 静态文件: path=>fileContent
- 3 fileContent加工: 
    - 脚本内容处理
        - node_modules 模块响应：浏览器无法处理 `<script type='module' ` 中 `import vue from 'vue'`,只能处理`from '/'`,`from './'`
            - 所以需要转成别名，如`import vue from '/@module/vue'`, 然后浏览器发请求，从middleware `1`开始处理
        - `process.env.NODE_ENV` 替换为`"development"`
    - 比如.vue 加工成 script
    - 比如 import picUrl 将图片二进制 加工成 script模块（模块内返回base64Url）
 

### 非js模块处理方式
参考程序中变量分为引用类型和值类型，资源模块处理方式
- 引用类型: 输出 url, 浏览器需再次请求 url 才能拿到资源
- 值类型: 生成无需再次请求的代码


assert-pic,font
- 方式1: import 返回 `export default "picURL"`
- 方式2: 删除 `import x from 'picUrl'`;替换 x 为 `picUrl` 

assert-style
- 方式1: `<link href="url"` 
- 方式2: `<style>code`

### .vue 模块
- 响应
```js
//响应 import x from 'url.vue'
import HelloWorld from '/src/components/HelloWorld.vue'

const __script = {
  name: 'App',
  components: {
    HelloWorld
  }
}

import "/src/App.vue?type=style&index=0"
__script.__scopeId = "data-v-7ac74a55"
import { render as __render } from "/src/App.vue?type=template"
__script.render = __render
__script.__hmrId = "/src/App.vue"
__script.__file = "/Users/chenxin/workspace/current/lagou-fe/vite-study/packages/vite-app/src/App.vue"
export default __script
```
```js
//响应 import "/src/App.vue?type=style&index=0"
import { updateStyle } from "/vite/client"
const css = "\nimg[data-v-7ac74a55] {\n  border: 1px solid green;\n}\n"
updateStyle("7ac74a55-0", css)
export default css
```
```js
//响应 import { render as __render } from "/src/App.vue?type=template"
import { createVNode as _createVNode, resolveComponent as _resolveComponent, Fragment as _Fragment, openBlock as _openBlock, createBlock as _createBlock, withScopeId as _withScopeId, pushScopeId as _pushScopeId, popScopeId as _popScopeId } from "/@modules/vue.js"
const _withId = /*#__PURE__*/_withScopeId("data-v-7ac74a55")

_pushScopeId("data-v-7ac74a55")
const _hoisted_1 = /*#__PURE__*/_createVNode("img", {
  alt: "Vue logo",
  src: "/src/assets/logo.png"
}, null, -1 /* HOISTED */)
_popScopeId()

export const render = /*#__PURE__*/_withId(function render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_HelloWorld = _resolveComponent("HelloWorld")

  return (_openBlock(), _createBlock(_Fragment, null, [
    _hoisted_1,
    _createVNode(_component_HelloWorld, { msg: "Hello Vue 3.0 + Vite" })
  ], 64 /* STABLE_FRAGMENT */))
})
//# sourceMappingURL=data:application/json;base64,...
```
- `x.vue` 到 `.vue`,`.vue?type=template`,`.vue?type=style` 的处理详见 `packages/vite-diy/index.js中 //4 响应 .vue`
    - [@vue/compiler-sfc文档](https://github.com/vuejs/vue-next/tree/master/packages/compiler-sfc) ,用例参考`__tests__目录`
