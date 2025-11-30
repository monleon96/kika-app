import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Box,
  Paper,
  Card,
  CardActionArea,
  Button,
  Chip,
  CircularProgress,
  alpha,
  useTheme,
  Fade,
  Grow,
  Grid,
} from '@mui/material';
import {
  Science,
  ShowChart,
  UploadFile,
  Folder,
  ArrowForward,
  Info,
  Speed,
  Compare,
  Download,
  Thermostat,
} from '@mui/icons-material';
import { useFileWorkspace } from '../contexts/FileWorkspaceContext';
import type { WorkspaceFile, ACEMetadata } from '../types/file';

// Check if running in Tauri
const isTauri = '__TAURI__' in window;

// ACE File Card Component
interface ACEFileCardProps {
  file: WorkspaceFile;
  onClick: () => void;
  delay?: number;
}

const ACEFileCard: React.FC<ACEFileCardProps> = ({ file, onClick, delay = 0 }) => {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);
  
  // Type guard for ACE metadata
  const metadata = file.metadata && 'atomic_weight_ratio' in file.metadata 
    ? file.metadata as ACEMetadata 
    : null;

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
          transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
          boxShadow: hovered
            ? `0 16px 32px ${alpha(theme.palette.primary.main, 0.2)}`
            : theme.shadows[2],
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${alpha(theme.palette.primary.main, 0.6)})`,
            borderRadius: '12px 12px 0 0',
          },
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <CardActionArea
          onClick={onClick}
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            p: 2.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, width: '100%', mb: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                transition: 'all 0.3s ease',
                transform: hovered ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              <Science sx={{ fontSize: 24 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={600} noWrap>
                {file.displayName}
              </Typography>
              {metadata && (
                <Typography variant="caption" color="text.secondary">
                  ZAID: {metadata.zaid}
                </Typography>
              )}
            </Box>
          </Box>

          {metadata && (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
              <Chip
                icon={<Thermostat sx={{ fontSize: 14 }} />}
                label={`${metadata.temperature?.toFixed(1)} K`}
                size="small"
                sx={{ 
                  bgcolor: alpha(theme.palette.info.main, 0.1),
                  color: theme.palette.info.main,
                  fontSize: '0.7rem',
                  height: 24,
                }}
              />
              <Chip
                label={`${metadata.available_reactions?.length || 0} reactions`}
                size="small"
                sx={{ 
                  bgcolor: alpha(theme.palette.success.main, 0.1),
                  color: theme.palette.success.main,
                  fontSize: '0.7rem',
                  height: 24,
                }}
              />
            </Box>
          )}

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              color: theme.palette.primary.main,
              fontWeight: 500,
              fontSize: '0.875rem',
              mt: 'auto',
              transition: 'gap 0.2s ease',
              gap: hovered ? 1.5 : 1,
            }}
          >
            Explore File <ArrowForward sx={{ fontSize: 18 }} />
          </Box>
        </CardActionArea>
      </Card>
    </Grow>
  );
};

// Feature highlight component
interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const Feature: React.FC<FeatureProps> = ({ icon, title, description }) => {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          color: theme.palette.primary.main,
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="subtitle2" fontWeight={600}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Box>
    </Box>
  );
};

// Upload prompt component
const UploadPrompt: React.FC = () => {
  const theme = useTheme();
  const { addFiles } = useFileWorkspace();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (fileList: FileList) => {
    setUploading(true);
    try {
      const filesArray = Array.from(fileList);
      const filesData = await Promise.all(
        filesArray.map(async file => ({
          name: file.name,
          path: file.name,
          content: await file.text(),
        }))
      );
      await addFiles(filesData);
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setUploading(false);
    }
  }, [addFiles]);

  const handleTauriFileSelect = useCallback(async () => {
    setUploading(true);
    try {
      const { open: openDialog } = await import('@tauri-apps/api/dialog');
      const { readTextFile } = await import('@tauri-apps/api/fs');

      const selected = await openDialog({
        multiple: true,
        filters: [{ name: 'ACE Files', extensions: ['ace', '02c', '03c', '20c', '21c', '70c', '80c'] }],
      });

      if (!selected || !Array.isArray(selected) || selected.length === 0) {
        setUploading(false);
        return;
      }

      const filesData = await Promise.all(
        selected.map(async (filePath: string) => {
          const fileName = filePath.split(/[\\/]/).pop() || 'unknown';
          const content = await readTextFile(filePath);
          return { name: fileName, path: filePath, content };
        })
      );

      await addFiles(filesData);
    } catch (error) {
      console.error('Error selecting files:', error);
    } finally {
      setUploading(false);
    }
  }, [addFiles]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const openFileDialog = useCallback(() => {
    if (isTauri) {
      handleTauriFileSelect();
    } else {
      fileInputRef.current?.click();
    }
  }, [handleTauriFileSelect]);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        textAlign: 'center',
        bgcolor: dragActive ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
        border: '2px dashed',
        borderColor: dragActive ? 'primary.main' : alpha(theme.palette.divider, 0.5),
        borderRadius: 3,
        transition: 'all 0.2s ease',
      }}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".ace,.02c,.03c,.20c,.21c,.70c,.80c"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      <Folder sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
      
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Upload ACE Files
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Drag and drop files here or click to browse
      </Typography>

      <Button
        variant="contained"
        startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <UploadFile />}
        onClick={openFileDialog}
        disabled={uploading}
      >
        {uploading ? 'Uploading...' : 'Select Files'}
      </Button>

      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 2 }}>
        Supported: .ace, .02c, .03c, .20c, .21c, .70c, .80c
      </Typography>
    </Paper>
  );
};

export const ACEFiles: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { getFilesByType } = useFileWorkspace();

  const aceFiles = useMemo(() => getFilesByType('ace'), [getFilesByType]);

  return (
    <Box sx={{ width: '100%', minHeight: '100%' }}>
      {/* Hero Section */}
      <Fade in timeout={500}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            mb: 4,
            borderRadius: 4,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0.12)} 100%)`,
            position: 'relative',
            overflow: 'hidden',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -80,
              right: -80,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: alpha(theme.palette.primary.main, 0.15),
              filter: 'blur(50px)',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: -60,
              left: -60,
              width: 150,
              height: 150,
              borderRadius: '50%',
              background: alpha(theme.palette.secondary.main, 0.1),
              filter: 'blur(40px)',
            },
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: alpha(theme.palette.primary.main, 0.15),
                  color: theme.palette.primary.main,
                }}
              >
                <Science sx={{ fontSize: 32 }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={700}>
                  ACE Files
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Explore and visualize ACE format nuclear data files
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 3 }}>
              <Chip
                icon={<Info sx={{ fontSize: 16 }} />}
                label="Interactive Plots"
                variant="outlined"
                sx={{ borderColor: alpha(theme.palette.primary.main, 0.3) }}
              />
              <Chip
                icon={<Compare sx={{ fontSize: 16 }} />}
                label="Multi-file Comparison"
                variant="outlined"
                sx={{ borderColor: alpha(theme.palette.primary.main, 0.3) }}
              />
              <Chip
                icon={<Download sx={{ fontSize: 16 }} />}
                label="Export Ready"
                variant="outlined"
                sx={{ borderColor: alpha(theme.palette.primary.main, 0.3) }}
              />
            </Box>
          </Box>
        </Paper>
      </Fade>

      {/* About ACE Section */}
      <Fade in timeout={600}>
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ mb: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}
          >
            About ACE Format
          </Typography>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
            }}
          >
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Typography variant="body1" paragraph>
                  <strong>ACE (A Compact ENDF)</strong> is a processed nuclear data format optimized for 
                  Monte Carlo particle transport codes like MCNP, Serpent, and OpenMC.
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  ACE files contain pre-processed cross-section data, angular distributions, energy spectra, 
                  and other nuclear reaction information in a format designed for fast lookup during transport calculations.
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label="ENDF/B-VIII.0" size="small" />
                  <Chip label="JEFF-3.3" size="small" />
                  <Chip label="JENDL-5" size="small" />
                  <Chip label="TENDL-2021" size="small" />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Feature
                    icon={<ShowChart sx={{ fontSize: 20 }} />}
                    title="Cross-Section Visualization"
                    description="Plot reaction cross-sections vs energy with interactive zoom and comparison"
                  />
                  <Feature
                    icon={<Speed sx={{ fontSize: 20 }} />}
                    title="Fast Data Access"
                    description="Optimized file parsing for quick loading and visualization"
                  />
                  <Feature
                    icon={<Compare sx={{ fontSize: 20 }} />}
                    title="Library Comparison"
                    description="Compare data from different nuclear data libraries side by side"
                  />
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Box>
      </Fade>

      {/* Your Files Section */}
      <Fade in timeout={700}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}
            >
              Your ACE Files ({aceFiles.length})
            </Typography>
            {aceFiles.length > 0 && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<ShowChart />}
                onClick={() => navigate('/ace-files/plotter')}
              >
                Open Plotter
              </Button>
            )}
          </Box>

          {aceFiles.length === 0 ? (
            <UploadPrompt />
          ) : (
            <Grid container spacing={2}>
              {aceFiles.map((file, index) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={file.id}>
                  <ACEFileCard
                    file={file}
                    onClick={() => navigate(`/ace-files/${file.id}`)}
                    delay={index * 50}
                  />
                </Grid>
              ))}
              
              {/* Upload more card */}
              <Grid item xs={12} sm={6} md={4} lg={3}>
                <Grow in timeout={400 + aceFiles.length * 50}>
                  <Card
                    sx={{
                      height: '100%',
                      minHeight: 180,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px dashed',
                      borderColor: alpha(theme.palette.divider, 0.5),
                      bgcolor: 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: theme.palette.primary.main,
                        bgcolor: alpha(theme.palette.primary.main, 0.02),
                      },
                    }}
                    onClick={() => navigate('/files')}
                  >
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <UploadFile sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        Add More Files
                      </Typography>
                    </Box>
                  </Card>
                </Grow>
              </Grid>
            </Grid>
          )}
        </Box>
      </Fade>

      {/* Quick Start Guide */}
      <Fade in timeout={800}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            bgcolor: alpha(theme.palette.info.main, 0.05),
            border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
          }}
        >
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Getting Started
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    bgcolor: theme.palette.primary.main,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    flexShrink: 0,
                  }}
                >
                  1
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>
                    Upload Files
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Drag and drop ACE files or use the file manager
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    bgcolor: theme.palette.primary.main,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    flexShrink: 0,
                  }}
                >
                  2
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>
                    Select a File
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Click on a file card to explore its contents
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    bgcolor: theme.palette.primary.main,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    flexShrink: 0,
                  }}
                >
                  3
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>
                    Visualize Data
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Use the plotter to create interactive cross-section plots
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Fade>

      {/* Spacer */}
      <Box sx={{ height: 24 }} />
    </Box>
  );
};
