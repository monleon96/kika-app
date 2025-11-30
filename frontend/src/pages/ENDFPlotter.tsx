import React, { useMemo, useRef, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Breadcrumbs,
  Link,
  CircularProgress,
  Alert,
  alpha,
  useTheme,
  Fade,
  Chip,
  Grow,
} from '@mui/material';
import {
  ArrowBack,
  Timeline,
  NavigateNext,
  UploadFile,
  Folder,
  ShowChart,
  Insights,
  Warning,
} from '@mui/icons-material';
import { ENDFPlotViewer, type LoadedENDFFile } from '../components/ENDFPlotViewer';
import { useFileWorkspace } from '../contexts/FileWorkspaceContext';
import type { ENDFMetadata, WorkspaceFile } from '../types/file';

// Check if running in Tauri
const isTauri = '__TAURI__' in window;

// Type guard for ENDF metadata
const isENDFMetadata = (metadata?: WorkspaceFile['metadata']): metadata is ENDFMetadata => {
  return Boolean(metadata && 'angular_mts' in metadata);
};

// File upload prompt component for when no files are loaded
const FileUploadPrompt: React.FC = () => {
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
        filters: [
          {
            name: 'ENDF Files',
            extensions: ['endf', 'endf6', 'txt', 'dat', 'tendl'],
          },
        ],
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
        p: 8,
        textAlign: 'center',
        bgcolor: dragActive ? alpha(theme.palette.secondary.main, 0.08) : alpha(theme.palette.background.default, 0.5),
        border: '2px dashed',
        borderColor: dragActive ? 'secondary.main' : alpha(theme.palette.divider, 0.3),
        borderRadius: 4,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: dragActive ? 'scale(1.01)' : 'scale(1)',
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
        accept=".endf,.endf6,.txt,.dat"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: alpha(theme.palette.secondary.main, 0.1),
          color: theme.palette.secondary.main,
          mx: 'auto',
          mb: 3,
        }}
      >
        <Folder sx={{ fontSize: 40 }} />
      </Box>
      
      <Typography variant="h5" fontWeight={600} gutterBottom>
        No ENDF Files Loaded
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
        Upload ENDF files to start visualizing angular distribution data and create publication-quality plots
      </Typography>

      <Button
        variant="contained"
        color="secondary"
        size="large"
        startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <UploadFile />}
        onClick={openFileDialog}
        disabled={uploading}
        sx={{ 
          px: 4,
          py: 1.5,
          borderRadius: 2,
          boxShadow: `0 4px 14px ${alpha(theme.palette.secondary.main, 0.3)}`,
        }}
      >
        {uploading ? 'Uploading...' : 'Upload ENDF Files'}
      </Button>

      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 4 }}>
        Supported formats: .endf, .endf6, .txt, .dat • Drag and drop supported
      </Typography>
    </Paper>
  );
};

export const ENDFPlotter: React.FC = () => {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { files, getFilesByType, updateFileContent } = useFileWorkspace();
  const [reuploadingFileId, setReuploadingFileId] = useState<string | null>(null);
  const reuploadInputRef = useRef<HTMLInputElement>(null);

  // Get the specific file if fileId is provided, otherwise get all ENDF files
  const loadedFiles: LoadedENDFFile[] = useMemo(() => {
    let endfFiles;
    
    if (fileId) {
      // If we have a specific file, prioritize it but include others
      const specificFile = files.find(f => f.id === fileId && f.type === 'endf' && f.status === 'ready');
      const otherFiles = files.filter(f => f.id !== fileId && f.type === 'endf' && f.status === 'ready');
      endfFiles = specificFile ? [specificFile, ...otherFiles] : otherFiles;
    } else {
      endfFiles = getFilesByType('endf');
    }

    return endfFiles
      .filter(file => isENDFMetadata(file.metadata))
      .map(file => ({
        id: file.id,
        name: file.displayName || file.name,
        path: file.path,
        content: file.content,
        metadata: file.metadata as ENDFMetadata,
        needsReupload: !file.content || file.content.trim() === '',
      }));
  }, [files, fileId, getFilesByType]);

  const specificFile = fileId ? files.find(f => f.id === fileId) : null;

  // Count files that need re-upload
  const filesNeedingReupload = useMemo(() => 
    loadedFiles.filter(f => f.needsReupload),
    [loadedFiles]
  );

  // Handle re-upload of a specific file
  const handleReupload = useCallback(async (targetFileId: string) => {
    setReuploadingFileId(targetFileId);
    
    if (isTauri) {
      try {
        const { open: openDialog } = await import('@tauri-apps/api/dialog');
        const { readTextFile } = await import('@tauri-apps/api/fs');
        
        const selected = await openDialog({
          multiple: false,
          filters: [
            {
              name: 'ENDF Files',
              extensions: ['endf', 'endf6', 'txt', 'dat', 'tendl'],
            },
          ],
        });
        
        if (selected && typeof selected === 'string') {
          const content = await readTextFile(selected);
          await updateFileContent(targetFileId, content);
        }
        setReuploadingFileId(null);
      } catch (error) {
        console.error('Error re-uploading file:', error);
        setReuploadingFileId(null);
      }
    } else {
      // For web version, just trigger the file input - don't clear reuploadingFileId yet
      // It will be cleared in handleReuploadChange after file is processed
      reuploadInputRef.current?.click();
    }
  }, [updateFileContent]);

  const handleReuploadChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && reuploadingFileId) {
      try {
        const content = await file.text();
        await updateFileContent(reuploadingFileId, content);
      } catch (error) {
        console.error('Error reading file:', error);
      }
    }
    setReuploadingFileId(null);
    if (reuploadInputRef.current) {
      reuploadInputRef.current.value = '';
    }
  }, [reuploadingFileId, updateFileContent]);

  return (
    <Box sx={{ width: '100%', minHeight: '100%' }}>
      {/* Hidden file input for re-upload */}
      <input
        type="file"
        ref={reuploadInputRef}
        style={{ display: 'none' }}
        accept=".endf,.endf6,.txt,.dat,.tendl"
        onChange={handleReuploadChange}
      />
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
            {specificFile && (
              <Link
                component="button"
                underline="hover"
                color="inherit"
                onClick={() => navigate(`/endf-files/${fileId}`)}
              >
                {specificFile.displayName}
              </Link>
            )}
            <Typography color="text.primary" fontWeight={500}>
              Plotter
            </Typography>
          </Breadcrumbs>
        </Box>
      </Fade>

      {/* Hero Header Section */}
      <Fade in timeout={400}>
        <Paper
          elevation={0}
          sx={{
            mb: 4,
            p: 4,
            borderRadius: 4,
            background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.secondary.main, 0.15)}`,
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: `linear-gradient(90deg, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`,
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
              <Grow in timeout={500}>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(theme.palette.secondary.main, 0.15),
                    color: theme.palette.secondary.main,
                  }}
                >
                  <Insights sx={{ fontSize: 32 }} />
                </Box>
              </Grow>
              <Box>
                <Typography variant="h4" fontWeight={700} gutterBottom sx={{ mb: 0.5 }}>
                  ENDF Plotter
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500 }}>
                  {specificFile 
                    ? `Visualizing angular distribution data from ${specificFile.displayName}`
                    : 'Create publication-quality plots of angular distributions with full customization'
                  }
                </Typography>
                {loadedFiles.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                    <Chip
                      icon={<ShowChart sx={{ fontSize: 16 }} />}
                      label={`${loadedFiles.length} file${loadedFiles.length !== 1 ? 's' : ''} loaded`}
                      size="small"
                      sx={{
                        bgcolor: alpha(theme.palette.success.main, 0.1),
                        color: theme.palette.success.main,
                        fontWeight: 500,
                      }}
                    />
                    {loadedFiles.some(f => f.metadata?.has_mf34) && (
                      <Chip
                        label="MF34 Available"
                        size="small"
                        sx={{
                          bgcolor: alpha(theme.palette.info.main, 0.1),
                          color: theme.palette.info.main,
                          fontWeight: 500,
                        }}
                      />
                    )}
                    {filesNeedingReupload.length > 0 && (
                      <Chip
                        icon={<Warning sx={{ fontSize: 16 }} />}
                        label={`${filesNeedingReupload.length} file${filesNeedingReupload.length !== 1 ? 's' : ''} need re-upload`}
                        size="small"
                        sx={{
                          bgcolor: alpha(theme.palette.warning.main, 0.1),
                          color: theme.palette.warning.main,
                          fontWeight: 500,
                        }}
                      />
                    )}
                  </Box>
                )}
              </Box>
            </Box>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => specificFile ? navigate(`/endf-files/${fileId}`) : navigate('/endf-files')}
              sx={{ 
                borderRadius: 2,
                px: 3,
              }}
            >
              Back
            </Button>
          </Box>
        </Paper>
      </Fade>

      {/* Main Content */}
      <Fade in timeout={500}>
        <Box>
          {loadedFiles.length === 0 ? (
            <FileUploadPrompt />
          ) : (
            <ENDFPlotViewer files={loadedFiles} onReuploadFile={handleReupload} />
          )}
        </Box>
      </Fade>

      {/* Info Alert */}
      {loadedFiles.length > 0 && (
        <Fade in timeout={600}>
          <Alert 
            severity="info" 
            sx={{ 
              mt: 4, 
              borderRadius: 2,
              bgcolor: alpha(theme.palette.info.main, 0.05),
              border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
            }}
          >
            <Typography variant="body2">
              <strong>Tip:</strong> Add multiple data series to compare angular distributions from different files.
              Enable MF34 uncertainties to visualize covariance data as error bands. Export as high-quality matplotlib figures for publications.
            </Typography>
          </Alert>
        </Fade>
      )}

      {/* Spacer */}
      <Box sx={{ height: 32 }} />
    </Box>
  );
};
