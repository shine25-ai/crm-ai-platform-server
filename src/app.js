const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { swaggerUi, swaggerSpec } = require('./config/swagger');
const errorMiddleware = require('./shared/middleware/error.middleware');

const authRoutes = require('./modules/auth/auth.routes');

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'CRM AI API Running'
    });
});

app.use(errorMiddleware);

module.exports = app;
