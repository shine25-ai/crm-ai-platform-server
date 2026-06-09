const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'CRM AI API',
            version: '1.0.0',
            description: 'CRM + Employee Operations API'
        },

        servers: [
            {
                url: 'http://localhost:5000/api'
            }
        ],

        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        },

        security: [
            {
                bearerAuth: []
            }
        ]
    },

    apis: ['./src/modules/**/*.routes.js']
};

const specs = swaggerJsdoc(options);

module.exports = {
    swaggerUi,
    specs
};
