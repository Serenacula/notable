
/* IMPORT */

import '@static/css/notable.min.css';
import '@static/javascript/notable.min.js';

import * as React from 'react';
import {render as renderDOM} from 'react-dom';
import {Router} from 'react-router-static';
import {Provider} from 'overstated';
import Routes from './routes';
import ErrorBoundary from './components/error_boundary';

/* RENDER */

function render () {

  renderDOM (
    <Provider>
      <ErrorBoundary>
        <Router routes={Routes} />
      </ErrorBoundary>
    </Provider>,
    document.getElementsByClassName ( 'app' )[0]
  );

}

/* EXPORT */

export default render;
