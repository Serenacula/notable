
/* IMPORT */

import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/* CONFIG */

const staticDir = resolve ( 'src/renderer/template/dist' );

const config = defineConfig ({

  main: {
    resolve: {
      alias: {
        '@common': resolve ( 'src/common' ),
        '@main': resolve ( 'src/main' ),
        '@root': resolve ( '.' )
      }
    },
    define: {
      __static: JSON.stringify ( staticDir )
    }
  },

  renderer: {
    root: resolve ( 'src/renderer' ),
    publicDir: resolve ( 'src/renderer/template/dist' ),
    build: {
      rollupOptions: {
        input: {
          index: resolve ( 'src/renderer/index.html' )
        }
      }
    },
    plugins: [
      react ()
    ],
    resolve: {
      alias: {
        '@common': resolve ( 'src/common' ),
        '@renderer': resolve ( 'src/renderer' ),
        '@static': resolve ( 'src/renderer/template/dist' ),
        '@root': resolve ( '.' )
      }
    },
    define: {
      __static: JSON.stringify ( staticDir ),
      // electron-webpack provided __non_webpack_require__ to bypass module transforms;
      // in Vite the normal require() serves the same purpose
      __non_webpack_require__: 'require'
    }
  }

});

/* EXPORT */

export default config;
