import { AuthContext, type AuthContextProps } from "./AuthProvider";
import { useContext } from 'solid-js'

/**
 * @public
 */
export const useAuth = (): AuthContextProps => {
  const context = useContext(AuthContext);

  if (!context) {
    console.warn("AuthProvider context is undefined, please verify you are calling useAuth() as child of a <AuthProvider> component.");
  }

  return context as AuthContextProps;
};
