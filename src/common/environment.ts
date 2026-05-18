
/* ENVIRONMENT */

const Environment = {
  environment: process.env.NODE_ENV,
  isDevelopment: ( process.env.NODE_ENV !== 'production' ),
  rendererUrl: process.env.ELECTRON_RENDERER_URL || null
};

/* EXPORT */

export default Environment;
