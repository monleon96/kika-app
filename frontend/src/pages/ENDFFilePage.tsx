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
  Timeline,
  ShowChart,
  NavigateNext,
  ContentCopy,
  Visibility,
  DataObject,
  Category,
  Functions,
  ErrorOutline,
  Edit,
  Check,
  Close,
} from '@mui/icons-material';
import { useFileWorkspace } from '../contexts/FileWorkspaceContext';
import type { ENDFMetadata } from '../types/file';

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

export const ENDFFilePage: React.FC = () => {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { files, renameFile } = useFileWorkspace();
  
  // State for inline editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  const file = useMemo(() => {
    return files.find(f => f.id === fileId && f.type === 'endf');
  }, [files, fileId]);

  // Type guard for ENDF metadata
  const metadata: ENDFMetadata | null = useMemo(() => {
    if (file?.metadata && 'angular_mts' in file.metadata) {
      return file.metadata as ENDFMetadata;
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
          ENDF file not found. It may have been removed from the workspace.
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/endf-files')}
        >
          Back to ENDF Files
        </Button>
      </Box>
    );
  }

  // Build data sections based on available MF data
  const dataSections = [];

  // MF4 - Angular Distributions
  if (metadata?.has_mf4 && metadata.angular_mts.length > 0) {
    dataSections.push({
      title: 'MF4 - Angular Distributions',
      description: `Legendre coefficients for scattering angular distributions. ${metadata.angular_mts.length} MT reactions available.`,
      icon: <ShowChart sx={{ fontSize: 24 }} />,
      color: theme.palette.primary.main,
      onClick: () => navigate(`/endf-files/${fileId}/mf4`),
      badge: `${metadata.angular_mts.length} MTs`,
    });
  }

  // MF34 - Angular Distribution Covariances
  if (metadata?.has_mf34 && metadata.uncertainty_mts.length > 0) {
    dataSections.push({
      title: 'MF34 - Angular Covariances',
      description: `Uncertainty data for angular distributions. ${metadata.uncertainty_mts.length} MT reactions with covariance data.`,
      icon: <ErrorOutline sx={{ fontSize: 24 }} />,
      color: theme.palette.secondary.main,
      onClick: () => navigate(`/endf-files/${fileId}/mf34`),
      badge: `${metadata.uncertainty_mts.length} MTs`,
    });
  }

  // Placeholder sections for future MF files
  const futureSections = [
    {
      title: 'MF3 - Cross Sections',
      description: 'Reaction cross sections vs. incident energy.',
      icon: <Timeline sx={{ fontSize: 24 }} />,
      color: theme.palette.warning.main,
      badge: 'Coming Soon',
      disabled: true,
    },
    {
      title: 'MF5 - Energy Distributions',
      description: 'Secondary particle energy distributions.',
      icon: <Functions sx={{ fontSize: 24 }} />,
      color: theme.palette.info.main,
      badge: 'Coming Soon',
      disabled: true,
    },
    {
      title: 'MF33 - Cross Section Covariances',
      description: 'Uncertainty data for reaction cross sections.',
      icon: <ErrorOutline sx={{ fontSize: 24 }} />,
      color: theme.palette.success.main,
      badge: 'Coming Soon',
      disabled: true,
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
              onClick={() => navigate('/endf-files')}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              <Timeline fontSize="small" />
              ENDF Files
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
            background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
            border: `1px solid ${alpha(theme.palette.secondary.main, 0.1)}`,
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
              background: alpha(theme.palette.secondary.main, 0.1),
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
                  bgcolor: alpha(theme.palette.secondary.main, 0.1),
                  color: theme.palette.secondary.main,
                }}
              >
                <Timeline sx={{ fontSize: 36 }} />
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
                    label="ENDF"
                    size="small"
                    sx={{
                      bgcolor: alpha(theme.palette.secondary.main, 0.1),
                      color: theme.palette.secondary.main,
                      fontWeight: 600,
                    }}
                  />
                </Box>

                {metadata && (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    {metadata.isotope && (
                      <Chip
                        icon={<Category />}
                        label={metadata.isotope}
                        size="small"
                        variant="outlined"
                      />
                    )}
                    {metadata.mat && (
                      <Chip
                        icon={<DataObject />}
                        label={`MAT: ${metadata.mat}`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                    {metadata.zaid && (
                      <Chip
                        label={`ZAID: ${metadata.zaid}`}
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
                  onClick={() => navigate('/endf-files')}
                >
                  Back
                </Button>
                {dataSections.length > 0 && (
                  <Button
                    variant="contained"
                    startIcon={<Visibility />}
                    onClick={() => navigate('/endf-files/plotter')}
                  >
                    Open Plotter
                  </Button>
                )}
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
                  <InfoItem label="Isotope" value={metadata.isotope || 'N/A'} icon={<Category sx={{ fontSize: 18 }} />} />
                  <InfoItem label="ZAID" value={metadata.zaid || 'N/A'} icon={<DataObject sx={{ fontSize: 18 }} />} copyable />
                  <InfoItem label="MAT Number" value={metadata.mat || 'N/A'} />
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Available Data
                  </Typography>
                  <Divider sx={{ mb: 1 }} />
                  <InfoItem label="Has MF4 (Angular)" value={metadata.has_mf4 ? 'Yes' : 'No'} />
                  <InfoItem label="Has MF34 (Covariances)" value={metadata.has_mf34 ? 'Yes' : 'No'} />
                  <InfoItem label="File Size" value={`${(file.size / 1024).toFixed(1)} KB`} />
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Available MT Reactions
                  </Typography>
                  <Divider sx={{ mb: 1 }} />
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight: 100, overflow: 'auto' }}>
                    {metadata.angular_mts?.slice(0, 15).map((mt: number) => (
                      <Chip
                        key={mt}
                        label={`MT${mt}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    ))}
                    {metadata.angular_mts && metadata.angular_mts.length > 15 && (
                      <Chip
                        label={`+${metadata.angular_mts.length - 15} more`}
                        size="small"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    )}
                    {(!metadata.angular_mts || metadata.angular_mts.length === 0) && (
                      <Typography variant="body2" color="text.secondary">
                        No angular MT reactions
                      </Typography>
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
          
          {dataSections.length === 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              No supported data sections found in this file. The file may not contain MF4 or MF34 data.
            </Alert>
          )}

          <Grid container spacing={2}>
            {dataSections.map((section, index) => (
              <Grid item xs={12} sm={6} md={4} key={section.title}>
                <DataSection {...section} delay={index * 50} />
              </Grid>
            ))}
            {futureSections.map((section, index) => (
              <Grid item xs={12} sm={6} md={4} key={section.title}>
                <DataSection 
                  {...section} 
                  onClick={() => {}} 
                  delay={(dataSections.length + index) * 50} 
                />
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
