#! /usr/bin/env node
const Koa = require('koa');
const send = require('koa-send');
const path = require('path');
const parseSFC = require('@vue/compiler-sfc');

const app = new Koa();

const modulePrefix = `/@modules/`;
//3 响应./@modules/
app.use(async (ctx, next) => {
    if (ctx.path.startsWith(modulePrefix)) {
        //通过 vue 拿到 其package.module指向的文件; 此处拿package.json  未考虑通用性
        const moduleName = ctx.path.substr(modulePrefix.length);
        const modulePkg = require(path.join(require.resolve(moduleName), '../package.json'));
        const moduleFilePath = path.join(require.resolve(moduleName), '../', modulePkg.module);
        const moduleFilePathP = path.parse(moduleFilePath);
        ctx.overrideSend = [ctx, moduleFilePathP.base, { root: moduleFilePathP.dir }];
    }
    return next();
})

//1 静态文件服务器
app.use(async (ctx, next) => {
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
        // console.log('.vue', ctx.path);
        //.vue 直接被响应了, 但实际需要的parse后的文件
        // if(ctx.query.)
        let code = await streamToString(ctx.body);
        const parseRet = parseSFC.parse(code);
        // console.log('parseRet', parseRet);
        if (ctx.query.type === 'template') {
            //template
            code = parseSFC.compileTemplate(parseRet.descriptor).code;
            // console.log('template========', code);
        } else {
            //js 
            code = parseRet.descriptor.script.content
                .replace('export default ', 'const __script = ') + `
import { render as __render } from "${ctx.path}?type=template"
__script.render = __render
export default __script`
        }
        ctx.body = code;
        ctx.type = 'application/javascript';
    }
    return next();
});

//2 替换import 中 字母/@ 开头的库的路径
app.use(async (ctx, next) => {
    if (ctx.type === 'application/javascript') {
        const content = await streamToString(ctx.body); //?? 不改写body时 ERR_CONTENT_LENGTH_MISMATC
        ctx.body = content.replace(/(\s+from\s+['"])([\w@])/g, `$1${modulePrefix}$2`);
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
    console.log('type stream', typeof (stream));
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

//todo 响应图片，css