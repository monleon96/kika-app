import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
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
  Code,
  UploadFile,
  Folder,
  ArrowForward,
  Description,
  Analytics,
  Calculate,
  Lock,
} from '@mui/icons-material';
import { useFileWorkspace } from '../contexts/FileWorkspaceContext';
import type { WorkspaceFile, MCNPInputMetadata, FileType } from '../types/file';
import { FileTypeSelectionDialog } from '../components/FileTypeSelectionDialog';

// Check if running in Tauri
const isTauri = '__TAURI__' in window;

// MCNP Input File Card Component
interface MCNPInputFileCardProps {
  file: WorkspaceFile;
  onClick: () => void;
  delay?: number;
}

const MCNPInputFileCard: React.FC<MCNPInputFileCardProps> = ({ file, onClick, delay = 0 }) => {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);
  
  // Type guard for MCNP Input metadata
  const metadata = file.metadata && 'material_count' in file.metadata 
    ? file.metadata as MCNPInputMetadata 
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
            ? `0 16px 32px ${alpha(theme.palette.info.main, 0.2)}`
            : theme.shadows[2],
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: `linear-gradient(90deg, ${theme.palette.info.main}, ${alpha(theme.palette.info.main, 0.6)})`,
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
                bgcolor: alpha(theme.palette.info.main, 0.1),
                color: theme.palette.info.main,
                transition: 'all 0.3s ease',
                transform: hovered ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              <Code sx={{ fontSize: 24 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={600} noWrap>
                {file.displayName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                MCNP Input
              </Typography>
            </Box>
          </Box>

          {metadata && (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
              <Chip
                label={`${metadata.material_count} materials`}
                size="small"
                sx={{ 
                  bgcolor: alpha(theme.palette.success.main, 0.1),
                  color: theme.palette.success.main,
                  fontSize: '0.7rem',
                  height: 24,
                }}
              />
              {metadata.pert_count > 0 && (
                <Chip
                  label={`${metadata.pert_count} PERT cards`}
                  size="small"
                  sx={{ 
                    bgcolor: alpha(theme.palette.warning.main, 0.1),
                    color: theme.palette.warning.main,
                    fontSize: '0.7rem',
                    height: 24,
                  }}
                />
              )}
            </Box>
          )}

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              color: theme.palette.info.main,
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
          bgcolor: alpha(theme.palette.info.main, 0.1),
          color: theme.palette.info.main,
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

// Upload prompt component with fallback for parse errors
const UploadPrompt: React.FC = () => {
  const theme = useTheme();
  const { addFiles, files, updateFileType, removeFile } = useFileWorkspace();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [failedFile, setFailedFile] = useState<WorkspaceFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processedErrorsRef = useRef<Set<string>>(new Set());

  // Monitor for MCNP Input parse errors to show fallback dialog
  useEffect(() => {
    const errorFiles = files.filter(f => 
      f.type === 'mcnp-input' && 
      f.status === 'error' && 
      f.error &&
      !processedErrorsRef.current.has(f.id)
    );
    
    if (errorFiles.length > 0) {
      const errorFile = errorFiles[0];
      processedErrorsRef.current.add(errorFile.id);
      setFailedFile(errorFile);
      setErrorDialogOpen(true);
    }
  }, [files]);

  // Handle error dialog type selection (try as different type)
  const handleErrorTypeSelect = useCallback(async (type: FileType) => {
    if (failedFile) {
      await updateFileType(failedFile.id, type);
    }
    setErrorDialogOpen(false);
    setFailedFile(null);
  }, [failedFile, updateFileType]);

  // Handle error dialog close (remove the failed file)
  const handleErrorDialogClose = useCallback(() => {
    if (failedFile) {
      removeFile(failedFile.id);
    }
    setErrorDialogOpen(false);
    setFailedFile(null);
  }, [failedFile, removeFile]);

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
      // Directly use 'mcnp-input' type since we're on the MCNP Input page
      await addFiles(filesData, 'mcnp-input');
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

      // Directly use 'mcnp-input' type since we're on the MCNP Input page
      await addFiles(filesData, 'mcnp-input');
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
        bgcolor: dragActive ? alpha(theme.palette.info.main, 0.05) : 'transparent',
        border: '2px dashed',
        borderColor: dragActive ? 'info.main' : alpha(theme.palette.divider, 0.5),
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
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      <Folder sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
      
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Upload MCNP Input Files
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Drag and drop files here or click to browse
      </Typography>

      <Button
        variant="contained"
        color="info"
        startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <UploadFile />}
        onClick={openFileDialog}
        disabled={uploading}
      >
        {uploading ? 'Uploading...' : 'Select Files'}
      </Button>

      {/* Error fallback dialog - shown when parsing fails */}
      <FileTypeSelectionDialog
        open={errorDialogOpen}
        onClose={handleErrorDialogClose}
        onSelect={handleErrorTypeSelect}
        fileCount={1}
        fileNames={failedFile ? [failedFile.name] : []}
        errorMode={failedFile ? {
          failedType: 'mcnp-input',
          errorMessage: failedFile.error || 'Failed to parse file as MCNP input format.',
        } : undefined}
      />
    </Paper>
  );
};

export const MCNPInputFiles: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { getFilesByType } = useFileWorkspace();

  const mcnpInputFiles = useMemo(() => getFilesByType('mcnp-input'), [getFilesByType]);

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
            background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.05)} 0%, ${alpha(theme.palette.info.main, 0.12)} 100%)`,
            position: 'relative',
            overflow: 'hidden',
            border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -80,
              right: -80,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: alpha(theme.palette.info.main, 0.15),
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
              background: alpha(theme.palette.warning.main, 0.1),
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
                  bgcolor: alpha(theme.palette.info.main, 0.15),
                  color: theme.palette.info.main,
                }}
              >
                <Code sx={{ fontSize: 32 }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={700}>
                  MCNP Input Files
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  View and analyze MCNP input decks
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 3 }}>
              <Chip
                icon={<Description sx={{ fontSize: 16 }} />}
                label="Material Definitions"
                variant="outlined"
                sx={{ borderColor: alpha(theme.palette.info.main, 0.3) }}
              />
              <Chip
                icon={<Calculate sx={{ fontSize: 16 }} />}
                label="PERT Cards"
                variant="outlined"
                sx={{ borderColor: alpha(theme.palette.info.main, 0.3) }}
              />
              <Chip
                icon={<Analytics sx={{ fontSize: 16 }} />}
                label="Tally Definitions"
                variant="outlined"
                sx={{ borderColor: alpha(theme.palette.info.main, 0.3) }}
              />
            </Box>
          </Box>
        </Paper>
      </Fade>

      {/* About Section */}
      <Fade in timeout={600}>
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ mb: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}
          >
            About MCNP Input Files
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
                  <strong>MCNP Input Files</strong> define the complete geometry, materials, 
                  sources, and tallies for Monte Carlo neutron transport simulations.
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  KIKA can parse and display material compositions, PERT cards for sensitivity 
                  analysis, and other key elements of your MCNP input decks.
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Feature
                    icon={<Description sx={{ fontSize: 20 }} />}
                    title="Material Viewer"
                    description="View nuclide compositions and densities for each material"
                  />
                  <Feature
                    icon={<Calculate sx={{ fontSize: 20 }} />}
                    title="PERT Card Analysis"
                    description="Examine perturbation cards for sensitivity calculations"
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
              Your MCNP Input Files ({mcnpInputFiles.length})
            </Typography>
          </Box>

          {mcnpInputFiles.length === 0 ? (
            <UploadPrompt />
          ) : (
            <Grid container spacing={2}>
              {mcnpInputFiles.map((file, index) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={file.id}>
                  <MCNPInputFileCard
                    file={file}
                    onClick={() => navigate(`/mcnp-input/${file.id}`)}
                    delay={index * 50}
                  />
                </Grid>
              ))}
              
              {/* Upload more card */}
              <Grid item xs={12} sm={6} md={4} lg={3}>
                <Grow in timeout={400 + mcnpInputFiles.length * 50}>
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
                        borderColor: theme.palette.info.main,
                        bgcolor: alpha(theme.palette.info.main, 0.02),
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

      {/* Sensitivity Analysis Coming Soon */}
      <Fade in timeout={800}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            bgcolor: alpha(theme.palette.warning.main, 0.05),
            border: `1px solid ${alpha(theme.palette.warning.main, 0.1)}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Lock sx={{ color: theme.palette.warning.main }} />
            <Typography variant="h6" fontWeight={600}>
              Sensitivity Analysis
            </Typography>
            <Chip label="Coming Soon" size="small" color="warning" />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Prepare MCNP input files for sensitivity analysis by generating PERT cards 
            with specific nuclides, reactions, and energy groups. Combine with MCTAL 
            results to compute and visualize sensitivity coefficients.
          </Typography>
        </Paper>
      </Fade>

      {/* Spacer */}
      <Box sx={{ height: 24 }} />
    </Box>
  );
};
