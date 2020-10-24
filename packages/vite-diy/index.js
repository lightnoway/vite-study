#! /usr/bin/env node
const Koa = require('koa');
const send = require('koa-send');
const path = require('path');

const app = new Koa();

console.log('index', path.resolve('./index.html'));
//1 静态文件服务器
app.use(async (ctx, next) => {
    await send(ctx, ctx.path, { root: process.cwd(), index: 'index.html' });
    //index 非空，会路由到index指向的文件，文件不存在则报错
    return next();
})


const port = 3000;
app.listen(port, () => {
    console.log('listen', port);
})