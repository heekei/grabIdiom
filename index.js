const axios = require('axios').default
const cheerio = require('cheerio');
const fs = require('fs')
const http = require('http')
const iconv = require('iconv-lite')
const Promise = require('q').Promise

async function getPage(n) {
    const res = await axios.get(`http://www.hydcd.com/cy/fkccy/index${n === 1 ? '' : n}.htm`, {
        headers: {
            'Content-Type': 'text/html; charset=gb2312'
        }
    });
    return new Promise((resolve, reject) => {

        http.get(`http://www.hydcd.com/cy/fkccy/index${n === 1 ? '' : n}.htm`, data => {
            let res;
            data.on('data', (chunk) => {
                res += iconv.decode(chunk, 'gb2312');
            })
            data.on('error', reject);
            data.on('end', () => {
                resolve(res);
            })
        })
    })
}

async function saveImg(url, fname) {
    const ws = fs.createWriteStream(fname);
    return new Promise((resolve, reject) => {
        http.get(url, (imgData) => {
            imgData.pipe(ws);
            imgData.on('error', reject);
            imgData.on('end', resolve)
        });
    })
}

async function main() {
    for (let i = 1; i <= 10; i++) {
        const pageData = await getPage(i).catch(err => {
            console.log(`第${i}页抓取失败`, err.toString());
        });
        const $ = cheerio.load(pageData, { decodeEntities: true });
        const datas = $('#table1 td');
        const imghash = {};
        datas.each(async (index, item) => {
            const imgElm = $(item).find('img');
            const shortUrl = imgElm.attr('src');
            const imgUrl = 'http://www.hydcd.com/cy/fkccy/' + shortUrl;
            const subfix = imgUrl.substr(imgUrl.lastIndexOf('.'), imgUrl.length);
            let answer = imgElm.attr('alt');
            if (!answer) {
                const a = $(item).find('a');
                if (a.length > 0) {
                    answer = a.text();
                } else {
                    answer = $(item).find('p').eq(2).text().trim().split(/[:：]/)[1]
                }
            }
            if (answer && shortUrl) {
                imghash[answer] = [imgUrl, subfix];
            } else {
                console.log(answer, shortUrl);
            }
        });
        for (const answer in imghash) {
            if (imghash.hasOwnProperty(answer)) {
                const [imgUrl, subfix] = imghash[answer];
                await saveImg(imgUrl, './demo/' + answer + subfix).catch(err => {
                    console.log(answer, '保存失败', err.toString());
                })
            }
        }
    }
    process.exit();
}
main();