
/* IMPORT */

import '@static/css/notable.min.css';
import '@static/javascript/notable.min.js';

import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {Router} from 'react-router-static';
import {Provider} from 'overstated';
import Routes from './routes';
import ErrorBoundary from './components/error_boundary';

/* RENDER */

function render () {

  const container = document.getElementsByClassName ( 'app' )[0];

  createRoot ( container ).render (
    <Provider>
      <ErrorBoundary>
        <Router routes={Routes} />
      </ErrorBoundary>
    </Provider>
  );

}

/* EXPORT */

export default render;
