const express = require('express');
const mysql = require('mysql');
var emailValidator = require('email-validator');
var passwordValidator = require('password-validator');
const { v4: uuidv4 } = require('uuid');
const app = express();
const port = 8002;

var connection = mysql.createConnection({
	host: '165.22.14.77',
	user: 'b27',
	password: 'b27',
	database: 'Courses'
});

connection.connect(function (error) {
	if (error) throw error;
})

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

function validateTokenMiddeleware(request, response, next) {
	const token = request.headers.authorization;
	if (token == null || token == undefined) 
	{
		response.status(401).send({ "Warning": "Unauthorized user." });
	}
	else 
	{
		request["token"] = token;
		next();
	}
}

function validateUserUsingTokenInDatabase(request, response, next) {
	const sqlQuery = "select userId from Users where token = ?";
	const value = [request.token];
	connection.query(mysql.format(sqlQuery, value), function (error, result) {
		if (error) throw error;
		if (result.length == 0) 
		{
			response.status(401).send({ "Warning": "Unauthorized user." });
		}
		else 
		{
			request["userId"] = result[0]["userId"];
			next();
		}
	})
}

app.post('/api/syllabus/signUp', function (request, response) {
	const userName = request.body.userName;
	const password = request.body.password;
	const signupErrors = {};
	console.log([userName, password]);
	if (userName == undefined || password == undefined) 
	{
		if (userName == undefined) 
		{
			signupErrors["Email/User Name"] = "Please enter user name or email.";
		}
		if (password == undefined) 
		{
			signupErrors["password"] = "Please enter password.";
		}
		response.status(400).send(signupErrors);
	}
	else {
		if (emailValidator.validate(userName)) 
		{
			let schema = new passwordValidator;
			schema
			.is().min(6)
			.is().max(20)
			.has().symbols(1)
			.has().not().spaces()
			if (schema.validate(password)) 
			{
				const token = uuidv4();
				const sqlQuery = "insert into Users values(default, ?, ?, ?)";
				const values = [userName, password, token];
				connection.query(mysql.format(sqlQuery, values), function (error, result) {
					if (error) throw error;
					console.log(result);
					response.status(201).send({ "user id": result["insertId"] });
				});
			}
			else 
			{
				const conditions = `please enter valid password. password should contain aleast six(6) characters, one special character, No white spaces.`;
				signupErrors["password"] = conditions;
				response.status(400).send(signupErrors);
			}
		}
		else 
		{
			signupErrors["Email/user Name"] = "Please enter valid Email";
			response.status(400).send(signupErrors);
		}
	}
});

app.post('/api/syllabus/signIn', function (request, response) {
	const userName = request.body.userName;
	const password = request.body.password;
	const signInErrors = {};
	console.log([userName, password]);
	if (userName == undefined || password == undefined) 
	{
		if (userName == undefined) 
		{
			signInErrors["Email/User Name"] = "Please enter user name or email.";
		}
		if (password == undefined) 
		{
			signInErrors["password"] = "Please enter password.";
		}
		response.status(400).send(signInErrors);
	}
	else 
	{
		const searchQuery = "select userId from Users where userName = ?";
		connection.query(mysql.format(searchQuery, userName), function (error, result) {
			if (error) throw error;
			if (result.length != 0) 
			{
				const sqlQuery = "select token from Users where userName = ? and password = ?";
				const values = [userName, password];
				connection.query(mysql.format(sqlQuery, values), function (error, result) {
					if (error) throw error;
					if (result.length == 0) 
					{
						response.status(404).send({ "warning": "Invalid Password" });
						
					}
					else 
					{
						response.status(200).send(result);
					}
				})
			}
			else 
			{
				response.status(404).send({ "warning": "Invalid E-Mail/Password" });
			}
		})
	}
})

app.use(validateTokenMiddeleware);
app.use(validateUserUsingTokenInDatabase);

app.get('/api/syllabus/', function (request, response) {
	const selectQuery = `select syllabusID, title, description, objectives from Syllabuses where userId = ? and status = 1`;
	const values = [request.userId];
	console.log(values);
	connection.query(mysql.format(selectQuery, values), function (error, result) {
		if (error) throw error
		if (result.length != 0) 
		{
			response.status(200).send(result)
		}
		else 
		{
			response.status(200).send({ "Warning": "No data found." });
		}
	})
})

app.post("/api/syllabus/", function (request, response) {
	const errorResponse = {};
	const userId = request.userId;
	const values = [request.body.title, request.body.description, request.body.objectives, userId];
	console.log(values);
	if(values[0] == undefined || values[1] == undefined || values[2] == undefined)
	{
		if(values[0] == undefined)
		{
			errorResponse["title"] = "Please enter title.";
		}
		if(values[1] == undefined)
		{
			errorResponse["description"] = "Please enter description.";
		}
		if(values[2] == undefined)
		{
			errorResponse["objectives"] = "Please enter objectives.";
		}
		response.status(400).send(errorResponse);
	}
	else
	{
		const sqlQuery = `insert into Syllabuses(title, description, objectives, status, userId) values(?, ?, ?, 1, ?)`;
		connection.query(mysql.format(sqlQuery, values), function (error, result) {
			if (error) throw error;
			response.status(201);
			connection.query(`select syllabusID, title, description, objectives from Syllabuses where syllabusID = ${result["insertId"]}`, function (error, result) {
				if (error) throw error;
				response.json(result);
			});
		});
	}
});

app.put('/api/syllabus/:id', function (request, response) {
	const userId = request.userId;
	const syllabusId = request.params.id;
	const values = [request.body.title, request.body.description, request.body.objectives, syllabusId];
	searchSyllabusItem(userId, syllabusId, response, function(){
		const sqlQuery = `update Syllabuses set title = ?, description = ?, objectives = ? where syllabusID = ?`;
		connection.query(mysql.format(sqlQuery, values), function (error, result) {
			if (error) throw error;
			if(result["affectedRows"] != 0)
			{
				response.status(200);
				const selectQuery = `select syllabusID, title, description, objectives from Syllabuses where syllabusID = ?`;
				connection.query(mysql.format(selectQuery, syllabusId), function(error, result){
					if(error) throw error;
					response.send(result);
				});
			}
			else
			{
				response.status(500).send({"Warning": "Internal server error."});
			}
		});
	})
});

app.delete("/api/syllabus/:id", function (request, response) {
	const userId = request.userId;
	const syllabusId = request.params.id;
	searchSyllabusItem(userId, syllabusId, response, function(){
		const updateQuery = `update Syllabuses set status = 0 where syllabusID = ?`;
		connection.query(mysql.format(updateQuery, syllabusId), function (error, result) {
			if (error) throw error
			if(result["affectedRows"] != 0)
			{
				response.status(200).send({"Message": "Updated successfully"});
			}
			else
			{
				response.status(500).send({"warning": "Internal server error."});
			}
		});
	});
})

app.get('/api/syllabus/:id', function (request, response) {
	const userId = request.userId;
	const syllabusId = request.params.id;
	searchSyllabusItem(userId, syllabusId, response, function () {
		const selectQuery = `select syllabusID, title, description, objectives from Syllabuses where syllabusID = ?`;
		connection.query(mysql.format(selectQuery, syllabusId), function (error, result) {
			if (error) throw error
			if (result.length != 0) 
			{
				response.status(200).send(result);
			}
		});
	});
})

function searchSyllabusItem(userId, syllabusId, response, callback) {
	const searchQuery = "select syllabusID from Syllabuses where syllabusID = ? and status = 1 and userId = ?";
	connection.query(mysql.format(searchQuery, [syllabusId, userId]), function (error, result) {
		if (error) throw error;
		if (result.length != 0) 
		{
			callback();
		}
		else
		{
			response.status(404).send({ "Warning": "Syllabus not found." })
		}
	})
}

app.listen(port, function () {
console.log(`App listening http://localhost:${port}`)
})
