const puppeteer = require("puppeteer");

(async () => {
  // 0時にはリセットする
  //　過ぎた時間は削除
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(
    "https://beauty.hotpepper.jp/CSP/bt/reserve/?storeId=H000257369&couponId=CP00000005849082&add=2&addMenu=0&rootCd=10&wak=BPCO104005_button_style_coupon"
  );

  const fetchText = async (xPath) => {
    const path = await page.$x(xPath);
    const jsHandle = await path[0].getProperty("textContent");
    const text = await jsHandle.jsonValue();
    const list = text.trim().replace(/\s+/g, " ").split(" ");

    return list;
  };
  const days = await fetchText('//*[@id="jsRsvCdTbl"]/table/thead/tr[2]');

  console.log(days);

  const times = await fetchText(
    '//*[@id="jsRsvCdTbl"]/table/tbody/tr/th[1]/table'
  );

  console.log(times);
  const column = [];

  for (let i = 0; i < times.length; i++) {
    row = [];
    for (let j = 0; j < days.length; j++) {
      row.push("－");
    }
    column.push(row);
  }

  const schedules = await fetchText('//*[@id="jsRsvCdTbl"]/table/tbody/tr');

  const trimHoliday = (text) => {
    const num = schedules.indexOf("休業日");

    if (num == -1) {
      return text;
    }

    text.splice(num, 1, ...Array(times.length).fill("－"));

    return trimHoliday(text);
  };

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
