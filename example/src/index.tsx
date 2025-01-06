/* @refresh reload */
import { render } from 'solid-js/web';

import './index.css';
import App from './App';
import {AuthProvider} from '../../src';


const oidcConfig = {
  authority: "http://localhost:8088/auth/v1",
  client_id: "example2",
  redirect_uri:  `${window.location.origin}${window.location.pathname}`,

};
const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
  );
}

render(() => (
  <AuthProvider {...oidcConfig}>
  <App/>
  </AuthProvider>
), root!);
