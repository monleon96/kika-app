import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  IconButton,
  Breadcrumbs,
  Link,
  Divider,
  alpha,
  useTheme,
  Fade,
  Grid,
  Alert,
  Tooltip,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  ArrowBack,
  Assessment,
  NavigateNext,
  ContentCopy,
  Edit,
  Check,
  Close,
  BarChart,
  Speed,
  Description,
  Functions,
  CheckCircle,
  Warning,
} from '@mui/icons-material';
import { useFileWorkspace } from '../contexts/FileWorkspaceContext';
import type { MCTALMetadata } from '../types/file';

interface InfoItemProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  copyable?: boolean;
}

const InfoItem: React.FC<InfoItemProps> = ({ label, value, icon, copyable }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(String(value));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
      {icon && (
        <Box sx={{ color: 'text.secondary' }}>
          {icon}
        </Box>
      )}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" display="block">
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={500} noWrap>
          {value}
        </Typography>
      </Box>
      {copyable && (
        <Tooltip title={copied ? 'Copied!' : 'Copy'}>
          <IconButton size="small" onClick={handleCopy}>
            <ContentCopy sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};

// Helper to format large numbers
const formatNumber = (num: number): string => {
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toString();
};

// Helper to determine error quality
const getErrorQuality = (error: number | undefined): { color: string; icon: React.ReactNode } => {
  if (error === undefined) return { color: 'grey', icon: null };
  if (error < 0.05) return { color: 'success', icon: <CheckCircle sx={{ fontSize: 14 }} /> };
  if (error < 0.10) return { color: 'warning', icon: <Warning sx={{ fontSize: 14 }} /> };
  return { color: 'error', icon: <Warning sx={{ fontSize: 14 }} /> };
};

export const MCTALFilePage: React.FC = () => {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { files, renameFile } = useFileWorkspace();
  
  // State for inline editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  const file = useMemo(() => {
    return files.find(f => f.id === fileId && f.type === 'mcnp-mctal');
  }, [files, fileId]);

  // Type guard for MCTAL metadata
  const metadata: MCTALMetadata | null = useMemo(() => {
    if (file?.metadata && 'tally_count' in file.metadata) {
      return file.metadata as MCTALMetadata;
    }
    return null;
  }, [file]);

  // Handlers for inline name editing
  const handleStartEditing = () => {
    if (file) {
      setEditedName(file.displayName);
      setIsEditingName(true);
    }
  };

  const handleSaveName = () => {
    if (file && editedName.trim() && editedName !== file.displayName) {
      renameFile(file.id, editedName.trim());
    }
    setIsEditingName(false);
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  if (!file) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          MCTAL file not found. It may have been removed from the workspace.
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/mcnp')}
        >
          Back to MCNP
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', minHeight: '100%' }}>
      {/* Breadcrumb Navigation */}
      <Fade in timeout={300}>
        <Box sx={{ mb: 3 }}>
          <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
            <Link
              component="button"
              underline="hover"
              color="inherit"
              onClick={() => navigate('/mcnp')}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              MCNP
            </Link>
            <Typography color="text.primary" fontWeight={500} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Assessment fontSize="small" />
              {file.displayName}
            </Typography>
          </Breadcrumbs>
        </Box>
      </Fade>

      {/* Header Section */}
      <Fade in timeout={500}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 4,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.05)} 0%, ${alpha(theme.palette.warning.main, 0.1)} 100%)`,
            border: `1px solid ${alpha(theme.palette.warning.main, 0.1)}`,
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -50,
              right: -50,
              width: 150,
              height: 150,
              borderRadius: '50%',
              background: alpha(theme.palette.warning.main, 0.1),
              filter: 'blur(40px)',
            },
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3, flexWrap: 'wrap' }}>
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: alpha(theme.palette.warning.main, 0.1),
                  color: theme.palette.warning.main,
                }}
              >
                <Assessment sx={{ fontSize: 36 }} />
              </Box>

              <Box sx={{ flex: 1, minWidth: 250 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {isEditingName ? (
                    <TextField
                      size="small"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      sx={{ 
                        minWidth: 200,
                        '& .MuiInputBase-input': { 
                          fontSize: '1.5rem', 
                          fontWeight: 700,
                          py: 0.5,
                        } 
                      }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={handleSaveName} color="primary">
                              <Check />
                            </IconButton>
                            <IconButton size="small" onClick={handleCancelEdit}>
                              <Close />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  ) : (
                    <>
                      <Typography variant="h4" fontWeight={700}>
                        {file.displayName}
                      </Typography>
                      <Tooltip title="Edit name">
                        <IconButton size="small" onClick={handleStartEditing}>
                          <Edit sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                  <Chip
                    label="MCTAL"
                    size="small"
                    sx={{
                      bgcolor: alpha(theme.palette.warning.main, 0.1),
                      color: theme.palette.warning.main,
                      fontWeight: 600,
                    }}
                  />
                </Box>

                {metadata && (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    <Chip
                      icon={<BarChart />}
                      label={`${metadata.tally_count} tallies`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      icon={<Speed />}
                      label={`${formatNumber(metadata.nps)} histories`}
                      size="small"
                      variant="outlined"
                    />
                    {metadata.npert > 0 && (
                      <Chip
                        icon={<Functions />}
                        label={`${metadata.npert} perturbations`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                )}

                <Typography variant="body2" color="text.secondary">
                  Original file: {file.name}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  onClick={() => navigate('/mcnp')}
                >
                  Back
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Fade>

      {/* File Details */}
      {metadata && (
        <Fade in timeout={600}>
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}
            >
              Problem Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Simulation Info
                  </Typography>
                  <Divider sx={{ mb: 1 }} />
                  <InfoItem label="Code" value={metadata.code_name || 'MCNP'} icon={<Description sx={{ fontSize: 18 }} />} />
                  <InfoItem label="Version" value={metadata.version || 'N/A'} />
                  <InfoItem label="Problem ID" value={metadata.problem_id || 'N/A'} copyable />
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Statistics
                  </Typography>
                  <Divider sx={{ mb: 1 }} />
                  <InfoItem label="Histories (NPS)" value={metadata.nps?.toLocaleString() || 'N/A'} icon={<Speed sx={{ fontSize: 18 }} />} />
                  <InfoItem label="Tallies" value={metadata.tally_count} icon={<BarChart sx={{ fontSize: 18 }} />} />
                  <InfoItem label="Perturbations" value={metadata.npert} icon={<Functions sx={{ fontSize: 18 }} />} />
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    File Info
                  </Typography>
                  <Divider sx={{ mb: 1 }} />
                  <InfoItem label="File ID" value={metadata.file_id?.substring(0, 16) + '...' || 'N/A'} copyable />
                  <InfoItem label="File Size" value={`${(file.size / 1024).toFixed(1)} KB`} />
                  <InfoItem label="Upload Date" value={file.uploadedAt.toLocaleDateString()} />
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </Fade>
      )}

      {/* Tallies Table */}
      {metadata && metadata.tally_count > 0 && (
        <Fade in timeout={700}>
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}
            >
              Tally Results
            </Typography>
            <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha(theme.palette.warning.main, 0.05) }}>
                    <TableCell sx={{ fontWeight: 600 }}>Tally</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Cells/Surfaces</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Energy Bins</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Result</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Rel. Error</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Perturbations</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {metadata.tally_numbers?.map((tallyNum: number) => {
                    const tallySummary = metadata.tallies_summary?.[tallyNum];
                    const errorQuality = getErrorQuality(tallySummary?.error);
                    return (
                      <TableRow key={tallyNum} hover>
                        <TableCell>
                          <Chip label={`F${tallyNum}`} size="small" color="warning" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                            {tallySummary?.name || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>{tallySummary?.n_cells_surfaces ?? 'N/A'}</TableCell>
                        <TableCell>{tallySummary?.n_energy_bins ?? 'N/A'}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {tallySummary?.result != null 
                              ? tallySummary.result.toExponential(4) 
                              : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {tallySummary?.error != null ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Chip
                                label={`${(tallySummary.error * 100).toFixed(2)}%`}
                                size="small"
                                color={errorQuality.color as 'success' | 'warning' | 'error' | 'default'}
                                variant="outlined"
                                icon={errorQuality.icon as React.ReactElement}
                                sx={{ fontSize: '0.75rem' }}
                              />
                            </Box>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          {tallySummary?.has_perturbations ? (
                            <Chip label="Yes" size="small" color="info" variant="filled" sx={{ fontSize: '0.7rem' }} />
                          ) : (
                            <Typography variant="body2" color="text.secondary">No</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Fade>
      )}

      {/* Spacer */}
      <Box sx={{ height: 24 }} />
    </Box>
  );
};
