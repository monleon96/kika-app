import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Info,
  CheckCircle,
  Error as ErrorIcon,
  Refresh,
  ContentCopy,
} from '@mui/icons-material';
import { getDiagnosticInfo, DiagnosticInfo } from '../services/updateService';

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

export const AboutDialog: React.FC<AboutDialogProps> = ({ open, onClose }) => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadDiagnostics = async () => {
    setLoading(true);
    try {
      const info = await getDiagnosticInfo();
      setDiagnostics(info);
    } catch (error) {
      console.error('Failed to load diagnostics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadDiagnostics();
    }
  }, [open]);

  const copyDiagnostics = () => {
    if (!diagnostics) return;
    
    const text = `KIKA Diagnostic Info
====================
App Version: ${diagnostics.appVersion}
Running in Tauri: ${diagnostics.isTauri}
${diagnostics.sidecarStatus ? `Sidecar Status: ${diagnostics.sidecarStatus}` : ''}

Auth Backend:
  URL: ${diagnostics.authBackendUrl}
  Status: ${diagnostics.authBackendStatus}
  ${diagnostics.authBackendError ? `Error: ${diagnostics.authBackendError}` : ''}

Core Backend:
  URL: ${diagnostics.coreBackendUrl}
  Status: ${diagnostics.coreBackendStatus}
  ${diagnostics.coreBackendVersion ? `Version: ${diagnostics.coreBackendVersion}` : ''}
  ${diagnostics.coreBackendError ? `Error: ${diagnostics.coreBackendError}` : ''}
`;
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusChip = (status: 'online' | 'offline' | 'error', error?: string) => {
    if (status === 'online') {
      return <Chip icon={<CheckCircle />} label="Online" color="success" size="small" />;
    } else if (status === 'error') {
      return (
        <Tooltip title={error || 'Connection error'}>
          <Chip icon={<ErrorIcon />} label="Error" color="error" size="small" />
        </Tooltip>
      );
    }
    return <Chip icon={<ErrorIcon />} label="Offline" color="warning" size="small" />;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Info />
        About KIKA
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : diagnostics ? (
          <>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="h4">⚛️ KIKA</Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Nuclear Data Visualization Tool
              </Typography>
              <Chip 
                label={`v${diagnostics.appVersion}`} 
                color="primary" 
                sx={{ mt: 1 }} 
              />
              {diagnostics.isTauri && (
                <Chip 
                  label="Desktop App" 
                  variant="outlined" 
                  sx={{ mt: 1, ml: 1 }} 
                />
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" gutterBottom>
              System Status
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
              {/* Auth Backend Status */}
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" fontWeight="bold">
                    🔐 Auth Service (Cloud)
                  </Typography>
                  {getStatusChip(diagnostics.authBackendStatus, diagnostics.authBackendError)}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                  {diagnostics.authBackendUrl}
                </Typography>
                {diagnostics.authBackendError && (
                  <Alert severity="error" sx={{ mt: 1, py: 0 }}>
                    {diagnostics.authBackendError}
                  </Alert>
                )}
              </Box>

              {/* Core Backend Status */}
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" fontWeight="bold">
                    🧮 Processing Server (Local)
                  </Typography>
                  {getStatusChip(diagnostics.coreBackendStatus, diagnostics.coreBackendError)}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {diagnostics.coreBackendUrl}
                </Typography>
                {diagnostics.coreBackendVersion && (
                  <Typography variant="caption" display="block" color="text.secondary">
                    Version: {diagnostics.coreBackendVersion}
                  </Typography>
                )}
                {diagnostics.sidecarStatus && (
                  <Typography variant="caption" display="block" color="text.secondary">
                    Sidecar: {diagnostics.sidecarStatus}
                  </Typography>
                )}
                {diagnostics.coreBackendError && (
                  <Alert severity="error" sx={{ mt: 1, py: 0 }}>
                    {diagnostics.coreBackendError}
                  </Alert>
                )}
              </Box>
            </Box>

            {(diagnostics.authBackendStatus !== 'online' || diagnostics.coreBackendStatus !== 'online') && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Troubleshooting:</strong>
                </Typography>
                {diagnostics.authBackendStatus !== 'online' && (
                  <Typography variant="body2">
                    • Auth service issues may indicate network/firewall blocking HTTPS connections
                  </Typography>
                )}
                {diagnostics.coreBackendStatus !== 'online' && (
                  <Typography variant="body2">
                    • Processing server issues: The local Python backend may not have started. Try restarting the app.
                  </Typography>
                )}
              </Alert>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="caption" color="text.secondary">
              © 2024 KIKA Team • Built with Tauri + React
            </Typography>
          </>
        ) : (
          <Alert severity="error">Failed to load diagnostic information</Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Tooltip title={copied ? 'Copied!' : 'Copy diagnostic info'}>
          <IconButton onClick={copyDiagnostics} disabled={!diagnostics}>
            <ContentCopy />
          </IconButton>
        </Tooltip>
        <Button onClick={loadDiagnostics} startIcon={<Refresh />} disabled={loading}>
          Refresh
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
