const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(
    "https://beauty.hotpepper.jp/CSP/bt/reserve/?storeId=H000257369&couponId=CP00000005849082&add=2&addMenu=0&rootCd=10&wak=BPCO104005_button_style_coupon"
  );

  const days = await page.$x('//*[@id="jsRsvCdTbl"]/table/thead/tr[2]');
  const jsHandle = await days[0].getProperty("textContent");
  const text = await jsHandle.jsonValue();
  const dayList = text.trim().replace(/\s+/g, " ").split(" ");
  for (let day in dayList) {
    console.log(dayList[day]);
  }

  await browser.close();
})();
