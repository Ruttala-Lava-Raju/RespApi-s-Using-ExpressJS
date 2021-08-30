const express = require('express');
const mysql = require('mysql2');
var emailValidator = require('email-validator');
var passwordValidator = require('password-validator');
const { v4: uuidv4 } = require('uuid');
const app = express();
const port = 8002;

var connection = mysql.createConnection({
	host: process.env.HOST_NAME,
	user: process.env.USER_NAME,
	password: process.env.PASSWORD,
	database: process.env.DATABASE_NAME
});

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

let validateTokenMiddeleware = (request, response, next) => {
	const token = request.headers.authorization;
	const path = request.path;
	const excludingPathsForAuthentication = {"signIn": "/api/syllabus/signIn", "signUp": "/api/syllabus/signUp"};
	if(path == excludingPathsForAuthentication.signIn || path == excludingPathsForAuthentication.signUp)
	{
		next();
	}
	else
	{
		if (token == null || token == undefined) 
		{
			response.status(401).send({ "Message": "Unauthorized user." });
		}
		else 
		{
			request["token"] = token;
			next();
		}
	}
}

let  validateUserUsingTokenInDatabase = (request, response, next) => {
	const sqlQuery = "select userId from Users where token = ?";
	const value = [request.token];
	if(value[0] == undefined)
	{
		next();
	}
	else
	{
		connection.promise().execute(sqlQuery, value)
		.then((rows) => {
			const result = rows[0];
			if (result.length == 0) 
			{
				response.status(401).send({ "Message": "Unauthorized user." });
			}
			else 
			{
				request["userId"] = result[0]["userId"];
				next();
			}
		})
		.catch((error) => {
			console.log(error);
			response.status(500).send({"Message": "Internal server error."});
		})
	}
}

app.use(validateTokenMiddeleware);
app.use(validateUserUsingTokenInDatabase);

app.post('/api/syllabus/signUp', (request, response) => {
	const userName = request.body.userName;
	const password = request.body.password;
	const signupErrors = {};
	ValidateuserCredentials(userName, password, response, () => {
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
				connection.promise().execute(sqlQuery, values)
				.then((rows) => {
					const result = rows[0];
					const userId = result.insertId;
					response.status(201).send({ "user id": userId });
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
	})
});

app.post('/api/syllabus/signIn', (request, response) => {
	const userName = request.body.userName;
	const password = request.body.password;
	ValidateuserCredentials(userName, password, response, () => {
		const searchQuery = "select userId from Users where userName = ?";
		connection.promise().execute(searchQuery, [userName])
		.then((rows) => {
			const result = rows[0];
			if (result.length != 0) 
			{
				const sqlQuery = "select token from Users where userName = ? and password = ?";
				const values = [userName, password];
				connection.promise().execute(sqlQuery, values)
				.then((rows) => {
					const result = rows[0];
					if (result.length == 0) 
					{
						response.status(404).send({ "warning": "Invalid Password" });
					}
					else 
					{
						response.status(200).send(result);
					}
				});
			}
			else 
			{
				response.status(404).send({ "warning": "No user found." });
			}
		})
		.catch((error) => {
			console.log(error);
			response.status(500).send({"Message": "Internal server error."});
		})
	})
})

app.get('/api/syllabus/', (request, response) => {
	const selectQuery = `select syllabusID, title, description, objectives from Syllabuses where userId = ? and status = 1`;
	const values = [request.userId];
	connection.promise().execute(selectQuery, values)
	.then((rows) => {
		const result = rows[0];
		if (result.length != 0) 
		{
			response.status(200).send(result)
		}
		else 
		{
			response.status(200).send({ "Message": "No data found." });
		}
	})
	.catch((error) => {
		console.log(error);
		response.status(500).send({"Message": "Internal server error."})	
	})
})

app.post("/api/syllabus/", (request, response) => {
	const errorResponse = {};
	const userId = request.userId;
	const values = [request.body.title, request.body.description, request.body.objectives, userId];
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
		connection.promise().execute(sqlQuery, values)
		.then((rows) => {
			result = rows[0];
			response.status(201);
			connection.promise().query(`select syllabusID, title, description, objectives from Syllabuses where syllabusID = ${result["insertId"]}`)
			.then((rows) => {
				const result = rows[0];
				response.json(result);
			});
		})
		.catch((error) => {
			console.log(error);
			response.status(500).send({"Message": "Internal server error."})
		})
	}
});

app.put('/api/syllabus/:id', (request, response) => {
	const userId = request.userId;
	const syllabusId = request.params.id;
	const values = [request.body.title, request.body.description, request.body.objectives, syllabusId];
	searchSyllabusItem(userId, syllabusId, response, () => {
		const sqlQuery = `update Syllabuses set title = ?, description = ?, objectives = ? where syllabusID = ?`;
		connection.promise().execute(sqlQuery, values)
		.then((rows) => {
			const result = rows[0];
			const affectedRows = result["affectedRows"];
			if(affectedRows != 0)
			{
				response.status(200);
				const selectQuery = `select syllabusID, title, description, objectives from Syllabuses where syllabusID = ?`;
				connection.promise().execute(selectQuery, [syllabusId])
				.then((rows) => {
					const result = rows[0];
					response.send(result);
				});
			}
		})
		.catch((error) => {
			console.log(error);
			response.status(500).send({"message": "Internal server error."});
		})
	})
});

app.delete("/api/syllabus/:id", (request, response) => {
	const userId = request.userId;
	const syllabusId = request.params.id;
	searchSyllabusItem(userId, syllabusId, response, () => {
		const updateQuery = `update Syllabuses set status = 0 where syllabusID = ?`;
		connection.promise().execute(updateQuery, [syllabusId])
		.then((rows) => {
			const result = rows[0];
			const affectedRows = result["affectedRows"];
			if(affectedRows != 0)
			{
				response.status(200).send({"Message": "Deleted successfully"});
			}
		})
		.catch((error) => {
			console.log(error);
			response.status(500).send({"Message": "Internal server error."});
		})
	});
})

app.get('/api/syllabus/:id', (request, response) => {
	const userId = request.userId;
	const syllabusId = request.params.id;
	searchSyllabusItem(userId, syllabusId, response, () => {
		const selectQuery = `select syllabusID, title, description, objectives from Syllabuses where syllabusID = ?`;
		connection.promise().execute(selectQuery, [syllabusId])
		.then((rows) => {
			const result = rows[0];
			if (result.length != 0) 
			{
				response.status(200).send(result);
			}
		})
		.catch((error) => {
			console.log(error);
			response.status(500).send({"message": "Internal server error."});
		})
	});
})

let searchSyllabusItem = (userId, syllabusId, response, callback) => {
	const searchQuery = "select userId from Syllabuses where syllabusID = ? and status = 1";
	connection.promise().execute(searchQuery, [syllabusId])
	.then((rows) => {
		const result = rows[0];
		if (result.length != 0) 
		{
			const resultUserId = result[0]["userId"];
			if(resultUserId != userId)
			{
				response.status(403).send({"Message": "You have no access."});
			}
			else
			{
				callback();
			}
		}
		else
		{
			response.status(404).send({ "Message": "Syllabus not found." })
		}
	})
	.catch((error) => {
		console.log(error);
		response.status(500).send({"Message": "Internal server error."})
	})
}

let ValidateuserCredentials = (userName, password, response, callback) =>
{
	let validationErrors = {};
	if (userName == undefined || password == undefined) 
	{
		if (userName == undefined) 
		{
			validationErrors["Email/User Name"] = "Please enter user name or email.";
		}
		if (password == undefined) 
		{
			validationErrors["password"] = "Please enter password.";
		}
		response.status(400).send(validationErrors);
	}
	else
	{
		callback();
	}	
}
app.listen(port, () => {
console.log(`App listening http://localhost:${port}`)
})
