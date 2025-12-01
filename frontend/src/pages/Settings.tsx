import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Chip,
} from '@mui/material';
import {
  Person,
  Lock,
  DeleteForever,
  Email,
  VerifiedUser,
  CloudSync,
  Warning,
  Cached,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { BACKEND_URL } from '../config';
import { clearBackendCache } from '../services/kikaService';

// Check if running in Tauri
const isTauri = '__TAURI__' in window;

// Helper to make HTTP requests that work in both Tauri and browser
async function authFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = `${BACKEND_URL}${endpoint}`;
  
  if (isTauri) {
    try {
      const { fetch: tauriFetch } = await import('@tauri-apps/api/http');
      const response = await tauriFetch(url, {
        method: (options.method || 'GET') as any,
        headers: options.headers as Record<string, string>,
        body: options.body ? {
          type: 'Text',
          payload: options.body as string,
        } : undefined,
      });
      
      return {
        ok: response.ok,
        status: response.status,
        json: async () => response.data,
        text: async () => JSON.stringify(response.data),
      } as Response;
    } catch (e) {
      console.error('Tauri fetch failed, falling back to browser fetch:', e);
    }
  }
  
  return fetch(url, options);
}

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, isOnline } = useAuth();
  
  // Password change state
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // Delete account state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Cache clear state
  const [cacheLoading, setCacheLoading] = useState(false);
  const [cacheSuccess, setCacheSuccess] = useState('');
  const [cacheError, setCacheError] = useState('');

  const isGuest = user?.is_guest;

  const handleClearCache = async () => {
    setCacheLoading(true);
    setCacheError('');
    setCacheSuccess('');

    try {
      const result = await clearBackendCache();
      setCacheSuccess(result.message);
    } catch (error) {
      setCacheError(error instanceof Error ? error.message : 'Failed to clear cache');
    }

    setCacheLoading(false);
  };

  const handleRequestPasswordReset = async () => {
    if (!user || isGuest) return;
    
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess('');

    try {
      const response = await authFetch('/password/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });

      if (response.ok) {
        setPasswordSuccess('Password reset email sent! Check your inbox.');
      } else {
        setPasswordError('Failed to send reset email. Please try again.');
      }
    } catch (error) {
      setPasswordError('Connection error. Please check your internet connection.');
    }

    setPasswordLoading(false);
  };

  const handleDeleteAccount = async () => {
    if (!user || isGuest) return;
    if (deleteConfirmEmail.toLowerCase() !== user.email.toLowerCase()) {
      setDeleteError('Email does not match. Please type your email to confirm.');
      return;
    }

    setDeleteLoading(true);
    setDeleteError('');

    try {
      // Call the deactivate endpoint (soft delete)
      const response = await authFetch('/users/deactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });

      if (response.ok) {
        // Logout and redirect to login
        logout();
        navigate('/login');
      } else {
        const data = await response.json();
        setDeleteError(data.detail || 'Failed to delete account. Please try again.');
      }
    } catch (error) {
      setDeleteError('Connection error. Please check your internet connection.');
    }

    setDeleteLoading(false);
  };

  if (isGuest) {
    return (
      <Container maxWidth="md">
        <Box sx={{ py: 4 }}>
          <Typography variant="h4" gutterBottom>
            ⚙️ Settings
          </Typography>
          
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body1">
              <strong>Guest Mode</strong>
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              You're using KIKA as a guest. Your data is stored locally and won't be synced to the cloud.
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Create an account to:
            </Typography>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
              <li>Sync your plot configurations across devices</li>
              <li>Access your settings from anywhere</li>
              <li>Get priority support and updates</li>
            </ul>
            <Button
              variant="contained"
              size="small"
              sx={{ mt: 2 }}
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              Create Account
            </Button>
          </Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          ⚙️ Settings
        </Typography>

        {/* Profile Section */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Person /> Profile
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <List disablePadding>
            <ListItem>
              <ListItemIcon>
                <Email />
              </ListItemIcon>
              <ListItemText 
                primary="Email"
                secondary={user?.email}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <VerifiedUser />
              </ListItemIcon>
              <ListItemText 
                primary="Status"
                secondary={
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                    <Chip 
                      size="small" 
                      label={user?.verified ? 'Verified' : 'Not Verified'} 
                      color={user?.verified ? 'success' : 'warning'}
                    />
                    <Chip 
                      size="small" 
                      label={user?.is_active ? 'Active' : 'Inactive'} 
                      color={user?.is_active ? 'success' : 'error'}
                    />
                  </Box>
                }
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CloudSync />
              </ListItemIcon>
              <ListItemText 
                primary="Cloud Sync"
                secondary={isOnline ? 'Connected - your settings sync across devices' : 'Offline - changes will sync when online'}
              />
              <Chip 
                size="small" 
                label={isOnline ? 'Online' : 'Offline'} 
                color={isOnline ? 'success' : 'default'}
              />
            </ListItem>
          </List>
        </Paper>

        {/* Security Section */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Lock /> Security
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {passwordSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {passwordSuccess}
            </Alert>
          )}
          {passwordError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {passwordError}
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            To change your password, we'll send a password reset link to your email address.
          </Typography>

          <Button
            variant="outlined"
            startIcon={<Lock />}
            onClick={handleRequestPasswordReset}
            disabled={passwordLoading || !isOnline}
          >
            {passwordLoading ? 'Sending...' : 'Change Password'}
          </Button>
        </Paper>

        {/* Cache Management Section */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Cached /> Cache Management
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {cacheSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {cacheSuccess}
            </Alert>
          )}
          {cacheError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {cacheError}
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Clear the backend cache if you're experiencing issues with file processing. 
            This will force files to be re-parsed on next use.
          </Typography>

          <Button
            variant="outlined"
            startIcon={<Cached />}
            onClick={handleClearCache}
            disabled={cacheLoading}
          >
            {cacheLoading ? 'Clearing...' : 'Clear Backend Cache'}
          </Button>
        </Paper>

        {/* Danger Zone */}
        <Paper sx={{ p: 3, border: '1px solid', borderColor: 'error.main' }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
            <Warning /> Danger Zone
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Once you delete your account, there is no going back. Please be certain.
          </Typography>

          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteForever />}
            onClick={() => setDeleteDialogOpen(true)}
            disabled={!isOnline}
          >
            Delete Account
          </Button>
        </Paper>

        {/* Delete Account Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle sx={{ color: 'error.main' }}>
            ⚠️ Delete Account
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              This action cannot be undone. This will permanently deactivate your account and you will lose access to all your synced data.
            </DialogContentText>
            <DialogContentText sx={{ mb: 2 }}>
              Please type <strong>{user?.email}</strong> to confirm:
            </DialogContentText>
            
            {deleteError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {deleteError}
              </Alert>
            )}

            <TextField
              autoFocus
              fullWidth
              label="Confirm Email"
              value={deleteConfirmEmail}
              onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              placeholder={user?.email}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setDeleteDialogOpen(false);
              setDeleteConfirmEmail('');
              setDeleteError('');
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteAccount} 
              color="error" 
              variant="contained"
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Deleting...' : 'Delete My Account'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};
