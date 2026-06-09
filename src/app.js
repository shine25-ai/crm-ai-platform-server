const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { swaggerUi, specs } = require('./config/swagger');

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(specs)
);

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'CRM AI API Running'
    });
});

module.exports = app;