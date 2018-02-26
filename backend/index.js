

const https = require('https');
const express = require('express')
const app = express()
const firebase = require('firebase-admin');

const apiOfFire = "https://www.anapioficeandfire.com/api/"
const maxPage = "pageSize=50"

const serviceAccount = require('./key.json');

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: 'https://dashboard-of-ice-and-fire.firebaseio.com/'
});


app.get('/', (req, res) => {

})

app.get('/books', (req, res) => {
  getFromApi('books', res);
})

app.get('/houses', (req, res) => {
  getFromApi('houses', res, 1);
})

app.get('/characters', (req, res) => {
  getFromApi('characters', res);
})

const getFromApi = (path, res, page) => {
  page = !!page ? page : 1;
  https.get(`${apiOfFire + path}?${maxPage}&page=${page}`, resp => {
    console.log('STATUS: ' + resp.statusCode);
    console.log('HEADERS: ' + JSON.stringify(resp.headers.link));

    // Buffer the body entirely for processing as a whole.
    let bodyChunks = [];
    resp
      .on('data', chunk => bodyChunks.push(chunk))
      .on('end', () => {
        let body = Buffer.concat(bodyChunks);
        console.log('BODY: ' + JSON.parse(body)[0]);
        let data = JSON.parse(body);

        let count = (page - 1) * 50;
        data.forEach((d, i) => {
          console.log(d)
          writeToDb(`/${path}/${count}/0`, d)
          count++;
        })

        
        let response = data;

        if (path === 'books') {
          let widgets = createWidgets(data);
          writeToDb('/widgets', widgets)
          response = widgets;
        }

        let links = buildLinksObj(resp.headers.link);
        console.log(hasNextPage(links))
        

        res.send(response);
      })
      .on('error', e => {
        console.log('ERROR: ' + e.message);
        res.send(e);
      })
  });

}

const hasNextPage = (links) => {
  return links.some(link => link.position === 'rel="next"')
  
}

const buildLinksObj = link => {
  let urls = link.split(',');
  let obj = [];
  urls.forEach(url => {
    url = url.replace('<', '').replace('>', '').trim();
    url = url.split(';');
    obj.push({
      url: url[0].trim(),
      position: url[1].trim()
    })
  })
  console.log(obj)
  return obj;
}


const createWidgets = books => {
  let chars = [];
  let povChars = [];
  let payload = {
    books: 0,
    pages: 0
  }
  books.forEach(book => {
    payload.books += 1;
    payload.pages += book.numberOfPages;
    chars.push(book.characters);
    povChars.push(book.povCharacters);
  });

  chars = flattenArray(chars);
  povChars = flattenArray(povChars);

  payload.chars = chars.length;
  payload.povChars = povChars.length

  return payload;
}

const flattenArray = array => Array.from(new Set(
  Array.prototype.concat.apply([], array)));

writeToDb = (url, data) => firebase.database().ref(url).push(data)

app.listen(3000, () => console.log('Example app listening on port 3000!'))