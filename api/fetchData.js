const puppeteer = require("puppeteer");
("use strict");

const fetchData = async (url, loop, previousData, previousDays) => {
  // カット以外は無効(ネイルなど)

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

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
    console.log("日付が変わりました");
    await browser.close();
    return;
  }

  console.log(days);

  const times = await fetchText(".timeTableLeft");

  console.log(times);

  if (!times || !days) {
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
      console.log(freeSchedules[i]);
    }
  }

  console.table(column);
  await browser.close();

  loop += 1;
  console.log(loop);
  // if (loop >= 10) {
  //   return;
  // }

  setTimeout(fetchData, 1000 * 10, url, loop, column, days);
};

fetchData("https://fumifumi238.github.io/hotpepper_fake_page/", 0, [], []);

// TODO
let id = 0;
const hoge = (i) => {
  i += 1;
  id = setTimeout(hoge, 1000, i);
  console.log(i);
};

hoge(0);

setTimeout(() => {
  clearTimeout(id);
}, 5000);
