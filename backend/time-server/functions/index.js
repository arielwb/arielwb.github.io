
'use strict';


const functions = require('firebase-functions');
const moment = require('moment');
const express = require('express');
const https = require('https');
const cors = require('cors')({
  origin: true,
});

const app = express();
const apiOfFire = "https://www.anapioficeandfire.com/api/"
const maxPage = "pageSize=50"

app.get('/books', (req, res) => {
  
    https.get(apiOfFire + 'books?' + maxPage, function (resp) {
      console.log('STATUS: ' + res.statusCode);
      console.log('HEADERS: ' + JSON.stringify(res.headers));
  
      // Buffer the body entirely for processing as a whole.
      let bodyChunks = [];
      resp
        .on('data', chunk => bodyChunks.push(chunk))
        .on('end', () => {
          let body = Buffer.concat(bodyChunks);
          console.log('BODY: ' + JSON.parse(body)[0].name);
          let books = JSON.parse(body);
          let payload = {
            books: 0,
            pages: 0
          }
          let chars = [];
          let povChars = [];
  
          books.forEach(book => {
            payload.books += 1;
            payload.pages += book.numberOfPages;
            chars.push(book.characters);
            povChars.push(book.povCharacters);
          });
  
          chars = Array.prototype.concat.apply([], chars);
          povChars = Array.prototype.concat.apply([], povChars);
  
          chars = Array.from(new Set(chars));
          povChars = Array.from(new Set(povChars));
          
          payload.chars = chars.length;
          payload.povChars = povChars.length;
          
          res.send(payload);
        })
        .on('error', e => {
          console.log('ERROR: ' + e.message);
          res.send(e);
        })
    });
  
  })

app.all('/date', (req, res) => {

  if (req.method === 'PUT') {
    return res.status(403).send('Forbidden!');
  }

  // [START usingMiddleware]
  // Enable CORS using the `cors` express middleware.
  cors(req, res, () => {

    // Reading date format from URL query parameter.
    // [START readQueryParam]
    let format = req.query.format;

    // Reading date format from request body query parameter
    if (!format) {
      format = req.body.format;
    }
    // [START sendResponse]
    const formattedDate = moment().format(format);
    console.log('Sending Formatted date:', formattedDate);
    res.status(200).send(formattedDate);

  });
});

// Expose the API as a function
exports.api = functions.https.onRequest(app);


