import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from '../config/openapi.js';

const router = Router();

router.get('/openapi.json', (_req, res) => {
  res.json(openApiDocument);
});

router.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    customSiteTitle: 'EstateOS API Docs',
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
    },
  }),
);

export default router;
