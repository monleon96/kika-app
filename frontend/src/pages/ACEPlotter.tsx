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
} from '@mui/material';
import {
  ArrowBack,
  Science,
  NavigateNext,
  UploadFile,
  Folder,
} from '@mui/icons-material';
import { ACEPlotViewer, type LoadedACEFile } from '../components/ACEPlotViewer';
import { useFileWorkspace } from '../contexts/FileWorkspaceContext';

// Check if running in Tauri
const isTauri = '__TAURI__' in window;

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
      sx={{
        p: 6,
        textAlign: 'center',
        bgcolor: dragActive ? alpha(theme.palette.primary.main, 0.05) : 'background.paper',
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
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      <Folder sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
      
      <Typography variant="h5" fontWeight={600} gutterBottom>
        No ACE Files Loaded
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Upload ACE files to start visualizing cross-section data
      </Typography>

      <Button
        variant="contained"
        size="large"
        startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <UploadFile />}
        onClick={openFileDialog}
        disabled={uploading}
        sx={{ mt: 2 }}
      >
        {uploading ? 'Uploading...' : 'Upload ACE Files'}
      </Button>

    </Paper>
  );
};

export const ACEPlotter: React.FC = () => {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { files, getFilesByType } = useFileWorkspace();

  // Get the specific file if fileId is provided, otherwise get all ACE files
  const loadedFiles: LoadedACEFile[] = useMemo(() => {
    let aceFiles;
    
    if (fileId) {
      // If we have a specific file, prioritize it but include others
      const specificFile = files.find(f => f.id === fileId && f.type === 'ace' && f.status === 'ready');
      const otherFiles = files.filter(f => f.id !== fileId && f.type === 'ace' && f.status === 'ready');
      aceFiles = specificFile ? [specificFile, ...otherFiles] : otherFiles;
    } else {
      aceFiles = getFilesByType('ace');
    }

    return aceFiles.map(file => ({
      name: file.displayName || file.name,
      path: file.path,
      content: file.content,
      info: file.metadata && 'atomic_weight_ratio' in file.metadata ? file.metadata : undefined,
      error: file.error,
    }));
  }, [files, fileId, getFilesByType]);

  const specificFile = fileId ? files.find(f => f.id === fileId) : null;

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
            {specificFile && (
              <Link
                component="button"
                underline="hover"
                color="inherit"
                onClick={() => navigate(`/ace-files/${fileId}`)}
              >
                {specificFile.displayName}
              </Link>
            )}
            <Typography color="text.primary" fontWeight={500}>
              ACE Plotter
            </Typography>
          </Breadcrumbs>
        </Box>
      </Fade>

      {/* Header */}
      <Fade in timeout={400}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              ACE Plotter
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {specificFile 
                ? `Visualizing data from ${specificFile.displayName}`
                : 'Compare cross-section data from multiple ACE files'
              }
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => specificFile ? navigate(`/ace-files/${fileId}`) : navigate('/ace-files')}
          >
            Back
          </Button>
        </Box>
      </Fade>

      {/* Main Content */}
      <Fade in timeout={500}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
            minHeight: 500,
          }}
        >
          {loadedFiles.length === 0 ? (
            <FileUploadPrompt />
          ) : (
            <ACEPlotViewer files={loadedFiles} />
          )}
        </Paper>
      </Fade>

      {/* Info Alert */}
      {loadedFiles.length > 0 && (
        <Fade in timeout={600}>
          <Alert 
            severity="info" 
            sx={{ 
              mt: 3, 
              borderRadius: 2,
              bgcolor: alpha(theme.palette.info.main, 0.05),
              border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
            }}
          >
            <Typography variant="body2">
              <strong>Tip:</strong> Add multiple data series to compare cross-sections from different files or reactions.
              Use the configuration panel to adjust axes, grids, and export options.
            </Typography>
          </Alert>
        </Fade>
      )}

      {/* Spacer */}
      <Box sx={{ height: 24 }} />
    </Box>
  );
};
