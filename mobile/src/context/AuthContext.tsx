import React, { createContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { authService } from '../services/AuthService';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isSignout: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithBiometric: () => Promise<void>;
  restoreToken: () => Promise<void>;
}

const defaultContext: AuthContextType = {
  user: null,
  isLoading: true,
  isSignout: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  signInWithBiometric: async () => {},
  restoreToken: async () => {},
};

export const AuthContext = createContext<AuthContextType>(defaultContext);

export function AuthContextProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(
    (prevState: any, action: any) => {
      switch (action.type) {
        case 'RESTORE_TOKEN':
          return {
            ...prevState,
            userToken: action.payload,
            isLoading: false,
          };
        case 'SIGN_IN':
          return {
            ...prevState,
            isSignout: false,
            userToken: action.payload.token,
            user: action.payload.user,
          };
        case 'SIGN_UP':
          return {
            ...prevState,
            isSignout: false,
            userToken: action.payload.token,
            user: action.payload.user,
          };
        case 'SIGN_OUT':
          return {
            ...prevState,
            isSignout: true,
            userToken: null,
            user: null,
          };
        case 'SET_USER':
          return {
            ...prevState,
            user: action.payload,
          };
      }
    },
    {
      isLoading: true,
      isSignout: false,
      userToken: null,
      user: null,
    }
  );

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        if (token) {
          dispatch({ type: 'RESTORE_TOKEN', payload: token });
          const user = await authService.getCurrentUser(token);
          dispatch({ type: 'SET_USER', payload: user });
        }
      } catch (e) {
        console.error('Restore token failed:', e);
      }
      dispatch({ type: 'RESTORE_TOKEN', payload: null });
    };

    bootstrapAsync();
  }, []);

  const authContext: AuthContextType = {
    user: state.user,
    isLoading: state.isLoading,
    isSignout: state.isSignout,
    signIn: useCallback(async (email: string, password: string) => {
      try {
        const { token, user } = await authService.login(email, password);
        await SecureStore.setItemAsync('userToken', token);
        dispatch({ type: 'SIGN_IN', payload: { token, user } });
      } catch (e) {
        throw e;
      }
    }, []),
    signUp: useCallback(async (email: string, password: string, name: string) => {
      try {
        const { token, user } = await authService.register(email, password, name);
        await SecureStore.setItemAsync('userToken', token);
        dispatch({ type: 'SIGN_UP', payload: { token, user } });
      } catch (e) {
        throw e;
      }
    }, []),
    signOut: useCallback(async () => {
      try {
        await SecureStore.deleteItemAsync('userToken');
        await AsyncStorage.removeItem('cachedData');
        dispatch({ type: 'SIGN_OUT' });
      } catch (e) {
        console.error('Sign out failed:', e);
      }
    }, []),
    signInWithBiometric: useCallback(async () => {
      try {
        const result = await authService.biometricAuth();
        if (result.token && result.user) {
          await SecureStore.setItemAsync('userToken', result.token);
          dispatch({ type: 'SIGN_IN', payload: result });
        }
      } catch (e) {
        throw e;
      }
    }, []),
    restoreToken: useCallback(async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        if (token) {
          const user = await authService.getCurrentUser(token);
          dispatch({ type: 'SET_USER', payload: user });
        }
      } catch (e) {
        console.error('Restore token failed:', e);
      }
    }, []),
  };

  return (
    <AuthContext.Provider value={authContext}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthContextProvider');
  }
  return context;
}
