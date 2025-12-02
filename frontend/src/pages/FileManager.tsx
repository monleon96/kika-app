import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  TextField,
  InputAdornment,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  CircularProgress,
  Paper,
  alpha,
  useTheme,
  Fade,
  Grow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  UploadFile,
  Delete,
  Edit,
  Search,
  Science,
  InsertDriveFile,
  CheckCircle,
  Error as ErrorIcon,
  HourglassEmpty,
  MoreVert,
  GridView,
  ViewList,
  DeleteSweep,
  Sort,
  ArrowUpward,
  ArrowDownward,
  Visibility,
  FolderOpen,
  CloudUpload,
  Code,
  Assessment,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useFileWorkspace } from '../contexts/FileWorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import type { WorkspaceFile, FileType } from '../types/file';
import { FileTypeSelectionDialog } from '../components/FileTypeSelectionDialog';

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

type ViewMode = 'grid' | 'list';

interface FileCardProps {
  file: WorkspaceFile;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onView: (file: WorkspaceFile) => void;
  viewMode: ViewMode;
}

const FileCard: React.FC<FileCardProps> = ({ file, onDelete, onRename, onView, viewMode }) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(file.displayName);
  // Flag to prevent card click when menu action is performed
  const [skipNextClick, setSkipNextClick] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    event.preventDefault();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = (event?: React.MouseEvent | React.KeyboardEvent | {}) => {
    if (event && 'stopPropagation' in event) {
      (event as React.MouseEvent).stopPropagation();
    }
    setAnchorEl(null);
  };

  const handleRename = (event: React.MouseEvent) => {
    event.stopPropagation();
    setSkipNextClick(true);
    setAnchorEl(null);
    setIsEditing(true);
    // Reset flag after a short delay
    setTimeout(() => setSkipNextClick(false), 100);
  };

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    setSkipNextClick(true);
    setAnchorEl(null);
    onDelete(file.id);
    // Reset flag after a short delay
    setTimeout(() => setSkipNextClick(false), 100);
  };

  const handleViewInViewer = (event: React.MouseEvent) => {
    event.stopPropagation();
    setAnchorEl(null);
    onView(file);
  };

  const handleSaveRename = () => {
    if (editName.trim() && editName !== file.displayName) {
      onRename(file.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename();
    } else if (e.key === 'Escape') {
      setEditName(file.displayName);
      setIsEditing(false);
    }
  };

  const getStatusIcon = () => {
    switch (file.status) {
      case 'ready':
        return <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />;
      case 'error':
        return <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />;
      case 'parsing':
      case 'pending':
        return <HourglassEmpty sx={{ fontSize: 16, color: 'warning.main' }} />;
    }
  };

  const getFileIcon = () => {
    if (file.type === 'ace') {
      return <Science sx={{ fontSize: viewMode === 'grid' ? 40 : 24 }} />;
    }
    if (file.type === 'endf') {
      return <InsertDriveFile sx={{ fontSize: viewMode === 'grid' ? 40 : 24 }} />;
    }
    if (file.type === 'mcnp-input') {
      return <Code sx={{ fontSize: viewMode === 'grid' ? 40 : 24 }} />;
    }
    if (file.type === 'mcnp-mctal') {
      return <Assessment sx={{ fontSize: viewMode === 'grid' ? 40 : 24 }} />;
    }
    return <InsertDriveFile sx={{ fontSize: viewMode === 'grid' ? 40 : 24 }} />;
  };

  const getFileColor = () => {
    if (file.type === 'ace') return theme.palette.primary.main;
    if (file.type === 'endf') return theme.palette.secondary.main;
    if (file.type === 'mcnp-input') return theme.palette.info.main;
    if (file.type === 'mcnp-mctal') return theme.palette.warning.main;
    return theme.palette.grey[500];
  };

  const fileColor = getFileColor();

  // Handle card click - only navigate if not editing and not skipping
  const handleCardClick = () => {
    if (!isEditing && !skipNextClick && file.status === 'ready') {
      onView(file);
    }
  };

  if (viewMode === 'list') {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          borderRadius: 2,
          border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
          transition: 'all 0.2s ease',
          cursor: !isEditing && file.status === 'ready' ? 'pointer' : 'default',
          '&:hover': {
            bgcolor: alpha(fileColor, 0.05),
            borderColor: alpha(fileColor, 0.3),
          },
        }}
        onClick={handleCardClick}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(fileColor, 0.1),
            color: fileColor,
          }}
        >
          {getFileIcon()}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          {isEditing ? (
            <TextField
              size="small"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveRename}
              onKeyDown={handleKeyDown}
              autoFocus
              fullWidth
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onFocus={(e) => e.target.select()}
              inputProps={{ style: { cursor: 'text' } }}
            />
          ) : (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1" fontWeight={500} noWrap>
                  {file.displayName}
                </Typography>
                {getStatusIcon()}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {file.type?.toUpperCase()} • {formatFileSize(file.size)} • {file.uploadedAt.toLocaleDateString()}
              </Typography>
            </>
          )}
        </Box>

        {file.metadata && 'zaid' in file.metadata && (
          <Chip label={file.metadata.zaid} size="small" variant="outlined" />
        )}
        {file.metadata && 'isotope' in file.metadata && file.metadata.isotope && (
          <Chip label={file.metadata.isotope} size="small" variant="outlined" />
        )}

        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleMenuOpen(e); }}>
          <MoreVert />
        </IconButton>

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem onClick={handleViewInViewer} disabled={file.status !== 'ready'}>
            <ListItemIcon><Visibility fontSize="small" /></ListItemIcon>
            <ListItemText>View in Viewer</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleRename}>
            <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
            <ListItemText>Rename</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        </Menu>
      </Paper>
    );
  }

  // Grid view
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'all 0.2s ease',
        cursor: !isEditing && file.status === 'ready' ? 'pointer' : 'default',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 8px 24px ${alpha(fileColor, 0.2)}`,
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          bgcolor: fileColor,
          borderRadius: '12px 12px 0 0',
        },
      }}
      onClick={handleCardClick}
    >
      <CardContent sx={{ flexGrow: 1, pt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(fileColor, 0.1),
              color: fileColor,
            }}
          >
            {getFileIcon()}
          </Box>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleMenuOpen(e); }}>
            <MoreVert />
          </IconButton>
        </Box>

        {isEditing ? (
          <TextField
            size="small"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveRename}
            onKeyDown={handleKeyDown}
            autoFocus
            fullWidth
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onFocus={(e) => e.target.select()}
            inputProps={{ style: { cursor: 'text' } }}
            sx={{ mb: 1 }}
          />
        ) : (
          <Typography variant="subtitle1" fontWeight={600} noWrap sx={{ mb: 0.5 }}>
            {file.displayName}
          </Typography>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Chip
            label={file.type?.toUpperCase() || 'Unknown'}
            size="small"
            sx={{
              bgcolor: alpha(fileColor, 0.1),
              color: fileColor,
              fontWeight: 600,
            }}
          />
          {getStatusIcon()}
        </Box>

        <Typography variant="caption" color="text.secondary" display="block">
          {formatFileSize(file.size)}
        </Typography>

        {file.metadata && 'zaid' in file.metadata && (
          <Typography variant="caption" color="text.secondary" display="block">
            ZAID: {file.metadata.zaid}
          </Typography>
        )}
        {file.metadata && 'isotope' in file.metadata && file.metadata.isotope && (
          <Typography variant="caption" color="text.secondary" display="block">
            {file.metadata.isotope}
          </Typography>
        )}

        {file.error && (
          <Alert severity="error" sx={{ mt: 1, py: 0, px: 1 }}>
            <Typography variant="caption">{file.error}</Typography>
          </Alert>
        )}
      </CardContent>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleViewInViewer} disabled={file.status !== 'ready'}>
          <ListItemIcon><Visibility fontSize="small" /></ListItemIcon>
          <ListItemText>View in Viewer</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleRename}>
          <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
          <ListItemText>Rename</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Card>
  );
};

export const FileManager: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    files,
    filter,
    isLoading,
    addFiles,
    removeFile,
    renameFile,
    clearAll,
    setFilter,
    getFilteredFiles,
  } = useFileWorkspace();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [typeSelectionOpen, setTypeSelectionOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<Array<{ name: string; path: string; content: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredFiles = getFilteredFiles();
  const aceCount = files.filter(f => f.type === 'ace').length;
  const endfCount = files.filter(f => f.type === 'endf').length;
  const mcnpInputCount = files.filter(f => f.type === 'mcnp-input').length;
  const mctalCount = files.filter(f => f.type === 'mcnp-mctal').length;

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

  const handleViewFile = (file: WorkspaceFile) => {
    if (file.type === 'ace') {
      navigate(`/ace-files/${file.id}`);
    } else if (file.type === 'endf') {
      navigate(`/endf-files/${file.id}`);
    } else if (file.type === 'mcnp-input') {
      navigate(`/mcnp-input/${file.id}`);
    } else if (file.type === 'mcnp-mctal') {
      navigate(`/mcnp-mctal/${file.id}`);
    }
  };

  const toggleSortOrder = () => {
    setFilter({ sortOrder: filter.sortOrder === 'asc' ? 'desc' : 'asc' });
  };

  return (
    <Box
      sx={{ width: '100%', minHeight: '100%' }}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      {/* Drag overlay */}
      {dragActive && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `3px dashed ${theme.palette.primary.main}`,
            borderRadius: 2,
            m: 2,
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <CloudUpload sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" color="primary">
              Drop files here to upload
            </Typography>
          </Box>
        </Box>
      )}

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
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
                  <FolderOpen sx={{ fontSize: 32 }} />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight={700}>
                    File Manager
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Manage your nuclear data files in one place
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <UploadFile />}
                onClick={openFileDialog}
                disabled={uploading}
                size="large"
              >
                Upload Files
              </Button>
            </Box>

            {/* Stats */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 3 }}>
              <Chip
                icon={<Science />}
                label={`${aceCount} ACE files`}
                variant={filter.type === 'ace' ? 'filled' : 'outlined'}
                color="primary"
                onClick={() => setFilter({ type: filter.type === 'ace' ? 'all' : 'ace' })}
                sx={{ borderColor: alpha(theme.palette.primary.main, 0.3) }}
              />
              <Chip
                icon={<InsertDriveFile />}
                label={`${endfCount} ENDF files`}
                variant={filter.type === 'endf' ? 'filled' : 'outlined'}
                color="secondary"
                onClick={() => setFilter({ type: filter.type === 'endf' ? 'all' : 'endf' })}
                sx={{ borderColor: alpha(theme.palette.secondary.main, 0.3) }}
              />
              <Chip
                icon={<Code />}
                label={`${mcnpInputCount} MCNP Input`}
                variant={filter.type === 'mcnp-input' ? 'filled' : 'outlined'}
                color="info"
                onClick={() => setFilter({ type: filter.type === 'mcnp-input' ? 'all' : 'mcnp-input' })}
                sx={{ borderColor: alpha(theme.palette.info.main, 0.3) }}
              />
              <Chip
                icon={<Assessment />}
                label={`${mctalCount} MCTAL`}
                variant={filter.type === 'mcnp-mctal' ? 'filled' : 'outlined'}
                color="warning"
                onClick={() => setFilter({ type: filter.type === 'mcnp-mctal' ? 'all' : 'mcnp-mctal' })}
                sx={{ borderColor: alpha(theme.palette.warning.main, 0.3) }}
              />
              {files.length > 0 && (
                <Chip
                  icon={<DeleteSweep />}
                  label="Clear All"
                  variant="outlined"
                  color="error"
                  onClick={() => setClearDialogOpen(true)}
                />
              )}
            </Box>
          </Box>
        </Paper>
      </Fade>

      {/* Toolbar */}
      <Fade in timeout={500}>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
          }}
        >
          <TextField
            size="small"
            placeholder="Search files..."
            value={filter.searchQuery}
            onChange={(e) => setFilter({ searchQuery: e.target.value })}
            sx={{ minWidth: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="action" />
                </InputAdornment>
              ),
            }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Sort color="action" />
            <TextField
              select
              size="small"
              value={filter.sortBy}
              onChange={(e) => setFilter({ sortBy: e.target.value as any })}
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="date">Date</MenuItem>
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="type">Type</MenuItem>
            </TextField>
            <IconButton size="small" onClick={toggleSortOrder}>
              {filter.sortOrder === 'asc' ? <ArrowUpward /> : <ArrowDownward />}
            </IconButton>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, value) => value && setViewMode(value)}
            size="small"
          >
            <ToggleButton value="grid">
              <GridView />
            </ToggleButton>
            <ToggleButton value="list">
              <ViewList />
            </ToggleButton>
          </ToggleButtonGroup>
        </Paper>
      </Fade>

      {/* Content */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : files.length === 0 ? (
        <Fade in timeout={600}>
          <Paper
            elevation={0}
            sx={{
              p: 6,
              textAlign: 'center',
              borderRadius: 3,
              border: `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
              bgcolor: alpha(theme.palette.primary.main, 0.02),
            }}
          >
            <FolderOpen sx={{ fontSize: 64, color: 'action.disabled', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No files yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Upload ACE or ENDF files to get started. Drag and drop files or click the button below.
            </Typography>
            <Button
              variant="contained"
              startIcon={<UploadFile />}
              onClick={openFileDialog}
            >
              Upload Your First File
            </Button>
            
            {!user?.is_guest && (
              <Alert severity="info" sx={{ mt: 3, maxWidth: 400, mx: 'auto' }}>
                <Typography variant="body2">
                  Your files will be saved locally and restored when you log in again.
                </Typography>
              </Alert>
            )}
          </Paper>
        </Fade>
      ) : filteredFiles.length === 0 ? (
        <Alert severity="info">
          No files match your search criteria. Try adjusting the filters.
        </Alert>
      ) : viewMode === 'grid' ? (
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
          }}
        >
          {filteredFiles.map((file, index) => (
            <Grow in timeout={300 + index * 50} key={file.id}>
              <Box>
                <FileCard
                  file={file}
                  onDelete={removeFile}
                  onRename={renameFile}
                  onView={handleViewFile}
                  viewMode={viewMode}
                />
              </Box>
            </Grow>
          ))}
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {filteredFiles.map((file, index) => (
            <Fade in timeout={200 + index * 30} key={file.id}>
              <Box>
                <FileCard
                  file={file}
                  onDelete={removeFile}
                  onRename={renameFile}
                  onView={handleViewFile}
                  viewMode={viewMode}
                />
              </Box>
            </Fade>
          ))}
        </Box>
      )}

      {/* Clear All Dialog */}
      <Dialog open={clearDialogOpen} onClose={() => setClearDialogOpen(false)}>
        <DialogTitle>Clear All Files?</DialogTitle>
        <DialogContent>
          <Typography>
            This will remove all {files.length} files from your workspace. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearDialogOpen(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              clearAll();
              setClearDialogOpen(false);
            }}
          >
            Clear All
          </Button>
        </DialogActions>
      </Dialog>

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
    </Box>
  );
};
