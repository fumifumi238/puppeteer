const puppeteer = require("puppeteer");

(async () => {
  // 0時にはリセットする
  //　過ぎた時間は削除
  // クーポン追加するとクッキーがいるので無効になる
  // カット以外は無効
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
})();
