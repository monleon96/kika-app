import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Breadcrumbs,
  Link,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  alpha,
  useTheme,
  Fade,
  Grow,
} from '@mui/material';
import {
  ArrowBack,
  Science,
  NavigateNext,
  ShowChart,
  ScatterPlot,
  Timeline,
  Functions,
  Speed,
  TableChart,
  Construction,
} from '@mui/icons-material';
import { useFileWorkspace } from '../contexts/FileWorkspaceContext';
import type { ACEMetadata } from '../types/file';

type SectionType = 'cross-sections' | 'angular' | 'energy' | 'nubar' | 'delayed' | 'raw';

interface SectionConfig {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  fullName: string;
  implemented: boolean;
}

const getSectionConfig = (section: SectionType, theme: any): SectionConfig => {
  const configs: Record<SectionType, SectionConfig> = {
    'cross-sections': {
      title: 'Cross Sections',
      description: 'Reaction cross-sections as a function of incident energy for all available MT reactions.',
      icon: <ShowChart />,
      color: theme.palette.primary.main,
      fullName: 'Cross Section Data',
      implemented: true,
    },
    'angular': {
      title: 'Angular Distributions',
      description: 'Scattering angular distributions with energy-dependent coefficients.',
      icon: <ScatterPlot />,
      color: theme.palette.secondary.main,
      fullName: 'Angular Distribution Data',
      implemented: true,
    },
    'energy': {
      title: 'Energy Distributions',
      description: 'Secondary particle energy spectra and emission distributions.',
      icon: <Timeline />,
      color: theme.palette.warning.main,
      fullName: 'Energy Distribution Data',
      implemented: false,
    },
    'nubar': {
      title: 'Nu-bar Data',
      description: 'Fission neutron multiplicity data (ν̄) for fissile isotopes.',
      icon: <Functions />,
      color: theme.palette.info.main,
      fullName: 'Fission Multiplicity Data',
      implemented: false,
    },
    'delayed': {
      title: 'Delayed Neutrons',
      description: 'Delayed neutron precursor groups and decay constants.',
      icon: <Speed />,
      color: theme.palette.success.main,
      fullName: 'Delayed Neutron Data',
      implemented: false,
    },
    'raw': {
      title: 'Raw Data Tables',
      description: 'Access raw ACE data blocks and arrays for detailed analysis.',
      icon: <TableChart />,
      color: theme.palette.grey[600],
      fullName: 'Raw ACE Data',
      implemented: false,
    },
  };
  return configs[section] || configs['cross-sections'];
};

// MT descriptions for common reactions
const getMTDescription = (mt: number): string => {
  const descriptions: Record<number, string> = {
    1: 'Total cross section',
    2: 'Elastic scattering',
    4: 'Total inelastic',
    16: '(n,2n)',
    17: '(n,3n)',
    18: 'Total fission',
    19: '(n,f) First-chance fission',
    20: '(n,nf) Second-chance fission',
    21: '(n,2nf) Third-chance fission',
    22: '(n,nα)',
    28: '(n,np)',
    51: "(n,n') 1st excited",
    52: "(n,n') 2nd excited",
    53: "(n,n') 3rd excited",
    54: "(n,n') 4th excited",
    55: "(n,n') 5th excited",
    91: "(n,n') continuum",
    102: '(n,γ) Radiative capture',
    103: '(n,p)',
    104: '(n,d)',
    105: '(n,t)',
    106: '(n,³He)',
    107: '(n,α)',
    452: 'Total nubar',
    455: 'Delayed nubar',
    456: 'Prompt nubar',
  };
  return descriptions[mt] || `Reaction MT=${mt}`;
};

export const ACEDataSection: React.FC = () => {
  const { fileId, section } = useParams<{ fileId: string; section: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { files } = useFileWorkspace();

  const file = useMemo(() => {
    return files.find(f => f.id === fileId && f.type === 'ace');
  }, [files, fileId]);

  const metadata: ACEMetadata | null = useMemo(() => {
    if (file?.metadata && 'atomic_weight_ratio' in file.metadata) {
      return file.metadata as ACEMetadata;
    }
    return null;
  }, [file]);

  const sectionType = (section || 'cross-sections') as SectionType;
  const config = getSectionConfig(sectionType, theme);

  // Get available MTs based on section type
  const getAvailableMTs = (): number[] => {
    if (!metadata?.available_reactions) return [];
    
    switch (sectionType) {
      case 'cross-sections':
        // All available reactions have cross-section data
        return metadata.available_reactions;
      case 'angular':
        // For angular distributions, typically elastic (2) and inelastic reactions
        // Filter to show reactions that commonly have angular data
        return metadata.available_reactions.filter(mt => 
          mt === 2 || (mt >= 51 && mt <= 91) || mt === 4
        );
      default:
        return [];
    }
  };

  const availableMTs = getAvailableMTs();

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
            <Link
              component="button"
              underline="hover"
              color="inherit"
              onClick={() => navigate(`/ace-files/${fileId}`)}
            >
              {file.displayName}
            </Link>
            <Typography color="text.primary" fontWeight={500}>
              {config.title}
            </Typography>
          </Breadcrumbs>
        </Box>
      </Fade>

      {/* Section Header */}
      <Fade in timeout={400}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            mb: 4,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${alpha(config.color, 0.15)} 0%, ${alpha(config.color, 0.05)} 100%)`,
            border: `1px solid ${alpha(config.color, 0.2)}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: alpha(config.color, 0.1),
                  color: config.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {React.cloneElement(config.icon as React.ReactElement, { sx: { fontSize: 40 } })}
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={700} gutterBottom>
                  {config.title}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                  {config.description}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={file.displayName}
                    size="small"
                    sx={{
                      bgcolor: alpha(theme.palette.common.white, 0.8),
                      fontWeight: 500,
                    }}
                  />
                  {metadata?.zaid && (
                    <Chip
                      label={`ZAID: ${metadata.zaid}`}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 500 }}
                    />
                  )}
                  {metadata?.temperature && (
                    <Chip
                      label={`${metadata.temperature.toFixed(1)} K`}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 500 }}
                    />
                  )}
                </Box>
              </Box>
            </Box>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => navigate(`/ace-files/${fileId}`)}
            >
              Back to File
            </Button>
          </Box>
        </Paper>
      </Fade>

      {/* Feature Status Notice */}
      {!config.implemented && (
        <Grow in timeout={500}>
          <Alert
            severity="warning"
            icon={<Construction />}
            sx={{
              mb: 4,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.warning.main, 0.05),
              border: `1px solid ${alpha(theme.palette.warning.main, 0.1)}`,
            }}
          >
            <Typography variant="body2">
              <strong>Coming Soon:</strong> Detailed data exploration for {config.fullName} is under development.
            </Typography>
          </Alert>
        </Grow>
      )}

      {config.implemented && (
        <Grow in timeout={500}>
          <Alert
            severity="info"
            sx={{
              mb: 4,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.info.main, 0.05),
              border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
            }}
          >
            <Typography variant="body2">
              <strong>Data Exploration:</strong> Browse available reactions below. Click "View in Plotter" to visualize the data.
            </Typography>
          </Alert>
        </Grow>
      )}

      {/* Available MTs Table */}
      {config.implemented && availableMTs.length > 0 && (
        <Fade in timeout={600}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
              overflow: 'hidden',
            }}
          >
            <Box sx={{ p: 3, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}>
              <Typography variant="h6" fontWeight={600}>
                Available Reactions ({availableMTs.length})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                MT numbers and their descriptions for {config.fullName.toLowerCase()}
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, width: 120 }}>MT Number</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {availableMTs.map((mt, index) => (
                    <TableRow
                      key={mt}
                      sx={{
                        '&:last-child td': { border: 0 },
                        bgcolor: index % 2 === 0 ? 'transparent' : alpha(theme.palette.grey[500], 0.02),
                        '&:hover': {
                          bgcolor: alpha(config.color, 0.05),
                        },
                      }}
                    >
                      <TableCell>
                        <Chip
                          label={`MT ${mt}`}
                          size="small"
                          sx={{
                            bgcolor: alpha(config.color, 0.1),
                            color: config.color,
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell>{getMTDescription(mt)}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => navigate('/ace-files/plotter')}
                        >
                          View in Plotter
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Fade>
      )}

      {/* No Data Message */}
      {config.implemented && availableMTs.length === 0 && (
        <Fade in timeout={600}>
          <Paper
            elevation={0}
            sx={{
              p: 6,
              textAlign: 'center',
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
            }}
          >
            <Science sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Data Available
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              This file does not contain data for {config.fullName}
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate(`/ace-files/${fileId}`)}
            >
              Return to File Overview
            </Button>
          </Paper>
        </Fade>
      )}

      {/* Coming Soon Content */}
      {!config.implemented && (
        <Fade in timeout={600}>
          <Paper
            elevation={0}
            sx={{
              p: 6,
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
              textAlign: 'center',
              bgcolor: alpha(theme.palette.warning.main, 0.02),
            }}
          >
            <Construction sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h5" fontWeight={600} gutterBottom>
              {config.title} - Coming Soon
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}>
              {config.description}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This feature is currently under development. Check back soon for updates!
            </Typography>
            <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                onClick={() => navigate(`/ace-files/${fileId}/cross-sections`)}
              >
                View Cross Sections Instead
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate(`/ace-files/${fileId}`)}
              >
                Back to File Overview
              </Button>
            </Box>
          </Paper>
        </Fade>
      )}

      {/* Quick Actions */}
      {config.implemented && availableMTs.length > 0 && (
        <Fade in timeout={700}>
          <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<ShowChart />}
              onClick={() => navigate('/ace-files/plotter')}
            >
              Open in Plotter
            </Button>
          </Box>
        </Fade>
      )}

      {/* Spacer */}
      <Box sx={{ height: 24 }} />
    </Box>
  );
};
