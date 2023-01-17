var { Sequelize } = require('sequelize');

const db = new Sequelize('metronic', 'root', 'admin', {
    host: "localhost",
    dialect: "mysql"
});

module.exports = db;