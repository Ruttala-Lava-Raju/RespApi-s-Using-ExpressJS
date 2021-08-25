const express = require('express')
const mysql = require('mysql')
const app = express()
const port = 8001

app.use(express.urlencoded({ extended: false }))
app.use(express.json())

var connection = mysql.createConnection({
	host: '165.22.14.77',
	user: 'b27',
	password: 'b27',
	database: 'Courses'
})

var userId = 102

connection.connect(function (error) {
	if (error) throw error
})

app.get("/api/syllabus/", function (request, response) {
	connection.query(`select syllabusID, title, description, objectives from Syllabuses where userId = ${userId} and status = 1`, function (error, result) {
		if (error) throw error
		response.status(200).send(result)
	})
})

app.post("/api/syllabus/", function (request, response) {
	const sqlQuery = `insert into Syllabuses(syllabusID, title, description, objectives, status, userId) values(?, ?, ?, ?, 1, ${userId})`
	const values = [request.body.syllabusID, request.body.title, request.body.description, request.body.objectives]
	if(values[0] == undefined || values[1] == undefined || values[2] == undefined || values[3] == undefined)
	{
		response.status(400)
		if(values[0] == undefined)
		{
			response.write("Please enter syllabus id.\n")
		}
		if(values[1] == undefined)
		{
			response.write("Please enter title.\n")
		}
		if(values[2] == undefined)
		{
			response.write("Please enter description.\n")
		}
		if(values[3] == undefined)
		{
			response.write("Please enter objectives.\n")
		}
		response.end()
	}
	else
	{
		connection.query(`select syllabusID from Syllabuses where SyllabusId = ${request.body.syllabusID}`, function(error, result){
			if(error) throw error
			if(result.length == 0)
			{
				connection.query(mysql.format(sqlQuery, values), function (error, result) {
					if (error) throw error
					response.status(201)
					connection.query(`select syllabusID, title, description, objectives from Syllabuses where syllabusID = ${result["insertId"]}`, function (error, result) {
						if (error) throw error
						response.json(result)
					})
				})
			}
			else
			{
				response.status(400)
				response.send("Syllabus Id already existed.")
			}
		})
	}
})

app.put('/api/syllabus/:id', function (request, response) {
	const id = request.params.id;
	const searchQuery = `select syllabusID from Syllabuses where syllabusID = ${id} and status = 1`
	connection.query(searchQuery, function (error, result) {
		if (error) throw error
		if (result.length != 0) 
		{
			connection.query(`select syllabusID from Syllabuses where syllabusID = ${id} and status = 1 and userId = ${userId}`, function(error, result){
				if(error) throw error
				if(result.length != 0)
				{
					const sqlQuery = `update Syllabuses set title = ?, description = ?, objectives = ? where syllabusID = ${id}`
					const values = [request.body.title, request.body.description, request.body.objectives]
					connection.query(mysql.format(sqlQuery, values), function (error, result) {
						if (error) throw error
						response.status(200)
						connection.query(`select syllabusID, title, description, objectives from Syllabuses where syllabusID = ${id}`, function(error, result){
							if(error) throw error
							response.send(result)
						})
					})
				}
				else
				{
					response.status(403).send(result)
				}
			})
		}
		else {
			response.status(404).send(result)
		}
	})
})

app.delete("/api/syllabus/:id", function (request, response) {
	const id = request.params.id
	const sqlQuery = `select syllabusID from Syllabuses where syllabusID = ${id}`
	connection.query(sqlQuery, function (error, result) {
		if (error) throw error
		if (result.length != 0) 
		{
			connection.query(`select syllabusID from Syllabuses where syllabusID = ${id} and status = 1 and userId = ${userId}`, function (error, result) {
				if (error) throw error
				if (result.length != 0) 
				{
					connection.query(`update Syllabuses set status = 0 where syllabusID = ${id}`, function (error, result) {
						if (error) throw error
						response.status(204).send("204 NO CONTENT")
					})
				}
				else 
				{
					response.status(403).send(result)
				}
			})
		}
		else
		{
			response.status(404).send(result)
		}
	})
})

app.get('/api/syllabus/:id', function (request, response) {
	const id = request.params.id;
	const sqlQuery = `select syllabusID from Syllabuses where syllabusID = ${id}`
	connection.query(sqlQuery, function (error, result) {
		if (error) throw error
		if (result.length != 0) 
		{
			connection.query(`select syllabusID from Syllabuses where syllabusID = ${id} and status = 1 and userId = ${userId}`, function (error, result) {
				if (error) throw error
				if (result.length != 0) {
					connection.query(`select syllabusID, title, description, objectives from Syllabuses where syllabusID = ${id}`, function(error, result){
						if (error) throw error
						response.status(200).send(result)
					})
				}
				else {
					response.status(403).json({"detail":"You do not have permission to perform this action."})
				}
			})
		}
		else
		{
			response.status(404).send(result)
		}
	})
})

app.listen(port, function () {
	console.log(`http://localhost:${port}`)
})
