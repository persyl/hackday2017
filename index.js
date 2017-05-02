var url = require('url');
var moment = require('moment');
var express = require('express');
var base64 = require('base-64');
var fetch = require('node-fetch');
var Promise = require('promise');
var all = require('promise-all');
var secret = require('./secret');

var app = express();
app.set('port', (process.env.PORT || 8000));
app.use(express.static(__dirname + '/public'));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
// ####################################################################
// ####################################################################


app.get('/', function(request, response) {
const b64String = base64.encode(secret);

  let fetchParams = {
        headers: {
                  'Authorization': `Basic ${b64String}`,
                  'Content-Type' : 'application/json',
                  },
      };
      all([getChats(fetchParams), getTags(fetchParams)])
      .then(r => {
        response.render('pages/index', {title:'Bonnier News Kundservice', chats: r[0], tagResult: r[1]});
      });
});

function getTags(fetchParams){
  return fetch('https://dagensnyhetersupport.zendesk.com/api/v2/tags.json', fetchParams)
  .then(response =>{
    return response.json();
  })
  .then(json => {
    const customSortedTags = json.tags.sort((t1, t2) => {
      const uppsagning = t1.name.indexOf('uppsägning') >= 0;
      const nykund = t1.name.indexOf('nykund') >= 0;
      return uppsagning ? 1 : nykund ? -1 : 0;
    });
    //console.log(customSortedTags, json);
    return {tags: customSortedTags};
    //return json;
  })
}

function getChats(fetchParams){
  return fetch('https://www.zopim.com/api/v2/chats', fetchParams)
  .then(response => {
    return response.json();
  })
  .then(json => {
    const filteredChats = json.chats.filter(c => {
      const filteredHist = c.history.filter(h => {
        h.timestamp = moment(h.timestamp).format('HH:mm');

        return h.type === 'chat.msg';
      });
      return filteredHist.length > 1;
    });

    const chats = [];
    for (let i = 0; i < 40; i++){
      var item = filteredChats[i];

      const chatModel = {
        agent : null,
        messages: item.history.filter(h => {
          return h.type === 'chat.msg';
        }),
        type: item.type,
        department: item.department_name || 'Ingen produkt angiven',
        departmentLogoClass: getLogoClass(item.department_name),
        tags: item.tags,
      };

      chats.push(chatModel);

    }
    return chats;

  }).catch(error => console.log('ERROR', error));
}

function getLogoClass(departmentName){
  if(!departmentName)
    return 'bn_chatbox__department--bn';
    const className = 'bn_chatbox__department--';
    return departmentName.indexOf('1.') === 0 ? className + 'dn' : className + 'di';
}


app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});
