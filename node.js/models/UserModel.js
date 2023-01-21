var { Sequelize } = require('sequelize');
var db = require('../config/Database.js');

const { DataTypes } = Sequelize;

const Users = db.define('application_user', {
    position: {
        type: DataTypes.STRING
    },
    father: {
        type: DataTypes.NUMBER
    },
    notes: {
        type: DataTypes.STRING
    },
    firstname: {
        type: DataTypes.STRING
    },
    lastname: {
        type: DataTypes.STRING
    },
    email: {
        type: DataTypes.STRING
    },
    password: {
        type: DataTypes.STRING
    },
    // refresh_token: {
    //     type: DataTypes.TEXT
    // }
}, {
    freezeTableName: true
});

(async () => {
    await db.sync();
})();

module.exports = Users;