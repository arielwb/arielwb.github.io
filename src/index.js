import puppeteer from "puppeteer";
import fs, { existsSync, mkdirSync } from "fs";

const builtTabPage = (tab) => {
  return `
  <html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tabs</title>
</head>
<style>
  .notes {
    display: flex
  }

  b {
    color: blueviolet;
    font-size: 16px;
  }
</style>
<body>
${tab}
</body>
</html>
  `;
};

const downloadTab = async (artist, song, page) => {
  const outputPath = `tabs/${artist}`;
  const fileName = `${outputPath}/${song}.html`;

  if (existsSync(fileName)) return;

  const url = `https://www.cifraclub.com.br/${artist}/${song}/#instrument=cavaco&tabs=false&columns=true`;
  await page.goto(url);

  await page.waitForSelector("#side-exibir");
  await page.click("#side-exibir");
  const twoCol = 'label[for="exib1"]';
  await page.waitForSelector(twoCol);
  await page.click(twoCol);

  let content = "";

  const tabElements = [".t1", ".t3", "#cifra_tom", ".col1", ".col2"];

  for await (const iterator of tabElements) {
    const html = await page.$eval(iterator, (e) => {
      return e.outerHTML;
    });
    content += html;
  }

  if (!existsSync(outputPath)) {
    mkdirSync(outputPath);
  }

  fs.writeFileSync(fileName, builtTabPage(content));
};

const buildIndex = (tabList) => {
  const index = `
  <html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tabs</title>
</head>
<style>
  .notes {
    display: flex
  }

  b {
    color: blueviolet;
    font-size: 16px;
  }
</style>
<body>
<ul>
${tabList
  .map((tab) => {
    return tab.songs
      .map(
        (song) =>
          `<li>
    <a href="./tabs/${tab.artist}/${song}">${tab.artist} - ${song}</a>
    </li>`
      )
      .join("");
  })
  .join("")}
</body>
</html>
  `;

  fs.writeFileSync(`index.html`, index);
};

const tabs = [
  {
    artist: "molejo",
    songs: [
      "cilada",
      "danca-da-vassoura",
      "brincadeira-de-crianca",
      "paparico",
    ],
  },
  {
    artist: "so-pra-contrariar",
    songs: [
      "essa-tal-liberdade",
      "a-barata",
      "que-se-chama-amor",
      "mineirinho",
      "sai-da-minha-aba",
    ],
  },
  {
    artist: "zeca-pagodinho",
    songs: ["deixa-vida-me-levar", "vai-vadiar", "maneiras", "vacilao"],
  },
];

(async () => {
  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch({
    headless: false,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: [
      "--user-data-dir=/Users/arielflor/Library/Application Support/Google/Chrome/Default",
    ],
  });
  const page = await browser.newPage();

  await page.setViewport({ width: 1080, height: 1024 });

  for await (const tab of tabs) {
    for await (const song of tab.songs) {
      await downloadTab(tab.artist, song, page);
    }
  }

  buildIndex(tabs);

  await browser.close();
})();
