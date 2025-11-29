import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  LinearProgress,
  Box,
  Alert,
  Snackbar,
  IconButton,
} from '@mui/material';
import { Update, Close, Refresh } from '@mui/icons-material';
import {
  checkForUpdates,
  installUpdateAndRestart,
  getAppVersion,
} from '../services/updateService';

interface UpdateNotificationProps {
  showOnStartup?: boolean;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({
  showOnStartup = true,
}) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{
    version: string;
    notes: string;
  } | null>(null);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      // Get current version
      const version = await getAppVersion();
      setCurrentVersion(version);

      // Check for updates on startup
      if (showOnStartup) {
        const update = await checkForUpdates();
        if (update) {
          setUpdateInfo({
            version: update.version,
            notes: update.notes,
          });
          setSnackbarOpen(true);
        }
      }
    };

    init();
  }, [showOnStartup]);

  const handleInstallUpdate = async () => {
    setInstalling(true);
    setError(null);

    try {
      await installUpdateAndRestart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to install update');
      setInstalling(false);
    }
  };

  const handleCloseDialog = () => {
    if (!installing) {
      setUpdateAvailable(false);
    }
  };

  const handleSnackbarClick = () => {
    setSnackbarOpen(false);
    setUpdateAvailable(true);
  };

  return (
    <>
      {/* Snackbar notification */}
      <Snackbar
        open={snackbarOpen && !updateAvailable}
        autoHideDuration={null}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert
          severity="info"
          icon={<Update />}
          action={
            <>
              <Button
                color="inherit"
                size="small"
                onClick={handleSnackbarClick}
              >
                View
              </Button>
              <IconButton
                size="small"
                color="inherit"
                onClick={() => setSnackbarOpen(false)}
              >
                <Close fontSize="small" />
              </IconButton>
            </>
          }
        >
          Update available: v{updateInfo?.version}
        </Alert>
      </Snackbar>

      {/* Update dialog */}
      <Dialog
        open={updateAvailable}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Update color="primary" />
            Update Available
          </Box>
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Typography variant="body1" paragraph>
            A new version of KIKA is available!
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Current version: <strong>v{currentVersion}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              New version: <strong>v{updateInfo?.version}</strong>
            </Typography>
          </Box>

          {updateInfo?.notes && (
            <Box
              sx={{
                p: 2,
                bgcolor: 'grey.100',
                borderRadius: 1,
                mb: 2,
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                Release Notes:
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {updateInfo.notes}
              </Typography>
            </Box>
          )}

          {installing && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Downloading and installing update...
              </Typography>
              <LinearProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={installing}>
            Later
          </Button>
          <Button
            variant="contained"
            onClick={handleInstallUpdate}
            disabled={installing}
            startIcon={installing ? <Refresh className="spin" /> : <Update />}
          >
            {installing ? 'Installing...' : 'Install & Restart'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manual check button (can be used elsewhere) */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .spin {
            animation: spin 1s linear infinite;
          }
        `}
      </style>
    </>
  );
};

// Export a hook for manual update checks
export const useUpdateChecker = () => {
  const [checking, setChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{
    version: string;
    notes: string;
  } | null>(null);

  const checkUpdates = async () => {
    setChecking(true);
    try {
      const update = await checkForUpdates();
      setUpdateInfo(
        update
          ? {
              version: update.version,
              notes: update.notes,
            }
          : null
      );
      return update;
    } finally {
      setChecking(false);
    }
  };

  return { checking, updateInfo, checkUpdates };
};
