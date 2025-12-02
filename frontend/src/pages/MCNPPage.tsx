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
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  Code,
  Assessment,
  UploadFile,
  ArrowForward,
  Analytics,
  FolderOpen,
  Inventory,
  Calculate,
  Info,
  Compare,
  Download,
  MoreVert,
  Delete,
  OpenInNew,
} from '@mui/icons-material';
import { useFileWorkspace } from '../contexts/FileWorkspaceContext';
import type { WorkspaceFile, MCNPInputMetadata, MCTALMetadata, FileType } from '../types/file';
import { FileTypeSelectionDialog } from '../components/FileTypeSelectionDialog';

// Check if running in Tauri
const isTauri = '__TAURI__' in window;

// ============================================================================
// File Card Components
// ============================================================================

interface MCNPInputFileCardProps {
  file: WorkspaceFile;
  onClick: () => void;
  onDelete: (file: WorkspaceFile) => void;
  delay?: number;
}

const MCNPInputFileCard: React.FC<MCNPInputFileCardProps> = ({ file, onClick, onDelete, delay = 0 }) => {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  
  const metadata = file.metadata && 'material_count' in file.metadata 
    ? file.metadata as MCNPInputMetadata 
    : null;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleDelete = () => {
    handleMenuClose();
    onDelete(file);
  };

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
        {/* Menu button positioned absolutely */}
        <IconButton
          size="small"
          onClick={handleMenuOpen}
          sx={{ 
            position: 'absolute',
            top: 12,
            right: 8,
            zIndex: 1,
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.2s ease',
            bgcolor: 'background.paper',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <MoreVert fontSize="small" />
        </IconButton>
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={() => { handleMenuClose(); onClick(); }}>
            <ListItemIcon><OpenInNew fontSize="small" /></ListItemIcon>
            <ListItemText>Open</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        </Menu>

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
            <Box sx={{ flex: 1, minWidth: 0, pr: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} noWrap>
                {file.displayName}
              </Typography>
              {metadata && (
                <Typography variant="caption" color="text.secondary">
                  {metadata.material_count} materials
                </Typography>
              )}
            </Box>
          </Box>

          {metadata && (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
              <Chip
                icon={<Inventory sx={{ fontSize: 14 }} />}
                label={`${metadata.material_count} materials`}
                size="small"
                sx={{ 
                  bgcolor: alpha(theme.palette.info.main, 0.1),
                  color: theme.palette.info.main,
                  fontSize: '0.7rem',
                  height: 24,
                }}
              />
              {metadata.pert_count > 0 && (
                <Chip
                  icon={<Calculate sx={{ fontSize: 14 }} />}
                  label={`${metadata.pert_count} PERT`}
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
            View Materials <ArrowForward sx={{ fontSize: 18 }} />
          </Box>
        </CardActionArea>
      </Card>
    </Grow>
  );
};

interface MCTALFileCardProps {
  file: WorkspaceFile;
  onClick: () => void;
  onDelete: (file: WorkspaceFile) => void;
  delay?: number;
}

const MCTALFileCard: React.FC<MCTALFileCardProps> = ({ file, onClick, onDelete, delay = 0 }) => {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  
  const metadata = file.metadata && 'tally_count' in file.metadata 
    ? file.metadata as MCTALMetadata 
    : null;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleDelete = () => {
    handleMenuClose();
    onDelete(file);
  };

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
            ? `0 16px 32px ${alpha(theme.palette.warning.main, 0.2)}`
            : theme.shadows[2],
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: `linear-gradient(90deg, ${theme.palette.warning.main}, ${alpha(theme.palette.warning.main, 0.6)})`,
            borderRadius: '12px 12px 0 0',
          },
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Menu button positioned absolutely */}
        <IconButton
          size="small"
          onClick={handleMenuOpen}
          sx={{ 
            position: 'absolute',
            top: 12,
            right: 8,
            zIndex: 1,
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.2s ease',
            bgcolor: 'background.paper',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <MoreVert fontSize="small" />
        </IconButton>
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={() => { handleMenuClose(); onClick(); }}>
            <ListItemIcon><OpenInNew fontSize="small" /></ListItemIcon>
            <ListItemText>Open</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        </Menu>

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
                bgcolor: alpha(theme.palette.warning.main, 0.1),
                color: theme.palette.warning.main,
                transition: 'all 0.3s ease',
                transform: hovered ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              <Assessment sx={{ fontSize: 24 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0, pr: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} noWrap>
                {file.displayName}
              </Typography>
              {metadata && (
                <Typography variant="caption" color="text.secondary">
                  {metadata.tally_count} tallies • {metadata.nps?.toExponential(2) || 'N/A'} NPS
                </Typography>
              )}
            </Box>
          </Box>

          {metadata && (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
              <Chip
                label={`${metadata.tally_count} tallies`}
                size="small"
                sx={{ 
                  bgcolor: alpha(theme.palette.warning.main, 0.1),
                  color: theme.palette.warning.main,
                  fontSize: '0.7rem',
                  height: 24,
                }}
              />
              {metadata.npert > 0 && (
                <Chip
                  label={`${metadata.npert} pert`}
                  size="small"
                  sx={{ 
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    color: theme.palette.success.main,
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
              color: theme.palette.warning.main,
              fontWeight: 500,
              fontSize: '0.875rem',
              mt: 'auto',
              transition: 'gap 0.2s ease',
              gap: hovered ? 1.5 : 1,
            }}
          >
            View Tallies <ArrowForward sx={{ fontSize: 18 }} />
          </Box>
        </CardActionArea>
      </Card>
    </Grow>
  );
};

// ============================================================================
// Upload Section Component
// ============================================================================

interface UploadSectionProps {
  title: string;
  icon: React.ReactNode;
  color: string;
  onUpload: () => void;
  uploading: boolean;
}

const UploadSection: React.FC<UploadSectionProps> = ({
  title,
  icon,
  color,
  onUpload,
  uploading,
}) => {
  const theme = useTheme();
  
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        height: '100%',
        minHeight: 180,
        textAlign: 'center',
        bgcolor: 'transparent',
        border: '2px dashed',
        borderColor: alpha(theme.palette.divider, 0.5),
        borderRadius: 3,
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        '&:hover': {
          borderColor: alpha(color, 0.5),
          bgcolor: alpha(color, 0.02),
        },
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
          mx: 'auto',
          mb: 2,
        }}
      >
        {icon}
      </Box>
      
      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
        Upload {title}
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Click to browse
      </Typography>

      <Button
        variant="contained"
        size="small"
        startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <UploadFile />}
        onClick={onUpload}
        disabled={uploading}
        sx={{
          bgcolor: color,
          '&:hover': { bgcolor: alpha(color, 0.85) },
        }}
      >
        {uploading ? 'Uploading...' : 'Select Files'}
      </Button>
    </Paper>
  );
};

// ============================================================================
// Empty State Component
// ============================================================================

interface EmptyStateProps {
  title: string;
  color: string;
  onUpload: () => void;
  uploading: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, color, onUpload, uploading }) => {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        textAlign: 'center',
        bgcolor: 'transparent',
        border: '2px dashed',
        borderColor: alpha(theme.palette.divider, 0.3),
        borderRadius: 3,
      }}
    >
      <FolderOpen sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
      <Typography variant="h6" fontWeight={600} gutterBottom>
        No {title} Yet
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Upload your first {title.toLowerCase()} to get started
      </Typography>
      <Button
        variant="contained"
        startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <UploadFile />}
        onClick={onUpload}
        disabled={uploading}
        sx={{
          bgcolor: color,
          '&:hover': { bgcolor: alpha(color, 0.85) },
        }}
      >
        {uploading ? 'Uploading...' : `Upload ${title}`}
      </Button>
    </Paper>
  );
};

// ============================================================================
// Main MCNP Page Component
// ============================================================================

export const MCNPPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { files, addFiles, removeFile } = useFileWorkspace();

  const [uploadingInput, setUploadingInput] = useState(false);
  const [uploadingMctal, setUploadingMctal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<Array<{ name: string; path: string; content: string }>>([]);
  const [typeSelectionOpen, setTypeSelectionOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<WorkspaceFile | null>(null);

  const inputFileRef = useRef<HTMLInputElement>(null);
  const mctalFileRef = useRef<HTMLInputElement>(null);

  // Filter files by type
  const inputFiles = useMemo(
    () => files.filter(f => f.type === 'mcnp-input' && f.status === 'ready'),
    [files]
  );
  const mctalFiles = useMemo(
    () => files.filter(f => f.type === 'mcnp-mctal' && f.status === 'ready'),
    [files]
  );

  // Handle file upload for a specific type
  const handleUpload = useCallback(async (
    fileList: FileList,
    fileType: 'mcnp-input' | 'mcnp-mctal'
  ) => {
    const setUploading = fileType === 'mcnp-input' ? setUploadingInput : setUploadingMctal;
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
      await addFiles(filesData, fileType);
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setUploading(false);
    }
  }, [addFiles]);

  // Handle Tauri file dialog
  const handleTauriUpload = useCallback(async (fileType: 'mcnp-input' | 'mcnp-mctal') => {
    const setUploading = fileType === 'mcnp-input' ? setUploadingInput : setUploadingMctal;
    setUploading(true);
    try {
      const { open: openDialog } = await import('@tauri-apps/api/dialog');
      const { readTextFile } = await import('@tauri-apps/api/fs');

      const selected = await openDialog({ multiple: true });
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
      await addFiles(filesData, fileType);
    } catch (error) {
      console.error('Error selecting files:', error);
    } finally {
      setUploading(false);
    }
  }, [addFiles]);

  // Open file dialog
  const openFileDialog = useCallback((fileType: 'mcnp-input' | 'mcnp-mctal') => {
    if (isTauri) {
      handleTauriUpload(fileType);
    } else {
      const ref = fileType === 'mcnp-input' ? inputFileRef : mctalFileRef;
      ref.current?.click();
    }
  }, [handleTauriUpload]);

  // Handle file type selection from dialog
  const handleTypeSelect = useCallback(async (type: FileType) => {
    setTypeSelectionOpen(false);
    if (pendingFiles.length > 0 && (type === 'mcnp-input' || type === 'mcnp-mctal')) {
      const setUploading = type === 'mcnp-input' ? setUploadingInput : setUploadingMctal;
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

  // Handle file deletion
  const handleDeleteRequest = useCallback((file: WorkspaceFile) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (fileToDelete) {
      removeFile(fileToDelete.id);
    }
    setDeleteDialogOpen(false);
    setFileToDelete(null);
  }, [fileToDelete, removeFile]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialogOpen(false);
    setFileToDelete(null);
  }, []);

  return (
    <Box sx={{ width: '100%', minHeight: '100%' }}>
      {/* Hidden file inputs */}
      <input
        ref={inputFileRef}
        type="file"
        multiple
        onChange={(e) => e.target.files && handleUpload(e.target.files, 'mcnp-input')}
        style={{ display: 'none' }}
      />
      <input
        ref={mctalFileRef}
        type="file"
        multiple
        onChange={(e) => e.target.files && handleUpload(e.target.files, 'mcnp-mctal')}
        style={{ display: 'none' }}
      />

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
                <Analytics sx={{ fontSize: 32 }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={700}>
                  MCNP
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Manage input decks and analyze tally output files
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 3 }}>
              <Chip
                icon={<Info sx={{ fontSize: 16 }} />}
                label="Material Extraction"
                variant="outlined"
                sx={{ borderColor: alpha(theme.palette.info.main, 0.3) }}
              />
              <Chip
                icon={<Compare sx={{ fontSize: 16 }} />}
                label="PERT Card Analysis"
                variant="outlined"
                sx={{ borderColor: alpha(theme.palette.info.main, 0.3) }}
              />
              <Chip
                icon={<Download sx={{ fontSize: 16 }} />}
                label="Import to Library"
                variant="outlined"
                sx={{ borderColor: alpha(theme.palette.info.main, 0.3) }}
              />
            </Box>
          </Box>
        </Paper>
      </Fade>

      {/* Input Files Section */}
      <Fade in timeout={600}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Code sx={{ color: theme.palette.info.main }} />
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}
              >
                Input Files
              </Typography>
              <Chip
                label={inputFiles.length}
                size="small"
                sx={{
                  bgcolor: alpha(theme.palette.info.main, 0.1),
                  color: theme.palette.info.main,
                  fontWeight: 600,
                  height: 20,
                  fontSize: '0.75rem',
                }}
              />
            </Box>
          </Box>

          {inputFiles.length > 0 ? (
            <Grid container spacing={2}>
              {inputFiles.map((file, index) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={file.id}>
                  <MCNPInputFileCard
                    file={file}
                    onClick={() => navigate(`/mcnp-input/${file.id}`)}
                    onDelete={handleDeleteRequest}
                    delay={index * 50}
                  />
                </Grid>
              ))}
              {/* Upload card at the end */}
              <Grid item xs={12} sm={6} md={4} lg={3}>
                <UploadSection
                  title="Input Files"
                  icon={<Code sx={{ fontSize: 24 }} />}
                  color={theme.palette.info.main}
                  onUpload={() => openFileDialog('mcnp-input')}
                  uploading={uploadingInput}
                />
              </Grid>
            </Grid>
          ) : (
            <EmptyState
              title="Input Files"
              color={theme.palette.info.main}
              onUpload={() => openFileDialog('mcnp-input')}
              uploading={uploadingInput}
            />
          )}
        </Box>
      </Fade>

      {/* MCTAL Files Section */}
      <Fade in timeout={700}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assessment sx={{ color: theme.palette.warning.main }} />
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}
              >
                MCTAL Files
              </Typography>
              <Chip
                label={mctalFiles.length}
                size="small"
                sx={{
                  bgcolor: alpha(theme.palette.warning.main, 0.1),
                  color: theme.palette.warning.main,
                  fontWeight: 600,
                  height: 20,
                  fontSize: '0.75rem',
                }}
              />
            </Box>
          </Box>

          {mctalFiles.length > 0 ? (
            <Grid container spacing={2}>
              {mctalFiles.map((file, index) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={file.id}>
                  <MCTALFileCard
                    file={file}
                    onClick={() => navigate(`/mcnp-mctal/${file.id}`)}
                    onDelete={handleDeleteRequest}
                    delay={index * 50}
                  />
                </Grid>
              ))}
              {/* Upload card at the end */}
              <Grid item xs={12} sm={6} md={4} lg={3}>
                <UploadSection
                  title="MCTAL Files"
                  icon={<Assessment sx={{ fontSize: 24 }} />}
                  color={theme.palette.warning.main}
                  onUpload={() => openFileDialog('mcnp-mctal')}
                  uploading={uploadingMctal}
                />
              </Grid>
            </Grid>
          ) : (
            <EmptyState
              title="MCTAL Files"
              color={theme.palette.warning.main}
              onUpload={() => openFileDialog('mcnp-mctal')}
              uploading={uploadingMctal}
            />
          )}
        </Box>
      </Fade>

      {/* Info section */}
      <Fade in timeout={800}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
            bgcolor: alpha(theme.palette.background.paper, 0.5),
          }}
        >
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            About MCNP File Support
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            <strong>Input Files:</strong> KIKA parses MCNP input decks to extract material compositions, 
            PERT cards, and simulation parameters. Materials can be imported to your personal library for reuse.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>MCTAL Files:</strong> Tally output files containing simulation results. KIKA extracts 
            tallies, statistical information, and perturbation data for sensitivity analysis.
          </Typography>
        </Paper>
      </Fade>

      {/* File type selection dialog */}
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

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete File</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{fileToDelete?.displayName}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MCNPPage;
