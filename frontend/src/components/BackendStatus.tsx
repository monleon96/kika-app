import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Tooltip,
  IconButton,
  Popover,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Divider,
} from '@mui/material';
import {
  CloudOff,
  CloudDone,
  Refresh,
  Storage,
  Security,
  ExpandMore,
} from '@mui/icons-material';
import {
  checkAuthHealth,
  checkCoreHealth,
  startAuthBackend,
  startCoreBackend,
  getAppVersion,
} from '../services/updateService';

interface BackendStatusProps {
  showDetails?: boolean;
}

export const BackendStatus: React.FC<BackendStatusProps> = ({
  showDetails = false,
}) => {
  const [authStatus, setAuthStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [coreStatus, setCoreStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [appVersion, setAppVersion] = useState<string>('');
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [starting, setStarting] = useState<{ auth: boolean; core: boolean }>({
    auth: false,
    core: false,
  });

  const checkStatus = useCallback(async () => {
    setAuthStatus('checking');
    setCoreStatus('checking');

    const [auth, core] = await Promise.all([
      checkAuthHealth(),
      checkCoreHealth(),
    ]);

    setAuthStatus(auth ? 'online' : 'offline');
    setCoreStatus(core ? 'online' : 'offline');
  }, []);

  useEffect(() => {
    const init = async () => {
      const version = await getAppVersion();
      setAppVersion(version);
      await checkStatus();
    };

    init();

    // Periodically check status
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const handleStartAuth = async () => {
    setStarting(prev => ({ ...prev, auth: true }));
    try {
      await startAuthBackend();
      // Wait a bit for the backend to start
      await new Promise(resolve => setTimeout(resolve, 2000));
      await checkStatus();
    } catch (error) {
      console.error('Failed to start auth backend:', error);
    } finally {
      setStarting(prev => ({ ...prev, auth: false }));
    }
  };

  const handleStartCore = async () => {
    setStarting(prev => ({ ...prev, core: true }));
    try {
      await startCoreBackend();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await checkStatus();
    } catch (error) {
      console.error('Failed to start core backend:', error);
    } finally {
      setStarting(prev => ({ ...prev, core: false }));
    }
  };

  const overallStatus =
    authStatus === 'checking' || coreStatus === 'checking'
      ? 'checking'
      : authStatus === 'online' && coreStatus === 'online'
      ? 'online'
      : 'offline';

  const getStatusIcon = (status: 'checking' | 'online' | 'offline') => {
    switch (status) {
      case 'checking':
        return <CircularProgress size={16} />;
      case 'online':
        return <CloudDone color="success" fontSize="small" />;
      case 'offline':
        return <CloudOff color="error" fontSize="small" />;
    }
  };

  const getStatusColor = (status: 'checking' | 'online' | 'offline') => {
    switch (status) {
      case 'checking':
        return 'default';
      case 'online':
        return 'success';
      case 'offline':
        return 'error';
    }
  };

  if (!showDetails) {
    return (
      <Tooltip title={`Backend: ${overallStatus}`}>
        <Chip
          icon={getStatusIcon(overallStatus)}
          label={overallStatus === 'online' ? 'Connected' : 'Offline'}
          size="small"
          color={getStatusColor(overallStatus) as any}
          variant="outlined"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          deleteIcon={<ExpandMore />}
          onDelete={(e) => setAnchorEl(e.currentTarget as HTMLElement)}
        />
      </Tooltip>
    );
  }

  return (
    <>
      <Chip
        icon={getStatusIcon(overallStatus)}
        label={overallStatus === 'online' ? 'Connected' : 'Offline'}
        size="small"
        color={getStatusColor(overallStatus) as any}
        variant="outlined"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        deleteIcon={<ExpandMore />}
        onDelete={(e) => setAnchorEl(e.currentTarget as HTMLElement)}
      />

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ p: 2, minWidth: 280 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2">Backend Status</Typography>
            <IconButton size="small" onClick={checkStatus}>
              <Refresh fontSize="small" />
            </IconButton>
          </Box>

          <List dense>
            <ListItem
              secondaryAction={
                authStatus === 'offline' && (
                  <Button
                    size="small"
                    onClick={handleStartAuth}
                    disabled={starting.auth}
                  >
                    {starting.auth ? 'Starting...' : 'Start'}
                  </Button>
                )
              }
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Security fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Auth Service"
                secondary={
                  <Chip
                    size="small"
                    label={authStatus}
                    color={getStatusColor(authStatus) as any}
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                }
              />
            </ListItem>

            <ListItem
              secondaryAction={
                coreStatus === 'offline' && (
                  <Button
                    size="small"
                    onClick={handleStartCore}
                    disabled={starting.core}
                  >
                    {starting.core ? 'Starting...' : 'Start'}
                  </Button>
                )
              }
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Storage fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Core Service"
                secondary={
                  <Chip
                    size="small"
                    label={coreStatus}
                    color={getStatusColor(coreStatus) as any}
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                }
              />
            </ListItem>
          </List>

          <Divider sx={{ my: 1 }} />

          <Typography variant="caption" color="text.secondary">
            App Version: v{appVersion}
          </Typography>
        </Box>
      </Popover>
    </>
  );
};
