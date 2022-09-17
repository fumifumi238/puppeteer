
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
