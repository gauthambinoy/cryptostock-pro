import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { TextInput, Button, Text, ActivityIndicator, Snackbar } from 'react-native-paper';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { signIn, signInWithBiometric } = useAuth();

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);
    } catch (error) {
      console.error('Biometric check error:', error);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setLoading(true);
    setError('');

    try {
      await signInWithBiometric();
    } catch (err: any) {
      setError(err.message || 'Biometric authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>AssetPulse</Text>
          <Text style={styles.subtitle}>Smart Investment Analytics</Text>
        </View>

        <View style={styles.formContainer}>
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
            style={styles.input}
            left={<TextInput.Icon icon="email" />}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            editable={!loading}
            style={styles.input}
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye' : 'eye-off'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />

          {error ? (
            <Snackbar
              visible={!!error}
              onDismiss={() => setError('')}
              duration={4000}
              style={styles.errorSnackbar}
            >
              {error}
            </Snackbar>
          ) : null}

          <Button
            mode="contained"
            onPress={handleLogin}
            disabled={loading}
            loading={loading}
            style={styles.loginButton}
            contentStyle={styles.buttonContent}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>

          {biometricAvailable && (
            <Button
              mode="outlined"
              onPress={handleBiometricLogin}
              disabled={loading}
              style={styles.biometricButton}
              icon="fingerprint"
            >
              Biometric Login
            </Button>
          )}

          <View style={styles.signupContainer}>
            <Text>Don't have an account? </Text>
            <Button
              mode="text"
              onPress={() => navigation.navigate('Register')}
              disabled={loading}
              compact
            >
              Sign up here
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#6200ee',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
  },
  formContainer: {
    width: '100%',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#f5f5f5',
  },
  loginButton: {
    marginTop: 24,
    marginBottom: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  biometricButton: {
    marginBottom: 24,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  errorSnackbar: {
    backgroundColor: '#cf6679',
    marginBottom: 16,
  },
});
