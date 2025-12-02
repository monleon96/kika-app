import React, { useState, useRef, useCallback } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Chip,
  TextField,
  Divider,
  CircularProgress,
  alpha,
  useTheme,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import {
  Close,
  UploadFile,
  Delete,
  Science,
  InsertDriveFile,
  Search,
  CheckCircle,
  Error as ErrorIcon,
  HourglassEmpty,
  OpenInNew,
  Edit,
  Code,
  Assessment,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useFileWorkspace } from '../contexts/FileWorkspaceContext';
import type { WorkspaceFile, FileType } from '../types/file';
import { FileTypeSelectionDialog } from './FileTypeSelectionDialog';

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Check if running in Tauri
const isTauri = '__TAURI__' in window;

interface FileWorkspaceProps {
  open: boolean;
  onClose: () => void;
  width?: number;
}

export const FileWorkspace: React.FC<FileWorkspaceProps> = ({ 
  open, 
  onClose,
  width = 360,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const {
    files,
    filter,
    addFiles,
    removeFile,
    renameFile,
    setFilter,
    getFilteredFiles,
  } = useFileWorkspace();

  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [typeSelectionOpen, setTypeSelectionOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<Array<{ name: string; path: string; content: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredFiles = getFilteredFiles();
  const aceCount = files.filter(f => f.type === 'ace' && f.status === 'ready').length;
  const endfCount = files.filter(f => f.type === 'endf' && f.status === 'ready').length;
  const mcnpInputCount = files.filter(f => f.type === 'mcnp-input' && f.status === 'ready').length;
  const mctalCount = files.filter(f => f.type === 'mcnp-mctal' && f.status === 'ready').length;

  // Handle file type selection from dialog
  const handleTypeSelect = useCallback(async (type: FileType) => {
    setTypeSelectionOpen(false);
    if (pendingFiles.length > 0) {
      setUploading(true);
      try {
        await addFiles(pendingFiles, type);
      } catch (error) {
        console.error('Error uploading files:', error);
      } finally {
        setUploading(false);
        setPendingFiles([]);
      }
    }
  }, [pendingFiles, addFiles]);

  // Handle files - now opens type selection dialog instead of auto-detecting
  const handleFiles = useCallback(async (fileList: FileList) => {
    const filesArray = Array.from(fileList);
    const filesData = await Promise.all(
      filesArray.map(async file => ({
        name: file.name,
        path: file.name,
        content: await file.text(),
      }))
    );
    // Store files and open type selection dialog
    setPendingFiles(filesData);
    setTypeSelectionOpen(true);
  }, []);

  // Handle Tauri file dialog
  const handleTauriFileSelect = useCallback(async () => {
    try {
      const { open: openDialog } = await import('@tauri-apps/api/dialog');
      const { readTextFile } = await import('@tauri-apps/api/fs');

      const selected = await openDialog({
        multiple: true,
        filters: [
          { name: 'All Files', extensions: ['*'] },
          { name: 'Nuclear Data Files', extensions: ['ace', 'endf', 'endf6', '02c', '03c', '70c', '80c', 'txt'] },
        ],
      });

      if (!selected || !Array.isArray(selected) || selected.length === 0) {
        return;
      }

      const filesData = await Promise.all(
        selected.map(async (filePath: string) => {
          const fileName = filePath.split(/[\\/]/).pop() || 'unknown';
          const content = await readTextFile(filePath);
          return { name: fileName, path: filePath, content };
        })
      );

      // Store files and open type selection dialog
      setPendingFiles(filesData);
      setTypeSelectionOpen(true);
    } catch (error) {
      console.error('Error selecting files:', error);
    }
  }, []);

  // Drag and drop handlers
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

  const handleFileClick = (file: WorkspaceFile) => {
    if (file.status === 'ready') {
      if (file.type === 'ace') {
        navigate('/ace-files');
      } else if (file.type === 'endf') {
        navigate('/endf-files');
      } else if (file.type === 'mcnp-input') {
        navigate('/mcnp-input');
      } else if (file.type === 'mcnp-mctal') {
        navigate('/mcnp-mctal');
      }
      onClose();
    }
  };

  const startEditing = (file: WorkspaceFile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(file.id);
    setEditName(file.displayName);
  };

  const saveEdit = () => {
    if (editingId && editName.trim()) {
      renameFile(editingId, editName.trim());
    }
    setEditingId(null);
  };

  const getFileColor = (file: WorkspaceFile) => {
    if (file.type === 'ace') return theme.palette.primary.main;
    if (file.type === 'endf') return theme.palette.secondary.main;
    if (file.type === 'mcnp-input') return theme.palette.info.main;
    if (file.type === 'mcnp-mctal') return theme.palette.warning.main;
    return theme.palette.grey[500];
  };

  const getStatusIcon = (file: WorkspaceFile) => {
    if (file.status === 'error') return <ErrorIcon sx={{ fontSize: 14 }} color="error" />;
    if (file.status === 'parsing' || file.status === 'pending') return <HourglassEmpty sx={{ fontSize: 14 }} color="warning" />;
    return <CheckCircle sx={{ fontSize: 14 }} color="success" />;
  };

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      variant="persistent"
      sx={{
        width: open ? width : 0,
        flexShrink: 0,
        transition: 'width 0.3s ease-in-out',
        '& .MuiDrawer-paper': {
          width: width,
          boxSizing: 'border-box',
          height: '100%',
          position: 'relative',
          border: 'none',
          top: 'auto',
          bgcolor: 'background.default',
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Quick Files
          </Typography>
          <Box>
            <Tooltip title="Open File Manager">
              <IconButton size="small" onClick={() => { navigate('/files'); onClose(); }}>
                <OpenInNew fontSize="small" />
              </IconButton>
            </Tooltip>
            <IconButton onClick={onClose} size="small">
              <Close fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Stats & Upload */}
        <Box
          sx={{
            px: 2,
            pb: 2,
            bgcolor: dragActive ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
            border: dragActive ? `2px dashed ${theme.palette.primary.main}` : '2px dashed transparent',
            transition: 'all 0.2s',
          }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
            <Chip
              icon={<Science sx={{ fontSize: 16 }} />}
              label={aceCount}
              size="small"
              color="primary"
              variant={filter.type === 'ace' ? 'filled' : 'outlined'}
              onClick={() => setFilter({ type: filter.type === 'ace' ? 'all' : 'ace' })}
              sx={{ flex: '1 1 45%', minWidth: 60 }}
            />
            <Chip
              icon={<InsertDriveFile sx={{ fontSize: 16 }} />}
              label={endfCount}
              size="small"
              color="secondary"
              variant={filter.type === 'endf' ? 'filled' : 'outlined'}
              onClick={() => setFilter({ type: filter.type === 'endf' ? 'all' : 'endf' })}
              sx={{ flex: '1 1 45%', minWidth: 60 }}
            />
            <Chip
              icon={<Code sx={{ fontSize: 16 }} />}
              label={mcnpInputCount}
              size="small"
              color="info"
              variant={filter.type === 'mcnp-input' ? 'filled' : 'outlined'}
              onClick={() => setFilter({ type: filter.type === 'mcnp-input' ? 'all' : 'mcnp-input' })}
              sx={{ flex: '1 1 45%', minWidth: 60 }}
              title="MCNP Input Files"
            />
            <Chip
              icon={<Assessment sx={{ fontSize: 16 }} />}
              label={mctalCount}
              size="small"
              color="warning"
              variant={filter.type === 'mcnp-mctal' ? 'filled' : 'outlined'}
              onClick={() => setFilter({ type: filter.type === 'mcnp-mctal' ? 'all' : 'mcnp-mctal' })}
              sx={{ flex: '1 1 45%', minWidth: 60 }}
              title="MCTAL Files"
            />
          </Box>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
          
          <Button
            variant="contained"
            startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <UploadFile />}
            onClick={openFileDialog}
            disabled={uploading}
            fullWidth
            size="small"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </Box>

        {/* Search */}
        {files.length > 0 && (
          <Box sx={{ px: 2, pb: 1 }}>
            <TextField
              size="small"
              placeholder="Search..."
              value={filter.searchQuery}
              onChange={(e) => setFilter({ searchQuery: e.target.value })}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ fontSize: 18, color: 'action.active' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ '& .MuiInputBase-input': { py: 0.75 } }}
            />
          </Box>
        )}

        <Divider />

        {/* File List */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {filteredFiles.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {files.length === 0 ? 'No files yet' : 'No matches'}
              </Typography>
            </Box>
          ) : (
            <List dense disablePadding>
              {filteredFiles.map((file) => (
                <ListItemButton
                  key={file.id}
                  onClick={() => handleFileClick(file)}
                  sx={{
                    py: 1,
                    px: 2,
                    borderLeft: `3px solid ${getFileColor(file)}`,
                    '&:hover': {
                      bgcolor: alpha(getFileColor(file), 0.08),
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {file.type === 'ace' ? (
                      <Science sx={{ fontSize: 20 }} color="primary" />
                    ) : file.type === 'endf' ? (
                      <InsertDriveFile sx={{ fontSize: 20 }} color="secondary" />
                    ) : file.type === 'mcnp-input' ? (
                      <Code sx={{ fontSize: 20 }} color="info" />
                    ) : file.type === 'mcnp-mctal' ? (
                      <Assessment sx={{ fontSize: 20 }} color="warning" />
                    ) : (
                      <InsertDriveFile sx={{ fontSize: 20 }} />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      editingId === file.id ? (
                        <TextField
                          size="small"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          autoFocus
                          fullWidth
                          onClick={(e) => e.stopPropagation()}
                          sx={{ '& .MuiInputBase-input': { py: 0.25, fontSize: '0.875rem' } }}
                        />
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                            {file.displayName}
                          </Typography>
                          {getStatusIcon(file)}
                        </Box>
                      )
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary" component="span">
                        {file.metadata && 'zaid' in file.metadata && file.metadata.zaid}
                        {file.metadata && 'isotope' in file.metadata && file.metadata.isotope && ` • ${file.metadata.isotope}`}
                        {!file.metadata && `${formatFileSize(file.size)}`}
                      </Typography>
                    }
                    sx={{ my: 0 }}
                  />
                  <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                    <IconButton
                      size="small"
                      onClick={(e) => startEditing(file, e)}
                      sx={{ p: 0.5 }}
                    >
                      <Edit sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                      sx={{ p: 0.5 }}
                    >
                      <Delete sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>

        {/* Footer */}
        {files.length > 3 && (
          <>
            <Divider />
            <Box sx={{ p: 1.5, textAlign: 'center' }}>
              <Button
                size="small"
                onClick={() => { navigate('/files'); onClose(); }}
                endIcon={<OpenInNew sx={{ fontSize: 14 }} />}
              >
                View all {files.length} files
              </Button>
            </Box>
          </>
        )}
      </Box>

      {/* File Type Selection Dialog */}
      <FileTypeSelectionDialog
        open={typeSelectionOpen}
        onClose={() => {
          setTypeSelectionOpen(false);
          setPendingFiles([]);
        }}
        onSelect={handleTypeSelect}
        fileCount={pendingFiles.length}
        fileNames={pendingFiles.map(f => f.name)}
      />
    </Drawer>
  );
};
