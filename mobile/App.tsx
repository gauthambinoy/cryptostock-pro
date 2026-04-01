import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { AuthContext } from './src/context/AuthContext';
import { ThemeContext } from './src/context/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { lightTheme, darkTheme } from './src/utils/themes';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync({
          'MaterialCommunityIcons': require('react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf'),
        });
        setFontsLoaded(true);
      } catch (e) {
        console.warn(e);
      } finally {
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={theme}>
        <ThemeContext.Provider value={{ isDarkMode, setIsDarkMode }}>
          <AuthContext.Provider>
            <NavigationContainer theme={theme}>
              <RootNavigator />
            </NavigationContainer>
          </AuthContext.Provider>
        </ThemeContext.Provider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
