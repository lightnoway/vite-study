#! /usr/bin/env node
const Koa = require('koa');
const send = require('koa-send');

const app = new Koa();

app.use(testMid('1'));
app.use(testMid('2'));
app.use(testMid('3'));
/**
 *  输出
1:====
2:====
3:====
3.====
2.====
1.====
 */

const port = 3000;
app.listen(port, () => {
    console.log('listen', port);
})

function testMid(tag) {
    return function (ctx,next) {
        console.log(`${tag}:====`)
        next()
        console.log(`${tag}.====`)
    }
}
//