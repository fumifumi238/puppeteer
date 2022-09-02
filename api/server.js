const puppeteer = require("puppeteer");
("use strict");

const express = require("express");
const line = require("@line/bot-sdk");
const PORT = process.env.PORT || 3000;

const config = {
  channelSecret: CHANNEL_SECRET,
  channelAccessToken: CHANNEL_ACCESS_TOKEN,
};

const app = express();

// app.get("/", (req, res) => res.send("Hello LINE BOT!(GET)")); //ブラウザ確認用(無くても問題ない)
app.post("/webhook", line.middleware(config), (req, res) => {
  console.log(req.body.events);

  Promise.all(req.body.events.map(handleEvent)).then((result) =>
    res.json(result)
  );
});

const client = new line.Client(config);

async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return Promise.resolve(null);
  }

  return client.replyMessage(event.replyToken, {
    type: "text",
    text: event.message.text, //実際に返信の言葉を入れる箇所
  });
}

app.listen(PORT);
console.log(`Server running at ${PORT}`);
const fetchData = () => async () => {
  // 0時にはリセットする
  //　過ぎた時間は削除
  // クーポン追加するとクッキーがいるので無効になる
  // カット以外は無効(ネイルなど)

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const url =
    "https://beauty.hotpepper.jp/CSP/bt/reserve/?storeId=H000255127&couponId=CP00000006479077&add=2&addMenu=0&rootCd=10";
  await page.goto(url);

  const fetchText = async (selector) => {
    const path = await page.$$(selector);
    const jsHandle = await path[0].getProperty("textContent");
    const text = await jsHandle.jsonValue();
    const list = text.trim().replace(/\s+/g, " ").split(" ");

    return list;
  };

  const trimHoliday = (text) => {
    const num = schedules.indexOf("休業日");

    if (num == -1) {
      return text;
    }

    text.splice(num, 1, ...Array(times.length).fill("－"));

    return trimHoliday(text);
  };

  const days = await fetchText(".dayCellContainer");

  // console.log(days);

  const times = await fetchText(".timeTableLeft");

  // console.log(times);
  const column = [];

  for (let i = 0; i < times.length; i++) {
    row = new Array(days.length);
    column.push(row);
  }

  const schedules = await fetchText("#jsRsvCdTbl > table > tbody > tr");

  const trimSchedules = trimHoliday(schedules);

  let num = times.length;

  for (let i = 0; i < days.length; i++) {
    for (let j = 0; j < times.length; j++) {
      column[j][i] = trimSchedules[num];
      num += 1;
    }
  }

  console.table(column);
  await browser.close();
};

process.env.NOW_REGION ? (module.exports = app) : app.listen(PORT);
console.log(`Server running at ${PORT}`);