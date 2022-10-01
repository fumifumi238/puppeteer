("use strict");
let chrome = {};
let puppeteer;
if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
  //Vercel
  chrome = require("chrome-aws-lambda");
  puppeteer = require("puppeteer-core");
} else {
  //Local Test
  puppeteer = require("puppeteer");
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

const getBrowser = async () => {
  try {
    const options = process.env.AWS_LAMBDA_FUNCTION_VERSION
      ? {
          args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
          defaultViewport: chrome.defaultViewport,
          executablePath: await chrome.executablePath,
          headless: true,
          ignoreHTTPSErrors: true,
        }
      : {};

    const browser = await puppeteer.launch(options);
    return browser;
  } catch (err) {
    console.log(err);
    throw err;
  }
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
    client.pushMessage(event.source.userId, {
      type: "text",
      text: "動作を停止しました。",
    });
  } else {
    fetchPerMinute(
      "https://fumifumi238.github.io/hotpepper_fake_page/",
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

  if (loop > 5) {
    await client.pushMessage(userId, {
      type: "text",
      text: "検索を終了します",
    });
  }

  await client.pushMessage(userId, {
    type: "text",
    text: loop,
  });

  console.log(url);

  const browser = await getBrowser();

  console.log(browser);

  const page = await browser.newPage();

  await page.setDefaultNavigationTimeout(0);

  await page.goto(url, { waitUntil: "domcontentloaded" });

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

        await client.pushMessage(userId, {
          type: "text",
          text: `${message} \n ${url}`,
        });
      }
    }
  }

  console.table(column);

  await browser.close();

  await new Promise((resolve) => setTimeout(resolve, 3000));

  console.log(loop);

  await fetchData(url, userId, loop + 1, column, days);
};

const fetchPerMinute = async (url, userId) => {
  await fetchData(url, userId, 0);
};

process.env.NOW_REGION ? (module.exports = app) : app.listen(PORT);
console.log(`Server running at ${PORT}`);
