import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import PortfolioScreen from '../screens/PortfolioScreen';
import PredictionsScreen from '../screens/PredictionsScreen';
import ChatScreen from '../screens/ChatScreen';
import AlertsScreen from '../screens/AlertsScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HoldingDetailsScreen from '../screens/HoldingDetailsScreen';
import TraderDetailsScreen from '../screens/TraderDetailsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function DashboardStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#6200ee',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="DashboardHome"
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
    </Stack.Navigator>
  );
}

function PortfolioStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#6200ee',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="PortfolioHome"
        component={PortfolioScreen}
        options={{ title: 'Portfolio' }}
      />
      <Stack.Screen
        name="HoldingDetails"
        component={HoldingDetailsScreen}
        options={({ route }: any) => ({
          title: route.params?.symbol || 'Holding Details',
        })}
      />
    </Stack.Navigator>
  );
}

function PredictionsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#6200ee',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="PredictionsHome"
        component={PredictionsScreen}
        options={{ title: 'Predictions' }}
      />
    </Stack.Navigator>
  );
}

function ChatStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#6200ee',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="ChatHome"
        component={ChatScreen}
        options={{ title: 'AI Assistant' }}
      />
    </Stack.Navigator>
  );
}

function AlertsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#6200ee',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="AlertsHome"
        component={AlertsScreen}
        options={{ title: 'Alerts' }}
      />
    </Stack.Navigator>
  );
}

function LeaderboardStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#6200ee',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="LeaderboardHome"
        component={LeaderboardScreen}
        options={{ title: 'Leaderboard' }}
      />
      <Stack.Screen
        name="TraderDetails"
        component={TraderDetailsScreen}
        options={({ route }: any) => ({
          title: route.params?.traderName || 'Trader Profile',
        })}
      />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#6200ee',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="SettingsHome"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'home';

          if (route.name === 'DashboardStack') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'PortfolioStack') {
            iconName = focused ? 'briefcase' : 'briefcase-outline';
          } else if (route.name === 'PredictionsStack') {
            iconName = focused ? 'trending-up' : 'trending-up';
          } else if (route.name === 'ChatStack') {
            iconName = focused ? 'chat' : 'chat-outline';
          } else if (route.name === 'AlertsStack') {
            iconName = focused ? 'bell' : 'bell-outline';
          } else if (route.name === 'LeaderboardStack') {
            iconName = focused ? 'podium' : 'podium-outline';
          } else if (route.name === 'SettingsStack') {
            iconName = focused ? 'cog' : 'cog-outline';
          }

          return (
            <MaterialCommunityIcons name={iconName} size={size} color={color} />
          );
        },
        tabBarActiveTintColor: '#6200ee',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
      })}
    >
      <Tab.Screen
        name="DashboardStack"
        component={DashboardStack}
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="PortfolioStack"
        component={PortfolioStack}
        options={{ title: 'Portfolio' }}
      />
      <Tab.Screen
        name="PredictionsStack"
        component={PredictionsStack}
        options={{ title: 'Predictions' }}
      />
      <Tab.Screen
        name="ChatStack"
        component={ChatStack}
        options={{ title: 'Chat' }}
      />
      <Tab.Screen
        name="AlertsStack"
        component={AlertsStack}
        options={{ title: 'Alerts' }}
      />
      <Tab.Screen
        name="LeaderboardStack"
        component={LeaderboardStack}
        options={{ title: 'Leaderboard' }}
      />
      <Tab.Screen
        name="SettingsStack"
        component={SettingsStack}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { isLoading, userToken } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return userToken == null ? <AuthStack /> : <AppStack />;
}
