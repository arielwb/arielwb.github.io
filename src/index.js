import puppeteer from "puppeteer";
import fs, { existsSync, mkdirSync } from "fs";
import { songList } from "./song-list.js";

const builtTabPage = (tab, artist, song) => {
  return `
  <html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tabs</title>
</head>
<style>
  body {
    overflow-x: scroll;
    min-width: max-content;
  }

  .col1, .col2 {
    width: 50%;
    float: left;
  }
  
  #cifra_tom {
    display: block;
  }

  b {
    color: blueviolet;
    font-size: 16px;
  }

  img {
    display: block;
  }

  div {
    clear: both;
  }

</style>
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
<script>
const checkbox = document.getElementById("cols");

const removeCols = () => {
  const pre = document.querySelectorAll("pre");
  if (!checkbox.checked) {
    pre.forEach((el) => el.removeAttribute("class"));
  } else {
    pre.forEach((el, index) => el.setAttribute("class", "col"+(index+1)));
  }
}

removeCols()
  
checkbox.addEventListener('change', removeCols);
</script>
</html>
  `;
};

const downloadTab = async (artist, song, page) => {
  const outputPath = `tabs/${artist}`;
  const fileName = `${outputPath}/${song}.html`;

  if (existsSync(fileName)) return;

  const url = `https://www.cifraclub.com.br/${artist}/${song}/#instrument=cavaco&tabs=false&columns=true`;
  await page.goto(url);

  try {
    await page.waitForSelector("#side-exibir", { timeout: 500 });
    await page.click("#side-exibir");
    const twoCol = 'label[for="exib1"]';
    await page.waitForSelector(twoCol);
    await page.click(twoCol);
  } catch (error) {
    console.log(`failed ${url}`);
    return;
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

  if (!existsSync(outputPath)) {
    mkdirSync(outputPath);
  }

  fs.writeFileSync(fileName, builtTabPage(content, artist, song));
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

// const tabs2 = [
//   {
//     artist: "molejo",
//     songs: [
//       "cilada",
//       "danca-da-vassoura",
//       "brincadeira-de-crianca",
//       "paparico",
//     ],
//   },
//   {
//     artist: "so-pra-contrariar",
//     songs: [
//       "essa-tal-liberdade",
//       "a-barata",
//       "que-se-chama-amor",
//       "mineirinho",
//       "sai-da-minha-aba",
//     ],
//   },
//   {
//     artist: "zeca-pagodinho",
//     songs: ["deixa-vida-me-levar", "vai-vadiar", "maneiras", "vacilao"],
//   },
// ];

// const tabs = songList.map(song => {
//   const artist = replaceAccents(song.artist)
//   const songs = song.songs.map(replaceAccents)
//   return {
//     artist, songs
//   }
// })

// console.log(tabs)

// (async () => {
//   // Launch the browser and open a new blank page
//   const browser = await puppeteer.launch({
//     headless: true,
//     executablePath:
//       "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
//     args: [
//       "--user-data-dir=/Users/arielflor/Library/Application Support/Google/Chrome/Default",
//     ],
//   });
//   const page = await browser.newPage();

//   await page.setViewport({ width: 1080, height: 1024 });

//   // page.on("response", (response) => {
//   //   const status = response.status();
//   //   if (status >= 300 && status <= 399) {
//   //     console.log(
//   //       "Redirect from",
//   //       response.url(),
//   //       "to",
//   //       response.headers()["location"]
//   //     );
//   //   }
//   // });

//   for await (const tab of songList) {
//     for await (const song of tab.songs) {
//       await downloadTab(tab.artist, song, page);
//     }
//   }

  
//   await browser.close();
// })();

buildIndex(songList);