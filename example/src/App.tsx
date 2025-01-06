import { Component, Match, Switch } from 'solid-js'

import logo from './logo.svg';
import styles from './App.module.css';
import {useAuth} from '../../src';


const App: Component = () => {
  const { state,userManager,removeUser } = useAuth()

  return (
    <Switch fallback={<button onClick={() => void userManager()!.signinRedirect()}>Log in</button>}>
      <Match when={state()?.isLoading}>
        <div>Loading...</div>
      </Match>
      <Match when={state()?.error}>
        <div>Oops... {state()?.error!.message}</div>
      </Match>
      <Match when={state()?.isAuthenticated}>
        <div class={styles.App}>
          <header class={styles.header}>
            <img src={logo} class={styles.logo} alt="logo" />
            <p>
              Edit <code>src/App.tsx</code> and save to reload.
            </p>
            <div>
              Hello {state()?.user?.profile.preferred_username}{' '}

              <button onClick={() => void removeUser()}>Log out</button>
            </div>
          </header>
        </div>
      </Match>
    </Switch>
  )
};

export default App;
