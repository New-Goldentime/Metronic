var Users = require('../models/UserModel.js');
var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt')
var jwt = require('jsonwebtoken');
var sql = require("mysql");
var app = express();
var conn = require("../connection/connect")


//show all Users
router.get('/api/Users', (req, res) => {
  let userlist = [];
  let sql = "SELECT * FROM application_user";
  let query = conn.query(sql, (err, users) => {
    if (err) throw err;

    let user_list = JSON.stringify(users)
    user_list = JSON.parse(user_list)

    if (user_list.length > 0) {
      for (let i = 0; i < user_list.length; i++) {
        let sql = "SELECT * FROM application_user as au inner join application_order as ao on ao.user_id = au.id where father=" + user_list[i].id;

        let query = conn.query(sql, async (err, results) => {
          if (err) throw err;
          let result = []

          if (results.length > 0) {
            results.map(item => {
              var temp = {}
              temp.value = 0;
              temp.value += item.volume
              let sql = `with recursive cte (id, user_name, position, father, notes, volume) as (
                        select   application_user.id, user_name, position, father, notes, ao.volume
                        from     application_user inner join application_order as ao on ao.user_id = application_user.id
                        where    father = ${item.user_id}
                        union all
                        select    au.id,
                                  au.user_name,
                                  au.position,
                                  au.father,
                                  au.notes,
                                  application_order.volume
                        from      application_user au
                        inner join cte
                                on au.father = cte.id
                        inner join application_order on application_order.user_id = au.id
                      )
                      select * from cte;`

              let query = conn.query(sql, async (err, results1) => {
                if (item.position)
                  temp.position = item.position

                if (results1.length > 0)
                  temp.value += results1.map(item => item.volume).reduce((prev, curr) => prev + curr, 0);
                result.push(temp)
                if (result.length == 2) {
                  let minVolume = Math.min(result[0].value, result[1].value);
                  let cycle = parseInt(minVolume / 200);
                  let commission = 20 * cycle;

                  let LPV = result[0].value;
                  let RPV = result[1].value;

                  if (result[0].position == 'L') {
                    LPV = result[0].value
                    RPV = result[1].value
                  }
                  else if (result[0].position == 'R') {
                    LPV = result[1].value
                    RPV = result[0].value
                  }


                  let user = { user_name: user_list[i].user_name, commission: commission, LPV: LPV, RPV: RPV };

                  userlist.push(user);
                }
                if (results.length == 1 && result.length == 1) {
                  let minVolume = result[0].value;
                  let cycle = parseInt(minVolume / 200);
                  let commission = 20 * cycle;
                  let LPV = result[0].value;
                  let RPV = 0;

                  let user = { user_name: user_list[i].user_name, commission: commission, LPV: LPV, RPV: RPV };

                  userlist.push(user);
                }
              })
            })
          }
          else {
            let user = { user_name: user_list[i].user_name, commission: 0, LPV: 0, RPV: 0 };

            userlist.push(user);
          }
        });
      }

      setTimeout(function () {
        res.send(JSON.stringify(userlist));
      }, 500);
    }
  });
});

// show all Binary volume
router.get('/api/Orders', (req, res) => {
  let sql = "SELECT * FROM application_order as ao inner join application_user as au on ao.user_id = au.id";
  let query = conn.query(sql, (err, results) => {
    if (err) throw err;
    res.send(JSON.stringify(results));
  });
});

// get the commission of user
router.get('/api/User/:id', (req, res) => {
  let sql = "SELECT * FROM application_user as au inner join application_order as ao on ao.user_id = au.id where father=" + req.params.id + " GROUP BY ao.user_id";

  let query = conn.query(sql, async (err, results) => {
    if (err) throw err;
    let result = []
    if (results.length > 0) {
      results.map(item => {
        var temp = {}
        temp.value = 0;
        temp.value += item.volume
        // console.log(temp.value);
        let sql = `with recursive cte (id, user_name, position, father, notes, volume) as (
              select   application_user.id, user_name, position, father, notes, ao.volume
              from     application_user inner join application_order as ao on ao.user_id = application_user.id
              where    father = ${item.user_id}
              union all
              select    au.id,
                        au.user_name,
                        au.position,
                        au.father,
                        au.notes,
                        application_order.volume
              from      application_user au
              inner join cte
                      on au.father = cte.id
              inner join application_order on application_order.user_id = au.id
            )
            select * from cte;`

        let query = conn.query(sql, async (err, results1) => {
          if (item.position)
            temp.position = item.position

          if (results1.length > 0)
            temp.value += results1.map(item => item.volume).reduce((prev, curr) => prev + curr, 0);

          // console.log(temp.value);
          result.push(temp)
          if (result.length == 2) {
            let minVolume = Math.min(result[0].value, result[1].value);
            let cycle = parseInt(minVolume / 200);
            let commission = 20 * cycle;
            let LPV = result[0].value;
            let RPV = result[1].value;

            if (result[0].position == 'L') {
              LPV = result[0].value
              RPV = result[1].value
            }
            else if (result[0].position == 'R') {
              LPV = result[1].value
              RPV = result[0].value
            }

            let user = { commission: commission, LPV: LPV, RPV: RPV };

            res.send(JSON.stringify(user))
          }
          if (results.length == 1 && result.length == 1) {
            let minVolume = result[0].value;
            let cycle = parseInt(minVolume / 200);
            let commission = 20 * cycle;
            let LPV = result[0].value;
            let RPV = 0;

            let user = { commission: commission, LPV: LPV, RPV: RPV };

            res.send(JSON.stringify(user))
          }
        })
      })
    }
    else {
      res.send(JSON.stringify({}))
    }
  });
});


//add new User
router.post('/api/User', async (req, res) => {
  console.log('------', req.body);

  let { password, email } = req.body;

  let encryptedPassword = await bcrypt.hash(password, 10);

  let data = {
    user_name: `${req.body.firstname}_${req.body.lastname}`,
    position: 'sldflsdf',
    father: 1,
    notes: 'wer',
    firstname: req.body.firstname,
    lastname: req.body.lastname,
    password: encryptedPassword,
    email: req.body.email
  };

  // const token = jwt.sign(
  //   { email },
  //   process.env.TOKEN_KEY,
  //   {
  //     expiresIn: "2h",
  //   }
  // );

  const accessToken = "sdolfuoswfuowrueiow";
  console.log('-token', accessToken)

  let sql = "INSERT INTO application_user SET ?";
  let query = conn.query(sql, data, (err, results) => {
    if (err) throw err;

    res.send(JSON.stringify({ accessToken }));
  });
});

//update User
router.put('/api/User/:id', (req, res) => {
  let sql = "UPDATE application_user SET user_name='" + req.query.name + "', position='" + req.query.position + "', father='" + req.query.number + "', notes='" + req.query.notes + "' WHERE id=" + req.params.id;
  let query = conn.query(sql, (err, results) => {
    if (err) throw err;
    res.send(JSON.stringify(results));
  });
});

//Delete User
router.delete('/api/User/:id', (req, res) => {
  let sql = "DELETE FROM users WHERE id=" + req.params.id;
  let query = conn.query(sql, (err, results) => {
    if (err) throw err;
    res.send(JSON.stringify(results));
  });
});

//show single User
router.get('/api/User/:id', (req, res) => {
  let sql = "SELECT * FROM users WHERE id=" + req.params.id;
  let query = conn.query(sql, (err, results) => {
    if (err) throw err;
    res.send(JSON.stringify(results));
  });
});

router.get('/api/login', async (req, res) => {

  // console.log(req.query)
  let { password, email } = req.query

  const user = await Users.findAll({
    where: {
      email: email
    }
  });
  const match = await bcrypt.compare(password, user[0].password);
  if (!match) return res.status(400).json({ msg: "Wrong Password" });
  const userId = user[0].id;
  const name = user[0].name;
  let accessToken = 'www'
  accessToken = jwt.sign({ userId, name, email }, 'myLogin', {
    expiresIn: '15s'
  });

  
  res.json({ accessToken });
});

router.get('/api/verify_token', (req, res) => {
  console.log('-----------------', req.query)
  // let sql = "SELECT * FROM users WHERE id=" + req.params.id;
  // let query = conn.query(sql, (err, results) => {
  //   if (err) throw err;
  //   res.send(JSON.stringify(results));
  // });
  const accessToken = "sdolfuoswfuowrueiow";
  res.json({ accessToken })
});



module.exports = router;