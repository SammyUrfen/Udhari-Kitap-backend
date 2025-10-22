const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

app.use('/api', routes);

app.get('/', (req, res) => res.json({ status: 'ok', name: 'Udhari-Kitap Backend' }));

app.use(errorHandler);

module.exports = app;
