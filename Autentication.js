const express = require('express');
const mysql = require('mysql');
var emailValidator = require('email-validator');
var passwordValidator = require('password-validator');
const { v4: uuidv4 } = require('uuid')
const app = express();
const port = 8001;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

var connection = mysql.createConnection({
    host: '165.22.14.77',
    user: 'b27',
    password: 'b27',
    database: 'Courses'
});

connection.connect(function (error) 
{
    if (error) throw error;
})

app.post('/api/syllabus/signUp',function(request, response)
{
    const userName = request.body.userName;
    const password = request.body.password;
    const signupErrors = {};
    console.log([userName, password]);
    if(userName == undefined || password == undefined)
    {
        response.status(400);
        if(userName == undefined)
        {
            signupErrors["Email/User Name"] = "Please enter user name or email.";
        }
        if (password == undefined) 
        {
            signupErrors["password"] = "Please enter password.";    
        }
        response.send(signupErrors);
    }
    else
    {
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
                connection.query(mysql.format(sqlQuery, values), function(error, result)
                {
                    if(error) throw error;
                    console.log(result);
                    response.status(201).send("Your user id is "+ result["insertId"]);
                });
            }
            else 
            {
                response.status(400);
                const conditions = `please enter valid password. password should contain aleast six(6) characters, one special character, No white spaces.`;
                signupErrors["password"] = conditions;
                response.send(signupErrors);
            }
        }
        else 
        {
            response.status(400);
            signupErrors["Email/user Name"] = "Please enter valid Email";
            response.send(signupErrors);
        }
    }
});
 
app.post('/api/syllabus/signIn', function(request, response){
    const userName = request.body.userName;
    const password = request.body.password;
    const signInErrors = {};
    console.log([userName, password]);
    if (userName == undefined || password == undefined) {
        response.status(400);
        if (userName == undefined) {
            signInErrors["Email/User Name"] = "Please enter user name or email.";
        }
        if (password == undefined) {
            signInErrors["password"] = "Please enter password.";
        }
        response.send(signInErrors);
    }
    else
    {
        const sqlQuery = "select userId, token from Users where userName = ? and password = ?";
        const values = [userName, password];
        connection.query(mysql.format(sqlQuery, values), function(error, result){
            if(error) throw error;
            if(result.length == 0)
            {
                response.status(404);
            }
            else
            {
                response.status(200);
                response.send(result);
            }
        })
    }
})

app.listen(port);