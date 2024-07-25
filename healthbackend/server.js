const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt'); // To hash passwords
const cors = require('cors'); // Importing cors
const excel = require('exceljs'); // Install exceljs package
const multer = require('multer');
const path = require('path');

const app = express();
const port = 8080;

// Middleware to parse JSON
app.use(express.json());

// Middleware to handle CORS
app.use(cors()); // Use cors middleware

// Create a MySQL connection
const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "1234",
    database: "project",
    multipleStatements: true
});

// Connect to the database
connection.connect(err => {
    if (err) {
        console.error('Error connecting to the database:', err.stack);
        return;
    }
    console.log('Connected to the database.');
});



// Route to handle user registration
app.post('/register', async (req, res) => {
    const { name, email, username, password } = req.body;

    // Check if any fields are empty
    if (!name || !email || !username || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if the email or username already exists
    connection.query('SELECT * FROM user WHERE email = ? OR username = ?', [email, username], async (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database query error' });
        }

        if (results.length > 0) {
            return res.status(409).json({ message: 'Email or Username already exists' });
        }

        // Hash the password before storing it
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the new user into the database
        connection.query('INSERT INTO user (name, email, username, password) VALUES (?, ?, ?, ?)', [name, email, username, hashedPassword], (err, results) => {
            if (err) {
                return res.status(500).json({ message: 'Database insertion error' });
            }
            res.status(201).json({ message: 'User registered successfully' });
        });
    });
});


// Route to handle user login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    // Check if the username exists
    connection.query('SELECT * FROM user WHERE username = ?', [username], async (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database query error' });
        }

        if (results.length === 0) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const user = results[0];

        // Compare the password with the hashed password stored in the database
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        res.status(200).json({ message: 'Login successful', name: user.name });
    });
});


// Route to handle user login
app.post('/adminlogin', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    // Check if the username exists
    connection.query('SELECT * FROM user WHERE username = ?', [username], async (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database query error' });
        }

        if (results.length === 0) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const user = results[0];

        // Compare the password with the hashed password stored in the database
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        res.status(200).json({ message: 'Login successful', name: user.name });
    });
});



app.get('/search', (req, res) => {
    const searchTerm = req.query.q;
    const query = `SELECT * FROM doctor WHERE department like '%${searchTerm}%'` // Adjust the query as needed
    connection.query(query, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }
        res.json(results);
    });
});

// Endpoint to book an appointment
app.post('/appointments', (req, res) => {
    const { id, name, number, gender, hospitalname, date, time, department, drname } = req.body;

    const currentDate = new Date();
    const selectedDate = new Date(date);
    const oneMonthAhead = new Date();
    oneMonthAhead.setMonth(oneMonthAhead.getMonth() + 1);

    if (selectedDate < currentDate) {
        return res.status(400).json({ error: 'Cannot book appointments in the past.' });
    }

    if (selectedDate > oneMonthAhead) {
        return res.status(400).json({ error: 'Cannot book appointments more than one month ahead.' });
    }


    const sql = 'INSERT INTO appointments (id, name, number, gender, hospitalname, date, time, department, drname) VALUES (?, ?, ?, ?, ?, ?, ?,?,?)';
    connection.query(sql, [id, name, number, gender, hospitalname, date, time, department, drname], (err, result) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).send('Appointment booked successfully');
        }
    });
});


//display all appointments data
app.get('/displayAppointments', (re, res) => {
    const sql = "select * from appointments";
    connection.query(sql, (err, data) => {
        if (err) return res.json(err);
        return res.json(data);
    })
})

//display all users data
app.get('/allUsers', (re, res) => {
    const sql = "select * from user";
    connection.query(sql, (err, data) => {
        if (err) return res.json(err);
        return res.json(data);
    })
})

//display all doctors data
app.get('/alldoctors', (re, res) => {
    const sql = "select * from doctor";
    connection.query(sql, (err, data) => {
        if (err) return res.json(err);
        return res.json(data);
    })
})


// add doctors
app.post('/adddoctor', (req, res) => {
    const { id, name, department, experience, gender, hospitalName, profileurl } = req.body;

    const sql = 'INSERT INTO doctor (id, name, department, experience, gender, hospitalName, profileurl) VALUES (?, ?, ?, ?, ?, ?, ?)';
    connection.query(sql, [id, name, department, experience, gender, hospitalName, profileurl], (err, result) => {
        if (err) {
            res.status(500).send(err);
        } else {
            // res.status(200).send('Doctor Add successfully');
            res.status(201).json({ message: 'Doctor Add successfully' });

        }
    });
});

// Update a doctor
app.put('/updatedoctor/:id', (req, res) => {
    const { id } = req.params;
    const { name, department, experience, gender, hospitalname, profileurl } = req.body;
    const sql = 'UPDATE doctor SET name = ?, department = ?, experience = ?, gender = ?, hospitalname = ?, profileurl = ? WHERE id = ?';
    connection.query(sql, [name, department, experience, gender, hospitalname, profileurl, id], (err, result) => {
        if (err) {
            console.error('Error updating doctor:', err);
            res.status(500).send('Server error');
            return;
        }
        res.status(200).json({ message: 'Doctor updated successfully' });
    });
});


// delete doctor with id
app.delete('/deletedoctor/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM doctor WHERE id = ?';

    connection.query(query, [id], (err, result) => {
        if (err) {
            console.error('Error deleting appointment:', err);
            return res.status(500).send('Server error');
        }
        res.send({ message: 'Appointment deleted successfully' });
    });
});

// delete users with id
app.delete('/deleteuser/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM user WHERE id = ?';

    connection.query(query, [id], (err, result) => {
        if (err) {
            console.error('Error deleting appointment:', err);
            return res.status(500).send('Server error');
        }
        res.send({ message: 'Appointment deleted successfully' });
    });
});

// delete appointment with id
app.delete('/appointments/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM appointments WHERE id = ?';

    connection.query(query, [id], (err, result) => {
        if (err) {
            console.error('Error deleting appointment:', err);
            return res.status(500).send('Server error');
        }
        res.send({ message: 'Appointment deleted successfully' });
    });
});

// Endpoint to download appointments in Excel format
app.get('/appointments/download', (req, res) => {
    // Retrieve appointment data from database
    const query = 'SELECT * FROM appointments';

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching appointment data:', err);
            res.status(500).send('Error fetching appointment data');
            return;
        }

        // Create Excel workbook and worksheet
        const workbook = new excel.Workbook();
        const worksheet = workbook.addWorksheet('Appointments');

        // Define Excel worksheet columns
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: "Patient's Name", key: 'name', width: 20 },
            { header: "Patient's Number", key: 'number', width: 20 },
            { header: "Dr Gender", key: 'gender', width: 20 },
            { header: "Hospital Name", key: 'hospitalname', width: 20 },
            { header: 'Doctor', key: 'drname', width: 20 },
            { header: 'Department', key: 'department', width: 20 },
            { header: 'Appointment Date', key: 'date', width: 20 },
            { header: 'Appointment Time', key: 'time', width: 20 },
            { header: 'Created Time', key: 'created_time', width: 20 }
        ];

        // Populate worksheet with appointment data
        results.forEach(appointment => {
            worksheet.addRow(appointment);
        });

        // Set response headers for Excel download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=appointments.xlsx');

        // Send Excel file to client
        return workbook.xlsx.write(res)
            .then(function () {
                res.status(200).end();
            });
    });
});



// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
