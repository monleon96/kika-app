import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Link,
  Divider,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import kikaLogo from '@assets/logo_dark_optimized.png';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, register, loginAsGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [staySignedIn, setStaySignedIn] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Check for saved credentials on mount
  useEffect(() => {
    const savedCredentials = localStorage.getItem('kika_saved_credentials');
    if (savedCredentials) {
      try {
        const { email: savedEmail, staySignedIn: savedStaySignedIn } = JSON.parse(savedCredentials);
        if (savedStaySignedIn && savedEmail) {
          setEmail(savedEmail);
          setStaySignedIn(true);
        }
      } catch (e) {
        localStorage.removeItem('kika_saved_credentials');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (isRegisterMode) {
      // Registration mode
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        setLoading(false);
        return;
      }

      const result = await register(email, password);
      if (result.success) {
        setSuccess(result.message);
        setIsRegisterMode(false);
        setPassword('');
        setConfirmPassword('');
      } else {
        setError(result.message);
      }
    } else {
      // Login mode
      const result = await login(email, password);
      if (result.success) {
        // Save email for "stay signed in" functionality
        if (staySignedIn) {
          localStorage.setItem('kika_saved_credentials', JSON.stringify({ email, staySignedIn: true }));
        } else {
          localStorage.removeItem('kika_saved_credentials');
        }
        navigate('/');
      } else {
        setError(result.message);
      }
    }

    setLoading(false);
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setError('');
    setSuccess('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleGuestLogin = () => {
    loginAsGuest();
    navigate('/');
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <Card sx={{ width: '100%', maxWidth: 400 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <img src={kikaLogo} alt="KIKA Logo" style={{ height: 80 }} />
            </Box>
            <Typography variant="subtitle1" gutterBottom align="center" color="text.secondary">
              Nuclear Data Viewer
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
                {success}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                required
                autoFocus
              />
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                required
                helperText={isRegisterMode ? 'Minimum 8 characters' : ''}
              />
              {isRegisterMode && (
                <TextField
                  fullWidth
                  label="Confirm Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  margin="normal"
                  required
                />
              )}
              {!isRegisterMode && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={staySignedIn}
                      onChange={(e) => setStaySignedIn(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Stay signed in"
                  sx={{ mt: 1 }}
                />
              )}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mt: 3 }}
              >
                {loading 
                  ? (isRegisterMode ? 'Creating account...' : 'Signing in...') 
                  : (isRegisterMode ? 'Create Account' : 'Sign In')}
              </Button>

              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="body2" component="span" color="text.secondary">
                  {isRegisterMode ? 'Already have an account? ' : "Don't have an account? "}
                </Typography>
                <Link
                  component="button"
                  type="button"
                  variant="body2"
                  onClick={toggleMode}
                  sx={{ cursor: 'pointer' }}
                >
                  {isRegisterMode ? 'Sign In' : 'Register'}
                </Link>
              </Box>

              <Divider sx={{ my: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  or
                </Typography>
              </Divider>

              <Button
                fullWidth
                variant="outlined"
                size="large"
                onClick={handleGuestLogin}
              >
                🚀 Continue as Guest
              </Button>
            </Box>

            <Typography variant="body2" align="center" sx={{ mt: 3 }} color="text.secondary">
              Guest mode: Full access without account. Data not saved to cloud.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};
