const express = require('express')

const connection = require('./MysqlConnection.js')

const app = express()
const port = 8001
const urlTail = "/api/syllabus/"

app.listen(port, function(){
	console.log(`http://localhost:${port}${urlTail}`)
})

connection.connect(function(error)
{
	if(error) throw error
})

app.get(urlTail, function(request, response)
{
	connection.query("select * from Syllabuses", function(error, result, feilds){
		if(error) throw error
			console.log(result)
			response.status(200).send(result)
		})
})
