import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { TextInput, Button, Text, Snackbar } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { signUp } = useAuth();

  const validateForm = () => {
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return false;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signUp(email, password, name);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join AssetPulse</Text>
        </View>

        <View style={styles.formContainer}>
          <TextInput
            label="Full Name"
            value={name}
            onChangeText={setName}
            editable={!loading}
            style={styles.input}
            left={<TextInput.Icon icon="account" />}
          />

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

          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            editable={!loading}
            style={styles.input}
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={showConfirmPassword ? 'eye' : 'eye-off'}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
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
            onPress={handleSignUp}
            disabled={loading}
            loading={loading}
            style={styles.signupButton}
            contentStyle={styles.buttonContent}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>

          <View style={styles.loginContainer}>
            <Text>Already have an account? </Text>
            <Button
              mode="text"
              onPress={() => navigation.goBack()}
              disabled={loading}
              compact
            >
              Sign in here
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
    fontSize: 32,
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
  signupButton: {
    marginTop: 24,
    marginBottom: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  loginContainer: {
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
