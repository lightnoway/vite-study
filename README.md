## vite-study
vite 学习， 原理demo， 一些基础设施的尝试


## 看点/主线
vite 如何响应 各类型模块的 `import` 请求
- png,font 。。。
- 样式
- vue 的sfc 组合拆分 


## 记录
### yarn workspace使用
workspace内repo 相互link
- workspace外的办法:`yarn link`
    - 不应该修改/扩展 `yarn link` 功能;`yarn link` 用作全局**范围**依赖
- workspace范围内 link 做法:  
    - workspace 内repo 的pkg.name,pkg.version 与pkg.dependence 一致时
    - `yarn install` 自动link

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
