import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  LinearProgress,
  Box,
  Alert,
  IconButton,
  Collapse,
  Paper,
} from '@mui/material';
import { Update, Close, Refresh, Download, CheckCircle, Error as ErrorIcon, ExpandMore, ExpandLess } from '@mui/icons-material';
import {
  checkForUpdates,
  installUpdateAndRestart,
  getAppVersion,
} from '../services/updateService';

interface UpdateNotificationProps {
  showOnStartup?: boolean;
}

type UpdateStage = 'checking' | 'available' | 'downloading' | 'installing' | 'restarting' | 'error' | 'idle';

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({
  showOnStartup = true,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{
    version: string;
    notes: string;
  } | null>(null);
  const [stage, setStage] = useState<UpdateStage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [showNotes, setShowNotes] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const init = async () => {
      // Get current version
      const version = await getAppVersion();
      setCurrentVersion(version);

      // Check for updates on startup
      if (showOnStartup) {
        setStage('checking');
        const update = await checkForUpdates();
        if (update) {
          setUpdateInfo({
            version: update.version,
            notes: update.notes,
          });
          setStage('available');
          setDialogOpen(true); // Show dialog immediately for update
        } else {
          setStage('idle');
        }
      }
    };

    init();
  }, [showOnStartup]);

  // Simulate progress during install (since Tauri updater doesn't give us granular progress)
  useEffect(() => {
    if (stage === 'downloading' || stage === 'installing') {
      const interval = setInterval(() => {
        setProgress((prev) => {
          // Slow down as we approach 95%, never quite reach 100% until complete
          if (prev < 30) return prev + 5;
          if (prev < 60) return prev + 3;
          if (prev < 85) return prev + 1;
          if (prev < 95) return prev + 0.5;
          return prev;
        });
      }, 500);
      return () => clearInterval(interval);
    } else if (stage === 'restarting') {
      setProgress(100);
    }
  }, [stage]);

  const handleInstallUpdate = useCallback(async () => {
    setStage('downloading');
    setError(null);
    setProgress(0);

    try {
      // Small delay to show the downloading state
      await new Promise(resolve => setTimeout(resolve, 500));
      setStage('installing');
      
      await installUpdateAndRestart();
      
      // If we get here without error, we're about to restart
      setStage('restarting');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to install update');
      setStage('error');
    }
  }, []);

  const handleRetry = useCallback(() => {
    handleInstallUpdate();
  }, [handleInstallUpdate]);

  const handleCloseDialog = () => {
    if (stage !== 'downloading' && stage !== 'installing' && stage !== 'restarting') {
      setDialogOpen(false);
      setStage('idle');
    }
  };

  const handleRemindLater = () => {
    setDialogOpen(false);
    setStage('idle');
  };

  const getStageContent = () => {
    switch (stage) {
      case 'checking':
        return {
          icon: <Refresh className="spin" sx={{ fontSize: 48 }} />,
          title: 'Checking for Updates',
          subtitle: 'Please wait...',
        };
      case 'downloading':
        return {
          icon: <Download color="primary" sx={{ fontSize: 48 }} />,
          title: 'Downloading Update',
          subtitle: `Downloading KIKA v${updateInfo?.version}...`,
        };
      case 'installing':
        return {
          icon: <Update color="primary" sx={{ fontSize: 48 }} />,
          title: 'Installing Update',
          subtitle: 'This may take a moment...',
        };
      case 'restarting':
        return {
          icon: <CheckCircle color="success" sx={{ fontSize: 48 }} />,
          title: 'Update Complete!',
          subtitle: 'Restarting KIKA...',
        };
      case 'error':
        return {
          icon: <ErrorIcon color="error" sx={{ fontSize: 48 }} />,
          title: 'Update Failed',
          subtitle: 'An error occurred during the update',
        };
      default:
        return {
          icon: <Update color="primary" sx={{ fontSize: 48 }} />,
          title: 'Update Available',
          subtitle: 'A new version of KIKA is ready to install',
        };
    }
  };

  const stageContent = getStageContent();
  const isProcessing = stage === 'downloading' || stage === 'installing' || stage === 'restarting';

  return (
    <>
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={isProcessing}
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
          }
        }}
      >
        {/* Header with close button */}
        {!isProcessing && (
          <IconButton
            onClick={handleCloseDialog}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: 'text.secondary',
            }}
          >
            <Close />
          </IconButton>
        )}

        <DialogContent sx={{ pt: 4, pb: 2 }}>
          {/* Centered icon and title */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{ mb: 2 }}>
              {stageContent.icon}
            </Box>
            <Typography variant="h5" gutterBottom fontWeight="bold">
              {stageContent.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {stageContent.subtitle}
            </Typography>
          </Box>

          {/* Version chips */}
          {stage === 'available' && updateInfo && (
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
              <Paper variant="outlined" sx={{ px: 2, py: 1, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Current
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  v{currentVersion}
                </Typography>
              </Paper>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="h5">→</Typography>
              </Box>
              <Paper 
                variant="outlined" 
                sx={{ 
                  px: 2, 
                  py: 1, 
                  borderRadius: 2, 
                  borderColor: 'primary.main',
                  bgcolor: 'primary.50'
                }}
              >
                <Typography variant="caption" color="primary" display="block">
                  New
                </Typography>
                <Typography variant="body1" fontWeight="bold" color="primary">
                  v{updateInfo.version}
                </Typography>
              </Paper>
            </Box>
          )}

          {/* Progress bar */}
          {isProcessing && (
            <Box sx={{ mt: 2, mb: 1 }}>
              <LinearProgress 
                variant={stage === 'restarting' ? 'determinate' : 'indeterminate'} 
                value={progress}
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  mb: 1
                }} 
              />
              <Typography variant="caption" color="text.secondary" textAlign="center" display="block">
                {stage === 'downloading' && 'Downloading update package...'}
                {stage === 'installing' && 'Installing update (do not close the application)...'}
                {stage === 'restarting' && 'Preparing to restart...'}
              </Typography>
            </Box>
          )}

          {/* Error alert */}
          {stage === 'error' && error && (
            <Alert 
              severity="error" 
              sx={{ mt: 2 }}
              action={
                <Button color="inherit" size="small" onClick={handleRetry}>
                  Retry
                </Button>
              }
            >
              <Typography variant="body2">
                {error}
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                You can try again or download the update manually from GitHub.
              </Typography>
            </Alert>
          )}

          {/* Release notes */}
          {stage === 'available' && updateInfo?.notes && (
            <Box sx={{ mt: 2 }}>
              <Button
                size="small"
                onClick={() => setShowNotes(!showNotes)}
                endIcon={showNotes ? <ExpandLess /> : <ExpandMore />}
                sx={{ mb: 1 }}
              >
                {showNotes ? 'Hide' : 'Show'} Release Notes
              </Button>
              <Collapse in={showNotes}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    bgcolor: 'grey.50',
                    borderRadius: 2,
                    maxHeight: 200,
                    overflow: 'auto',
                  }}
                >
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace',
                      fontSize: '0.85rem'
                    }}
                  >
                    {updateInfo.notes}
                  </Typography>
                </Paper>
              </Collapse>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'center', gap: 1 }}>
          {stage === 'available' && (
            <>
              <Button 
                onClick={handleRemindLater}
                variant="outlined"
                sx={{ minWidth: 120 }}
              >
                Later
              </Button>
              <Button
                variant="contained"
                onClick={handleInstallUpdate}
                startIcon={<Download />}
                sx={{ minWidth: 180 }}
              >
                Install Update
              </Button>
            </>
          )}
          {stage === 'error' && (
            <>
              <Button onClick={handleCloseDialog} variant="outlined">
                Cancel
              </Button>
              <Button variant="contained" onClick={handleRetry} startIcon={<Refresh />}>
                Try Again
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* CSS for spin animation */}
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
