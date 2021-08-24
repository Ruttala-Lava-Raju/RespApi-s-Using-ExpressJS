const mysql = require('mysql')

var connection = mysql.createConnection({
	host: '165.22.14.77',
	user: 'b27',
	password: 'b27',
	database: 'lavraj_db'
})

module.exports = connection