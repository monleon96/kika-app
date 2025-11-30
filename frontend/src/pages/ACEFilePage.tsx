import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardActionArea,
  Button,
  Chip,
  IconButton,
  Breadcrumbs,
  Link,
  Divider,
  alpha,
  useTheme,
  Fade,
  Grow,
  Grid,
  Alert,
  Tooltip,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  ArrowBack,
  Science,
  Timeline,
  ShowChart,
  Functions,
  Speed,
  Thermostat,
  DataObject,
  NavigateNext,
  ContentCopy,
  Visibility,
  TableChart,
  ScatterPlot,
  Category,
  Edit,
  Check,
  Close,
} from '@mui/icons-material';
import { useFileWorkspace } from '../contexts/FileWorkspaceContext';
import type { ACEMetadata } from '../types/file';

interface DataSectionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
  badge?: string;
  disabled?: boolean;
  delay?: number;
}

const DataSection: React.FC<DataSectionProps> = ({
  title,
  description,
  icon,
  color,
  onClick,
  badge,
  disabled = false,
  delay = 0,
}) => {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);

  return (
    <Grow in timeout={400 + delay}>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'visible',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: hovered && !disabled ? 'translateY(-4px)' : 'translateY(0)',
          boxShadow: hovered && !disabled
            ? `0 12px 24px ${alpha(color, 0.2)}`
            : theme.shadows[1],
          opacity: disabled ? 0.6 : 1,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: `linear-gradient(90deg, ${color}, ${alpha(color, 0.6)})`,
            borderRadius: '12px 12px 0 0',
          },
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {badge && (
          <Chip
            label={badge}
            size="small"
            sx={{
              position: 'absolute',
              top: -8,
              right: 12,
              bgcolor: disabled ? 'warning.main' : 'success.main',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.65rem',
            }}
          />
        )}
        <CardActionArea
          onClick={onClick}
          disabled={disabled}
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            p: 2.5,
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(color, 0.1),
              color: color,
              mb: 2,
              transition: 'all 0.3s ease',
              transform: hovered && !disabled ? 'scale(1.1)' : 'scale(1)',
            }}
          >
            {icon}
          </Box>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
            {description}
          </Typography>
        </CardActionArea>
      </Card>
    </Grow>
  );
};

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

export const ACEFilePage: React.FC = () => {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { files, renameFile } = useFileWorkspace();
  
  // State for inline editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  const file = useMemo(() => {
    return files.find(f => f.id === fileId && f.type === 'ace');
  }, [files, fileId]);

  // Type guard for ACE metadata
  const metadata: ACEMetadata | null = useMemo(() => {
    if (file?.metadata && 'atomic_weight_ratio' in file.metadata) {
      return file.metadata as ACEMetadata;
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
          ACE file not found. It may have been removed from the workspace.
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/ace-files')}
        >
          Back to ACE Files
        </Button>
      </Box>
    );
  }

  const dataSections = [
    {
      title: 'Cross Sections',
      description: 'View and plot reaction cross sections vs. energy. Access all available MT reactions.',
      icon: <ShowChart sx={{ fontSize: 24 }} />,
      color: theme.palette.primary.main,
      onClick: () => navigate(`/ace-files/${fileId}/cross-sections`),
      badge: metadata ? `${metadata.available_reactions?.length || 0} reactions` : undefined,
    },
    {
      title: 'Angular Distributions',
      description: 'Explore scattering angular distributions with energy interpolation.',
      icon: <ScatterPlot sx={{ fontSize: 24 }} />,
      color: theme.palette.secondary.main,
      onClick: () => navigate(`/ace-files/${fileId}/angular`),
    },
    {
      title: 'Energy Distributions',
      description: 'Secondary particle energy spectra and emission distributions.',
      icon: <Timeline sx={{ fontSize: 24 }} />,
      color: theme.palette.warning.main,
      onClick: () => navigate(`/ace-files/${fileId}/energy`),
      badge: 'Coming Soon',
    },
    {
      title: 'Nu-bar Data',
      description: 'Fission neutron multiplicity data (ν̄) for fissile isotopes.',
      icon: <Functions sx={{ fontSize: 24 }} />,
      color: theme.palette.info.main,
      onClick: () => navigate(`/ace-files/${fileId}/nubar`),
      badge: 'Coming Soon',
    },
    {
      title: 'Delayed Neutrons',
      description: 'Delayed neutron precursor groups and decay constants.',
      icon: <Speed sx={{ fontSize: 24 }} />,
      color: theme.palette.success.main,
      onClick: () => navigate(`/ace-files/${fileId}/delayed`),
      badge: 'Coming Soon',
    },
    {
      title: 'Raw Data Tables',
      description: 'Access raw ACE data blocks and arrays for detailed analysis.',
      icon: <TableChart sx={{ fontSize: 24 }} />,
      color: theme.palette.grey[600],
      onClick: () => navigate(`/ace-files/${fileId}/raw`),
      badge: 'Coming Soon',
    },
  ];

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
              onClick={() => navigate('/ace-files')}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              <Science fontSize="small" />
              ACE Files
            </Link>
            <Typography color="text.primary" fontWeight={500}>
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
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
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
              background: alpha(theme.palette.primary.main, 0.1),
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
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                }}
              >
                <Science sx={{ fontSize: 36 }} />
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
                    label="ACE"
                    size="small"
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                      fontWeight: 600,
                    }}
                  />
                </Box>

                {metadata && (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    <Chip
                      icon={<DataObject />}
                      label={`ZAID: ${metadata.zaid}`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      icon={<Thermostat />}
                      label={`${metadata.temperature?.toFixed(1) || '?'} K`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      icon={<Category />}
                      label={`AWR: ${metadata.atomic_weight_ratio?.toFixed(4) || '?'}`}
                      size="small"
                      variant="outlined"
                    />
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
                  onClick={() => navigate('/ace-files')}
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Visibility />}
                  onClick={() => navigate(`/ace-files/${fileId}/cross-sections`)}
                >
                  Open Plotter
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
              File Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Identification
                  </Typography>
                  <Divider sx={{ mb: 1 }} />
                  <InfoItem label="ZAID" value={metadata.zaid || 'N/A'} icon={<DataObject sx={{ fontSize: 18 }} />} copyable />
                  <InfoItem label="Atomic Weight Ratio" value={metadata.atomic_weight_ratio?.toFixed(6) || 'N/A'} />
                  <InfoItem label="File Size" value={`${(file.size / 1024).toFixed(1)} KB`} />
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Physical Properties
                  </Typography>
                  <Divider sx={{ mb: 1 }} />
                  <InfoItem label="Temperature" value={`${metadata.temperature?.toFixed(2) || 'N/A'} K`} icon={<Thermostat sx={{ fontSize: 18 }} />} />
                  <InfoItem label="Available Reactions" value={metadata.available_reactions?.length || 0} />
                  <InfoItem label="Processing Date" value={file.uploadedAt.toLocaleDateString()} />
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Available Reactions
                  </Typography>
                  <Divider sx={{ mb: 1 }} />
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight: 100, overflow: 'auto' }}>
                    {metadata.available_reactions?.slice(0, 20).map((mt: number) => (
                      <Chip
                        key={mt}
                        label={`MT${mt}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    ))}
                    {metadata.available_reactions && metadata.available_reactions.length > 20 && (
                      <Chip
                        label={`+${metadata.available_reactions.length - 20} more`}
                        size="small"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </Fade>
      )}

      {/* Data Sections */}
      <Fade in timeout={700}>
        <Box>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ mb: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}
          >
            Explore Data
          </Typography>
          <Grid container spacing={2}>
            {dataSections.map((section, index) => (
              <Grid item xs={12} sm={6} md={4} key={section.title}>
                <DataSection {...section} delay={index * 50} />
              </Grid>
            ))}
          </Grid>
        </Box>
      </Fade>

      {/* Spacer */}
      <Box sx={{ height: 24 }} />
    </Box>
  );
};
