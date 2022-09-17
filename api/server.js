("use strict");
if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
  //Vercel
  let chrome = require("chrome-aws-lambda");
  let puppeteer = require("puppeteer-core");
} else {
  //Local Test
  let puppeteer = require("puppeteer");
}

const express = require("express");
const line = require("@line/bot-sdk");
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const config = {
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
};

const app = express();

app.get("/", (req, res) => res.send("Hello LINE BOT!(GET)")); //ブラウザ確認用(無くても問題ない)
app.post("/webhook", line.middleware(config), (req, res) => {
  console.log(req.body.events);
  Promise.all(req.body.events.map(handleEvent)).then((result) =>
    res.json(result)
  );
});

const client = new line.Client(config);
let id;

async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return Promise.resolve(null);
  }

  if (event.message.text === "ストップ" && id !== undefined) {
    clearInterval(id);
    await client.pushMessage(event.source.userId, {
      type: "text",
      text: "動作を停止しました。",
    });
  } else {
    fetchData(
      "https://beauty.hotpepper.jp/CSP/bt/reserve/?storeId=H000255127&couponId=CP00000006479077&add=2&addMenu=0&rootCd=10",
      event.source.userId
    );
  }

  return client.replyMessage(event.replyToken, {
    type: "text",
    text: event.message.text, //実際に返信の言葉を入れる箇所
  });
}

const fetchData = async (
  url,
  userId,
  loop = 0,
  previousData = [],
  previousDays = []
) => {
  // カット以外は無効(ネイルなど)
  if (loop === 0) {
    await client.pushMessage(userId, {
      type: "text",
      text: "予約状況をチェックします。",
    });
  }
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await client.pushMessage(userId, {
    type: "text",
    text: loop,
  });
  await page.goto(url);

  const fetchText = async (selector) => {
    const path = await page.$$(selector);
    if (path[0] === undefined) {
      return false;
    }
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

  if (previousDays.length > 0 && previousDays[0] !== days[0]) {
    await client.pushMessage(userId, {
      type: "text",
      text: "日付が変わりました。",
    });
    await browser.close();
    return;
  }

  // console.log(days);

  const times = await fetchText(".timeTableLeft");

  // console.log(times);

  if (!times || !days) {
    await client.pushMessage(userId, {
      type: "text",
      text: "無効なURLです。",
    });
    await browser.close();
    return;
  }
  const column = [];

  const freeSchedules = [];

  for (let i = 0; i < times.length; i++) {
    row = new Array(days.length);
    column.push(row);
  }

  const schedules = await fetchText("#jsRsvCdTbl > table > tbody > tr");

  if (!schedules) {
    await client.pushMessage(userId, {
      type: "text",
      text: "スケジュールが確認できませんでした。",
    });
    await browser.close();
    return;
  }

  const trimSchedules = trimHoliday(schedules);

  let num = times.length;

  for (let i = 0; i < days.length; i++) {
    for (let j = 0; j < times.length; j++) {
      column[j][i] = trimSchedules[num];
      num += 1;

      if (previousData.length === 0) {
        continue;
      }
      if (previousData[j][i] === "×" && column[j][i] === "◎") {
        message = `${days[i]}の${times[j]}が空きました。`;
        freeSchedules.push(message);
      }
    }
  }

  if (freeSchedules.length > 0) {
    for (let i = 0; i < freeSchedules.length; i++) {
      console.log();
      await client.pushMessage(userId, {
        type: "text",
        text: `${freeSchedules[i]} \n ${url}`,
      });
    }
  }

  console.table(column);
  await browser.close();

  loop += 1;
  console.log(loop);
  if (loop >= 180) {
    return;
  }

  id = setTimeout(fetchData, 1000 * 60, url, userId, loop, column, days);
};

process.env.NOW_REGION ? (module.exports = app) : app.listen(PORT);
console.log(`Server running at ${PORT}`);
