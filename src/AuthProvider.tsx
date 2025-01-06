import { UserManagerSettings, User, SignoutResponse } from 'oidc-client-ts'
import { UserManager } from 'oidc-client-ts'
import { initialAuthState } from './AuthState'
import { hasAuthParams, signinError, signoutError } from './utils'
import type { AuthState } from './AuthState'
import {
  Accessor,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  JSX,
  onCleanup,
  onMount,
  splitProps,
} from 'solid-js'
import { createReducer } from '@solid-primitives/reducer'
import { reducer } from './reducer'

/**
 * @public
 */
export interface AuthContextProps {
  /**
   * UserManager functions. See [UserManager](https://github.com/authts/oidc-client-ts) for more details.
   */
  state: Accessor<AuthState | undefined>
  userManager: Accessor<UserManager | undefined>

  removeUser(): Promise<void>
}

/**
 * @public
 */
export const AuthContext = createContext<AuthContextProps>({
  state: () => undefined,
  userManager: () => undefined,
  removeUser: async () => {},
})

/**
 * @public
 */
export interface AuthProviderBaseProps {
  /**
   * The child nodes your Provider has wrapped
   */
  children?: JSX.Element

  /**
   * On sign in callback hook. Can be a async function.
   * Here you can remove the code and state parameters from the url when you are redirected from the authorize page.
   *
   * ```jsx
   * const onSigninCallback = (_user: User | undefined): void => {
   *     window.history.replaceState(
   *         {},
   *         document.title,
   *         window.location.pathname
   *     )
   * }
   * ```
   */
  onSigninCallback?: (user: User | undefined) => Promise<void> | void

  /**
   * By default, if the page url has code/state params, this provider will call automatically the `userManager.signinCallback`.
   * In some cases the code might be for something else (another OAuth SDK perhaps). In these
   * instances you can instruct the client to ignore them.
   *
   * ```jsx
   * <AuthProvider
   *   skipSigninCallback={window.location.pathname === "/stripe-oauth-callback"}
   * >
   * ```
   */
  skipSigninCallback?: boolean

  /**
   * Match the redirect uri used for logout (e.g. `post_logout_redirect_uri`)
   * This provider will then call automatically the `userManager.signoutCallback`.
   *
   * HINT:
   * Do not call `userManager.signoutRedirect()` within a `React.useEffect`, otherwise the
   * logout might be unsuccessful.
   *
   * ```jsx
   * <AuthProvider
   *   matchSignoutCallback={(args) => {
   *     window &&
   *     (window.location.href === args.post_logout_redirect_uri);
   *   }}
   * ```
   */
  matchSignoutCallback?: (args: UserManagerSettings) => boolean

  /**
   * On sign out callback hook. Can be a async function.
   * Here you can change the url after the user is signed out.
   * When using this, specifying `matchSignoutCallback` is required.
   *
   * ```jsx
   * const onSignoutCallback = (resp: SignoutResponse | undefined): void => {
   *     // go to home after logout
   *     window.location.pathname = ""
   * }
   * ```
   */
  onSignoutCallback?: (resp: SignoutResponse | undefined) => Promise<void> | void

  /**
   * On remove user hook. Can be a async function.
   * Here you can change the url after the user is removed.
   *
   * ```jsx
   * const onRemoveUser = (): void => {
   *     // go to home after logout
   *     window.location.pathname = ""
   * }
   * ```
   */
  onRemoveUser?: () => Promise<void> | void
}

/**
 * This interface (default) is used to pass `UserManagerSettings` together with `AuthProvider` properties to the provider.
 *
 * @public
 */
export interface AuthProviderNoUserManagerProps extends AuthProviderBaseProps, UserManagerSettings {
  /**
   * Prevent this property.
   */
  userManager?: never
}

/**
 * This interface is used to pass directly a `UserManager` instance together with `AuthProvider` properties to the provider.
 *
 * @public
 */
export interface AuthProviderUserManagerProps extends AuthProviderBaseProps {
  /**
   * Allow passing a custom UserManager instance.
   */
  userManager?: UserManager
}

/**
 * @public
 */

const unsupportedEnvironment = (fnName: string) => () => {
  throw new Error(
    `UserManager#${fnName} was called from an unsupported context. If this is a server-rendered page, defer this call with useEffect() or pass a custom UserManager implementation.`,
  )
}
const UserManagerImpl = typeof window === 'undefined' ? null : UserManager

/**
 * @public
 */
export interface AuthProviderBaseProps {
  /**
   * The child nodes your Provider has wrapped
   */
  children?: JSX.Element

  /**
   * On sign in callback hook. Can be a async function.
   * Here you can remove the code and state parameters from the url when you are redirected from the authorize page.
   */
  onSigninCallback?: (user: User | undefined) => Promise<void> | void

  /**
   * By default, if the page url has code/state params, this provider will call automatically the `userManager.signinCallback`.
   * In some cases the code might be for something else (another OAuth SDK perhaps). In these
   * instances you can instruct the client to ignore them.
   */
  skipSigninCallback?: boolean

  /**
   * Match the redirect uri used for logout (e.g. `post_logout_redirect_uri`)
   * This provider will then call automatically the `userManager.signoutCallback`.
   */
  matchSignoutCallback?: (args: UserManagerSettings) => boolean

  /**
   * On sign out callback hook. Can be a async function.
   * Here you can change the url after the user is signed out.
   * When using this, specifying `matchSignoutCallback` is required.
   */
  onSignoutCallback?: (resp: SignoutResponse | undefined) => Promise<void> | void

  /**
   * On remove user hook. Can be a async function.
   * Here you can change the url after the user is removed.
   */
  onRemoveUser?: () => Promise<void> | void
}

/**
 * This interface (default) is used to pass `UserManagerSettings` together with `AuthProvider` properties to the provider.
 *
 * @public
 */
export interface AuthProviderNoUserManagerProps extends AuthProviderBaseProps, UserManagerSettings {
  /**
   * Prevent this property.
   */
  userManager?: never
}

/**
 * This interface is used to pass directly a `UserManager` instance together with `AuthProvider` properties to the provider.
 *
 * @public
 */
export interface AuthProviderUserManagerProps extends AuthProviderBaseProps {
  /**
   * Allow passing a custom UserManager instance.
   */
  userManager?: UserManager
}

/**
 * @public
 */
export type AuthProviderProps = AuthProviderNoUserManagerProps | AuthProviderUserManagerProps

/**
 * Provides the AuthContext to its child components.
 *
 * @public
 */
export const AuthProvider = (props: AuthProviderProps) => {
  const [userManager, setUserManager] = createSignal<UserManager>()
  const [state, dispatch] = createReducer(reducer, initialAuthState)
  const [didInitialize, setDidInitialize] = createSignal(false) // 修正这里
  const [localProps, userManagerSettings] = splitProps(props, [
    'children',
    'onSigninCallback',
    'skipSigninCallback',
    'matchSignoutCallback',
    'onSignoutCallback',
    'onRemoveUser',
    'userManager',
  ])

  const getProps = createMemo(() => ({
    children: localProps.children,
    onSigninCallback: localProps.onSigninCallback,
    skipSigninCallback: localProps.skipSigninCallback,
    matchSignoutCallback: localProps.matchSignoutCallback,
    onSignoutCallback: localProps.onSignoutCallback,
    onRemoveUser: localProps.onRemoveUser,
    userManager: localProps.userManager ?? null,
    userManagerSettings: userManagerSettings,
  }))

  onMount(() => {
    const { userManager: userManagerProp, userManagerSettings } = getProps()
    const userManagerInstance =
      userManagerProp ??
      (UserManagerImpl
        ? new UserManagerImpl(userManagerSettings as UserManagerSettings)
        : ({ settings: userManagerSettings } as UserManager))
    setUserManager(userManagerInstance)
  })


  createEffect(() => {
    if (!userManager() || didInitialize()) {
      return
    }
    setDidInitialize(true) // 使用正确的 setter(true);
    ;(async () => {
      try {
        let user: User | undefined | null = null
        const onSigninCallback = getProps().onSigninCallback
        if (hasAuthParams() && !getProps().skipSigninCallback) {
          user = await userManager()!.signinCallback()
          onSigninCallback && (await onSigninCallback(user))
        }
        user = !user ? await userManager()!.getUser() : user
        dispatch({ type: 'INITIALISED', user })
      } catch (error) {
        dispatch({ type: 'ERROR', error: signinError(error) })
      }

      try {
        const matchSignoutCallback = getProps().matchSignoutCallback
        const onSignoutCallback = getProps().onSignoutCallback
        if (matchSignoutCallback && matchSignoutCallback(userManager()!.settings)) {
          const resp = await userManager()!.signoutCallback()
          onSignoutCallback && (await onSignoutCallback(resp))
        }
      } catch (error) {
        dispatch({ type: 'ERROR', error: signoutError(error) })
      }
    })()
  })

  createEffect(() => {
    if (!userManager()) return

    const handleUserLoaded = (user: User) => {
      dispatch({ type: 'USER_LOADED', user })
    }
    userManager()!.events.addUserLoaded(handleUserLoaded)

    const handleUserUnloaded = () => {
      dispatch({ type: 'USER_UNLOADED' })
    }
    userManager()!.events.addUserUnloaded(handleUserUnloaded)

    const handleUserSignedOut = () => {
      dispatch({ type: 'USER_SIGNED_OUT' })
    }
    userManager()!.events.addUserSignedOut(handleUserSignedOut)

    const handleSilentRenewError = (error: Error) => {
      dispatch({ type: 'ERROR', error })
    }
    userManager()!.events.addSilentRenewError(handleSilentRenewError)

    onCleanup(() => {
      userManager()!.events.removeUserLoaded(handleUserLoaded)
      userManager()!.events.removeUserUnloaded(handleUserUnloaded)
      userManager()!.events.removeUserSignedOut(handleUserSignedOut)
      userManager()!.events.removeSilentRenewError(handleSilentRenewError)
    })
  })

  const removeUser = async () => {
    const onRemoveUser = getProps().onRemoveUser
    if (!userManager()) unsupportedEnvironment('removeUser')
    await userManager()!.removeUser()
    onRemoveUser && (await onRemoveUser())
  }

  const contextValue = {
    state,
    userManager,
    removeUser,
  }

  return <AuthContext.Provider value={contextValue}>{localProps.children}</AuthContext.Provider>
}
