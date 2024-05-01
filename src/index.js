import puppeteer from "puppeteer";
import fs, { existsSync, mkdirSync } from "fs";
import path from "path";
import { songList } from "./song-list.js";

const builtTabPage = (tab, artist, song) => {
  return `
  <html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="/src/tabs.css">
  <title>Tabs</title>
</head>
<body>
<label>
<input type="checkbox" name="cols" id="cols"/>
duas colunas
</label>
${tab}
<div>
<b>Cavaco</b>
<img src="../../static/${artist}-${song}.png" />
</div>
<div>
<b>Ukulele</b>
<img src="../../static/ukulele-${artist}-${song}.png" />
</div>
</body>
<script src="/src/tabs.js" type="module"></script>
</html>
  `;
};

const failedUrls = fs.existsSync("./failed.json")
  ? JSON.parse(fs.readFileSync("./failed.json"))
  : [];
const failedSearchUrls = fs.existsSync("./failedSearch.json")
  ? JSON.parse(fs.readFileSync("./failedSearch.json"))
  : [];
const sucessUrls = {};

const downloadTab = async (artist, song, page, fileName) => {
  if (
    page.url() ===
      "https://www.cifraclub.com.br/#instrument=cavaco&tabs=false&columns=true" ||
    page.url() ===
      `https://www.cifraclub.com.br/${artist}/#instrument=cavaco&tabs=false&columns=true`
  ) {
    throw new Error(`url not found: ${artist} ${song}`);
  }

  // mais um check pra ver se eh  so a letra

  try {
    await page.waitForSelector("#side-exibir", { timeout: 100 });
    await page.click("#side-exibir");
    const twoCol = 'label[for="exib1"]';
    await page.waitForSelector(twoCol);
    await page.click(twoCol);
  } catch (error) {
    throw new Error(
      `failed download: ${artist} ${song} ${page.url()}, Error: ${error}`
    );
  }

  let content = "";

  const tabElements = [".t1", ".t3", "#cifra_tom", ".col1", ".col2"];

  for await (const iterator of tabElements) {
    const html = await page.$eval(iterator, (e) => {
      return e.outerHTML;
    });
    content += html;
  }

  const chords = await page.waitForSelector(".cifra_acordes ul");
  await chords.evaluate((el) => (el.style.display = "inline-block"));

  await page.mouse.move(0, 0);

  await chords.screenshot({
    path: `static/${artist}-${song}.png`,
    type: "png",
  });

  const ukuleleBtn = 'input[value="ukulele"]+label';
  await page.waitForSelector(ukuleleBtn);
  await page.click(ukuleleBtn);

  await page.mouse.move(0, 0);

  await chords.screenshot({
    path: `static/ukulele-${artist}-${song}.png`,
    type: "png",
  });
  let outputFolder = fileName.split("/");
  outputFolder.pop();
  outputFolder = outputFolder.join("/");

  if (!existsSync(outputFolder)) {
    mkdirSync(outputFolder);
  }

  fs.writeFileSync(fileName, builtTabPage(content, artist, song));

  if (sucessUrls[artist]) {
    sucessUrls[artist].songs.push(song);
  } else {
    sucessUrls[artist] = {
      artist,
      songs: [song],
    };
  }
};

const searchTab = async (artist, song, page) => {
  const pattern = new RegExp("-", "g");
  const value = `${artist.replace(pattern, " ")} ${song.replace(pattern, " ")}`;
  console.log(value);
  try {
    await page.$eval("#js-h-search", (el, value) => (el.value = value), value);
    console.log("eval");

    await page.click('button[type="submit"]');
    await page.waitForSelector(".gsc-webResult.gsc-result");
    await page.click(".gsc-webResult.gsc-result:first-child a");
  } catch (error) {
    throw new Error(
      `failed search: ${artist} ${song} ${page.url()}, Error: ${error}`
    );
  }

  console.log("end");
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
  <link rel="stylesheet" href="index.css"></link>
<body>
<input type="search" id="search"/>
<ul id="tabList">

</ul>
</body>
<script>
  var tabList = ${JSON.stringify(tabList)}
</script>
<script src="index.js"></script>
</html>
  `;

  fs.writeFileSync(`index.html`, index);
};

const remainingSong = songList.filter(
  (song) =>
    !(
      failedUrls.find(
        (s) => s.artist === song.artist && song.songs.includes(s.song)
      ) ||
      failedSearchUrls.find(
        (s) => s.artist === song.artist && song.songs.includes(s.song)
      )
    )
);

const buildIndexFromTabs = (dir, result = []) => {
  fs.readdirSync(dir).forEach((artistFolder) => {
    const fullPath = path.resolve(dir, artistFolder);

    const tabInfo = { artist: artistFolder, songs: [] };

    fs.readdirSync(fullPath).forEach((tab) => {
      tabInfo.songs.push(tab.replace(".html", ""));
    });

    result.push(tabInfo);
  });
  return result;
};

const replaceTabContent = (dir, result = []) => {
  fs.readdirSync(dir).forEach((artistFolder) => {
    const fullPath = path.resolve(dir, artistFolder);
    fs.readdirSync(fullPath).forEach((tab) => {
      const tabPath = path.resolve(fullPath, tab);
      const tabContent = fs.readFileSync(tabPath).toString();

      const scriptPattern = new RegExp("<script(?:\n|.)*</script>", "gi");
      const stylesPattern = new RegExp("<style(?:\n|.)*</style>", "gi");
      const replaced = tabContent
        .replace(
          scriptPattern,
          '<script src="/src/tabs.js" type="module"></script>'
        )
        .replace(stylesPattern, '<link rel="stylesheet" href="/src/tabs.css">');

      fs.writeFileSync(tabPath, replaced);
    });
  });
};

(async () => {
  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: [
      "--user-data-dir=/Users/arielflor/Library/Application Support/Google/Chrome/Default",
      "--no-sandbox",
    ],
  });
  const page = await browser.newPage();

  await page.setViewport({ width: 1080, height: 1024 });
  // const url = `https://www.cifraclub.com.br`;
  // await page.goto(url);

  for await (const tab of remainingSong) {
    for await (const song of tab.songs) {
      console.log(`start ${tab.artist} ${song}`);

      const outputPath = `tabs/${tab.artist}`;
      const fileName = path.resolve(`${outputPath}/${song}.html`);

      if (existsSync(fileName)) {
        console.log(`skiping, file ${fileName} exists...`);
        continue;
      }
      const url = `https://www.cifraclub.com.br/${tab.artist}/${song}/#instrument=cavaco&tabs=false&columns=true`;
      try {
        await page.goto(url);
      } catch (error) {
        console.log(`error navigating to ${url} retrying...`);
        try {
          await page.goto(url);
        } catch (error) {
          console.log(`failed navigating to ${url}`);
          failedUrls.push({ artist: tab.artist, song });
          continue;
        }
      }

      try {
        await downloadTab(tab.artist, song, page, fileName);
      } catch (error) {
        console.log(`error downloading ${url} ${error} trying search...`);
        try {
          await searchTab(tab.artist, song, page);
          await downloadTab(tab.artist, song, page, fileName);
        } catch (error) {
          console.log(`error searching ${tab.artist} ${song}} ${error}`);
          failedSearchUrls.push({ artist: tab.artist, song }); 
        }
      }

      fs.writeFileSync(`./failed.json`, JSON.stringify(failedUrls));
      fs.writeFileSync(`./failedSearch.json`, JSON.stringify(failedSearchUrls));
    }
  }

  await browser.close();
})();

const tabData = buildIndexFromTabs(path.resolve("./tabs"));
buildIndex(tabData);

// replaceTabContent(path.resolve("./tabs"));
