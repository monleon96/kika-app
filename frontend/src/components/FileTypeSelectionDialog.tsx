import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardActionArea,
  alpha,
  useTheme,
  Chip,
} from '@mui/material';
import {
  Science,
  InsertDriveFile,
  CheckCircle,
  Code,
  Assessment,
} from '@mui/icons-material';
import type { FileType } from '../types/file';

// File type configuration - easy to extend with new types in the future
export interface FileTypeOption {
  type: FileType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';
}

export const FILE_TYPE_OPTIONS: FileTypeOption[] = [
  {
    type: 'ace',
    label: 'ACE',
    description: 'A Compact ENDF format used by Monte Carlo codes like MCNP',
    icon: <Science sx={{ fontSize: 32 }} />,
    color: 'primary',
  },
  {
    type: 'endf',
    label: 'ENDF',
    description: 'Evaluated Nuclear Data File format (ENDF-6)',
    icon: <InsertDriveFile sx={{ fontSize: 32 }} />,
    color: 'secondary',
  },
  {
    type: 'mcnp-input',
    label: 'MCNP Input',
    description: 'MCNP input deck with materials, cells, surfaces, and tallies',
    icon: <Code sx={{ fontSize: 32 }} />,
    color: 'info',
  },
  {
    type: 'mcnp-mctal',
    label: 'MCTAL',
    description: 'MCNP tally output file with results and perturbation data',
    icon: <Assessment sx={{ fontSize: 32 }} />,
    color: 'warning',
  },
];

interface FileTypeSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: FileType) => void;
  fileCount?: number;
  fileNames?: string[];
  /** If provided, shows a specific error message with recovery options */
  errorMode?: {
    failedType: FileType;
    errorMessage: string;
  };
}

export const FileTypeSelectionDialog: React.FC<FileTypeSelectionDialogProps> = ({
  open,
  onClose,
  onSelect,
  fileCount = 1,
  fileNames = [],
  errorMode,
}) => {
  const theme = useTheme();
  const [selectedType, setSelectedType] = useState<FileType | null>(null);

  const handleSelect = (type: FileType) => {
    setSelectedType(type);
  };

  const handleConfirm = () => {
    if (selectedType) {
      onSelect(selectedType);
      setSelectedType(null);
    }
  };

  const handleClose = () => {
    setSelectedType(null);
    onClose();
  };

  // Get alternative types (exclude the failed type in error mode)
  const availableTypes = errorMode
    ? FILE_TYPE_OPTIONS.filter(opt => opt.type !== errorMode.failedType)
    : FILE_TYPE_OPTIONS;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        {errorMode ? (
          <Box>
            <Typography variant="h6" fontWeight={600} color="error.main">
              File Reading Failed
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              The file doesn't appear to be a valid {errorMode.failedType.toUpperCase()} file.
            </Typography>
          </Box>
        ) : (
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Select File Type
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {fileCount === 1
                ? 'Choose the format of the file you\'re uploading'
                : `Choose the format for ${fileCount} files`}
            </Typography>
          </Box>
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* Show file names if provided */}
        {fileNames.length > 0 && fileNames.length <= 3 && (
          <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {fileNames.map((name, i) => (
              <Chip key={i} label={name} size="small" variant="outlined" />
            ))}
          </Box>
        )}
        {fileNames.length > 3 && (
          <Box sx={{ mb: 2 }}>
            <Chip label={`${fileNames.length} files selected`} size="small" variant="outlined" />
          </Box>
        )}

        {/* Error message in error mode */}
        {errorMode && (
          <Box
            sx={{
              mb: 2,
              p: 2,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.error.main, 0.1),
              border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
            }}
          >
            <Typography variant="body2" color="error.main">
              {errorMode.errorMessage}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Would you like to try reading as a different file type?
            </Typography>
          </Box>
        )}

        {/* File type options */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {availableTypes.map((option) => {
            const isSelected = selectedType === option.type;
            const colorValue = theme.palette[option.color].main;

            return (
              <Card
                key={option.type}
                elevation={0}
                sx={{
                  border: `2px solid ${isSelected ? colorValue : alpha(theme.palette.divider, 0.5)}`,
                  borderRadius: 2,
                  transition: 'all 0.2s ease',
                  bgcolor: isSelected ? alpha(colorValue, 0.05) : 'transparent',
                  '&:hover': {
                    borderColor: alpha(colorValue, 0.5),
                    bgcolor: alpha(colorValue, 0.03),
                  },
                }}
              >
                <CardActionArea
                  onClick={() => handleSelect(option.type)}
                  sx={{ p: 2 }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha(colorValue, 0.1),
                        color: colorValue,
                        flexShrink: 0,
                      }}
                    >
                      {option.icon}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {option.label}
                        </Typography>
                        {isSelected && (
                          <CheckCircle sx={{ fontSize: 20, color: colorValue }} />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {option.description}
                      </Typography>
                    </Box>
                  </Box>
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!selectedType}
          color={selectedType ? FILE_TYPE_OPTIONS.find(o => o.type === selectedType)?.color : 'primary'}
        >
          {errorMode ? 'Try Again' : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FileTypeSelectionDialog;
