var express = require('express');
var bodyParser = require('body-parser')
var methodOverride = require('method-override')
var cors = require('cors')
var port = process.env.PORT || 5000; //put your preferred port number
var app = express();
var UserController = require("./Controller/UserController");

app.use(express.json({type:'applicaion/json', limits:'200mb'}))
app.use(bodyParser.json())
app.use(methodOverride());

app.use(cors())
app.options('*', cors());


app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, 'Content-Type' : 'multipart/form-data' ,* "
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, PUT, DELETE, OPTIONS"
  );
  next();
});

//for routing
// app.post('/api/User', function (req, res) {
//   console.log('+++++++', req);  

//   res.status(200).send({ok:true});
// })
app.use('/', UserController);
app.use('/', express.static('pages'));

app.listen(port, () => {
  console.log('Server started! At http://localhost:' + port);
});
