#! /usr/bin/env node
const Koa = require('koa');
const send = require('koa-send');
const path = require('path');
const parseSFC = require('@vue/compiler-sfc');

const app = new Koa();

const modulePrefix = `/@modules/`;
const TYPE_JS = 'application/javascript';

//5 响应 import assert
app.use(async (ctx, next) => {
    if (ctx.req.headers.accept === '*/*') {
        if (ctx.path.endsWith('.png')) {
            ctx.body = `export default '${ctx.path}'`;
            ctx.type = TYPE_JS;
            return;
            //另一种做法：参考vite ,修改代码: 删除- import x from 'picUrl'; 替换- x 为picUrl
        }

        if (ctx.path.endsWith('.css')) {
            //创建<link href /> 参考：https://github.com/webpack-contrib/style-loader/blob/master/src/runtime/injectStylesIntoLinkTag.js
            ctx.body = `
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = ${JSON.stringify(ctx.path)};
document.head.append(link);
`;
            ctx.type = TYPE_JS;
            return;
            //另一种做法: 参考 vite/client/updateStyle 使用 CSSStyleSheet插入样式
        }
    }
    return next();
})
//3 响应./@modules/
app.use(async (ctx, next) => {
    if (ctx.path.startsWith(modulePrefix)) {
        //响应 `import vue`: 拿到 其package.module指向的文件; 
        const moduleName = ctx.path.substr(modulePrefix.length);
        const modulePkg = require(path.join(require.resolve(moduleName), '../package.json'));
        //利用require.resolve支持从上级目录模块 ; 此处拿package.json  未考虑通用性
        const moduleFilePath = path.join(require.resolve(moduleName), '../', modulePkg.module);
        const moduleFilePathP = path.parse(moduleFilePath);
        ctx.overrideSend = [ctx, moduleFilePathP.base, { root: moduleFilePathP.dir }];
    }
    return next();
})

//1 静态文件服务器
app.use(async (ctx, next) => {
    //send 静态文件服务, 响应文件,配置: url 到文件的映射
    //- 基本:url 直接对应 cwd内的文件
    //- 变体:url 对应 cwd外的文件，比如 cwd/../../node_modules/vue
    if (ctx.overrideSend) {
        await send(...ctx.overrideSend);
    } else {
        await send(ctx, ctx.path, { root: process.cwd(), index: 'index.html' });
    }
    //send 参数： index 非空，会路由到index指向的文件，文件不存在则报错
    return next();
})
//4 响应 .vue
app.use(async (ctx, next) => {
    if (ctx.path.endsWith('.vue')) {
        //对响应.vue 进行加工
        let code = await streamToString(ctx.body);
        const parseRet = parseSFC.parse(code);
        if (ctx.query.type === 'template') {
            //template
            code = parseSFC.compileTemplate({ source: parseRet.descriptor.template.content }).code;
        } else {
            //js 
            code = parseRet.descriptor.script.content
                .replace('export default ', 'const __script = ') + `
import { render as __render } from "${ctx.path}?type=template"
__script.render = __render
export default __script`
        }
        ctx.body = code;
        ctx.type = TYPE_JS;
    }
    return next();
});

//2 修改 application/javascript 响应： import 路径, process.env.NODE_ENV， 
app.use(async (ctx, next) => {
    if (ctx.type === TYPE_JS) {
        const content = await streamToString(ctx.body); //?? 不改写body时 ERR_CONTENT_LENGTH_MISMATC
        ctx.body = content
            .replace(/(\s+from\s+['"])([\w@])/g, `$1${modulePrefix}$2`)
            .replace(/process\.env\.NODE_ENV/g, JSON.stringify('development'))
        // console.log(225, ctx.type);
    }
    return next();
})

const port = 3000;
app.listen(port, () => {
    console.log('listen', port);
})

/**
 * 
 * @param {*} stream 
 */
function streamToString(stream) {
    // console.log('type stream', typeof (stream));
    if (typeof (stream) === 'string') {
        return stream;
    }
    /**
     * @type ReadStream[]
     */
    const chunks = [];
    return new Promise((resolve, reject) => {
        stream.on('data', d => chunks.push(d));
        stream.on('end', () => {
            if (chunks.length === 0) {
                resolve('');
                return;
            }
            try {
                const ret = Buffer.concat(chunks);
                resolve(ret.toString('utf-8'))

            } catch (error) {
                console.log('reduce error:');
                console.log('reduce error:', chunks[0], chunks.length, error);
            }
        });
    })
}
