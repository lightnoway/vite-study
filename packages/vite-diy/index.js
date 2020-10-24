#! /usr/bin/env node
const Koa = require('koa');
const send = require('koa-send');
const path = require('path');

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
    console.log(000, ctx.path);
    //index 非空，会路由到index指向的文件，文件不存在则报错
    return next();
})

//1 静态文件服务器
app.use(async (ctx, next) => {
    if (ctx.overrideSend) {
        await send(...ctx.overrideSend);
    } else {
        await send(ctx, ctx.path, { root: process.cwd(), index: 'index.html' });
    }
    //index 非空，会路由到index指向的文件，文件不存在则报错
    return next();
})
//2 替换import 中 字母/@ 开头的库的路径
app.use(async (ctx, next) => {
    if (ctx.type === 'application/javascript') {
        const content = await streamToString(ctx.body); //?? 不改写body时 ERR_CONTENT_LENGTH_MISMATC
        ctx.body = content.replace(/(import.*from\s+')([\w@])/g, `$1${modulePrefix}$2`);
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
            /**@type ReadStream */
            const all = chunks.reduce((a, b) => a.concat(b));
            resolve(all.toString('utf-8'))
        });
    })
}