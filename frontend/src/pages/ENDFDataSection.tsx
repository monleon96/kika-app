import React from 'react';
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
  Timeline,
  NavigateNext,
  ScatterPlot,
  GridOn,
  Functions,
  Science,
  TrendingUp,
  BubbleChart,
  Construction,
} from '@mui/icons-material';
import { useFileWorkspace } from '../contexts/FileWorkspaceContext';
import type { ENDFMetadata, WorkspaceFile } from '../types/file';

// Type guard for ENDF metadata
const isENDFMetadata = (metadata?: WorkspaceFile['metadata']): metadata is ENDFMetadata => {
  return Boolean(metadata && 'angular_mts' in metadata);
};

// Get section info based on section type
const getSectionInfo = (section: string): {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  fullName: string;
} => {
  switch (section) {
    case 'mf3':
      return {
        title: 'MF3: Cross Sections',
        description: 'Reaction cross sections as a function of incident energy',
        icon: <ScatterPlot />,
        color: '#2196f3',
        fullName: 'Cross Section Data (MF3)',
      };
    case 'mf4':
      return {
        title: 'MF4: Angular Distributions',
        description: 'Angular distributions of secondary particles',
        icon: <GridOn />,
        color: '#4caf50',
        fullName: 'Angular Distribution Data (MF4)',
      };
    case 'mf5':
      return {
        title: 'MF5: Energy Distributions',
        description: 'Energy distributions of secondary particles',
        icon: <TrendingUp />,
        color: '#ff9800',
        fullName: 'Energy Distribution Data (MF5)',
      };
    case 'mf6':
      return {
        title: 'MF6: Product Data',
        description: 'Energy-angle distributions for product particles',
        icon: <BubbleChart />,
        color: '#9c27b0',
        fullName: 'Product Energy-Angle Data (MF6)',
      };
    case 'mf33':
      return {
        title: 'MF33: Cross Section Covariances',
        description: 'Covariance matrices for cross section uncertainties',
        icon: <Functions />,
        color: '#f44336',
        fullName: 'Cross Section Covariance Data (MF33)',
      };
    case 'mf34':
      return {
        title: 'MF34: Angular Covariances',
        description: 'Covariance data for angular distribution uncertainties',
        icon: <Science />,
        color: '#00bcd4',
        fullName: 'Angular Distribution Covariance Data (MF34)',
      };
    default:
      return {
        title: `Section: ${section.toUpperCase()}`,
        description: 'Nuclear data section',
        icon: <Timeline />,
        color: '#607d8b',
        fullName: `Data Section (${section.toUpperCase()})`,
      };
  }
};

export const ENDFDataSection: React.FC = () => {
  const { fileId, section } = useParams<{ fileId: string; section: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { files } = useFileWorkspace();

  const file = files.find(f => f.id === fileId);
  const metadata = file && isENDFMetadata(file.metadata) ? file.metadata : null;
  const sectionInfo = getSectionInfo(section || '');

  if (!file) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          File not found. Please go back to the ENDF Files.
        </Alert>
        <Button
          sx={{ mt: 2 }}
          variant="contained"
          onClick={() => navigate('/endf-files')}
        >
          Back to ENDF Files
        </Button>
      </Box>
    );
  }

  // Get available MTs for this section
  const getAvailableMTs = (): number[] => {
    if (!metadata) return [];
    
    switch (section) {
      case 'mf4':
        return metadata.angular_mts || [];
      case 'mf34':
        return metadata.uncertainty_mts || [];
      // MF3, MF5, MF6, MF33 data not yet exposed in metadata
      // Will need backend updates to expose these
      default:
        return [];
    }
  };

  const availableMTs = getAvailableMTs();

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
            <Link
              component="button"
              underline="hover"
              color="inherit"
              onClick={() => navigate(`/endf-files/${fileId}`)}
            >
              {file.displayName}
            </Link>
            <Typography color="text.primary" fontWeight={500}>
              {sectionInfo.title.split(':')[0]}
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
            background: `linear-gradient(135deg, ${alpha(sectionInfo.color, 0.15)} 0%, ${alpha(sectionInfo.color, 0.05)} 100%)`,
            border: `1px solid ${alpha(sectionInfo.color, 0.2)}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: alpha(sectionInfo.color, 0.1),
                  color: sectionInfo.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {React.cloneElement(sectionInfo.icon as React.ReactElement, { sx: { fontSize: 40 } })}
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={700} gutterBottom>
                  {sectionInfo.title}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                  {sectionInfo.description}
                </Typography>
                <Chip
                  label={file.displayName}
                  size="small"
                  sx={{
                    bgcolor: alpha(theme.palette.common.white, 0.8),
                    fontWeight: 500,
                  }}
                />
              </Box>
            </Box>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => navigate(`/endf-files/${fileId}`)}
            >
              Back to File
            </Button>
          </Box>
        </Paper>
      </Fade>

      {/* Under Construction Notice */}
      <Grow in timeout={500}>
        <Alert
          severity="info"
          icon={<Construction />}
          sx={{
            mb: 4,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.info.main, 0.05),
            border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
          }}
        >
          <Typography variant="body2">
            <strong>Feature in Development:</strong> Detailed data exploration for this section is under construction.
            Currently showing available MT reactions.
          </Typography>
        </Alert>
      </Grow>

      {/* Available MTs Table */}
      {availableMTs.length > 0 && (
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
                MT numbers and their descriptions for this data file
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>MT Number</TableCell>
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
                      }}
                    >
                      <TableCell>
                        <Chip
                          label={`MT ${mt}`}
                          size="small"
                          sx={{
                            bgcolor: alpha(sectionInfo.color, 0.1),
                            color: sectionInfo.color,
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell>{getMTDescription(mt)}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => navigate(`/endf-files/plotter?file=${fileId}&mt=${mt}`)}
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
      {availableMTs.length === 0 && (
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
            <Timeline sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Data Available
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              This file does not contain data for {sectionInfo.fullName}
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate(`/endf-files/${fileId}`)}
            >
              Return to File Overview
            </Button>
          </Paper>
        </Fade>
      )}

      {/* Quick Actions */}
      <Fade in timeout={700}>
        <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<ScatterPlot />}
            onClick={() => navigate(`/endf-files/plotter?file=${fileId}`)}
          >
            Open in Plotter
          </Button>
        </Box>
      </Fade>

      {/* Spacer */}
      <Box sx={{ height: 24 }} />
    </Box>
  );
};
