import React, { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  IconButton,
  Breadcrumbs,
  Link,
  alpha,
  useTheme,
  Fade,
  Grow,
  Grid,
  Alert,
  Tooltip,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Snackbar,
} from '@mui/material';
import {
  ArrowBack,
  Code,
  NavigateNext,
  ContentCopy,
  Edit,
  Check,
  Close,
  Inventory,
  Calculate,
  Description,
  Visibility as ViewIcon,
  ArrowBackIosNew as BackIcon,
  LibraryAdd,
  OpenInNew,
} from '@mui/icons-material';
import { useFileWorkspace } from '../contexts/FileWorkspaceContext';
import { useMaterials } from '../contexts/MaterialsContext';
import type { MCNPInputMetadata, MaterialDetail } from '../types/file';
import type { MaterialCreateRequest } from '../types/material';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format ZAID for display (e.g., 92235 -> U-235)
 */
const formatZaid = (zaid: string | number): string => {
  const zaidStr = String(zaid);
  // Extract Z (atomic number) and A (mass number)
  // MCNP ZAIDs are typically ZZZAAA or ZZAAA format
  const zaidNum = parseInt(zaidStr.replace(/\.\d+c?$/, ''), 10);
  if (isNaN(zaidNum)) return zaidStr;
  
  const z = Math.floor(zaidNum / 1000);
  const a = zaidNum % 1000;
  
  const elementSymbols: Record<number, string> = {
    1: 'H', 2: 'He', 3: 'Li', 4: 'Be', 5: 'B', 6: 'C', 7: 'N', 8: 'O', 9: 'F', 10: 'Ne',
    11: 'Na', 12: 'Mg', 13: 'Al', 14: 'Si', 15: 'P', 16: 'S', 17: 'Cl', 18: 'Ar',
    19: 'K', 20: 'Ca', 21: 'Sc', 22: 'Ti', 23: 'V', 24: 'Cr', 25: 'Mn', 26: 'Fe',
    27: 'Co', 28: 'Ni', 29: 'Cu', 30: 'Zn', 31: 'Ga', 32: 'Ge', 33: 'As', 34: 'Se',
    35: 'Br', 36: 'Kr', 37: 'Rb', 38: 'Sr', 39: 'Y', 40: 'Zr', 41: 'Nb', 42: 'Mo',
    43: 'Tc', 44: 'Ru', 45: 'Rh', 46: 'Pd', 47: 'Ag', 48: 'Cd', 49: 'In', 50: 'Sn',
    51: 'Sb', 52: 'Te', 53: 'I', 54: 'Xe', 55: 'Cs', 56: 'Ba', 57: 'La', 58: 'Ce',
    59: 'Pr', 60: 'Nd', 61: 'Pm', 62: 'Sm', 63: 'Eu', 64: 'Gd', 65: 'Tb', 66: 'Dy',
    67: 'Ho', 68: 'Er', 69: 'Tm', 70: 'Yb', 71: 'Lu', 72: 'Hf', 73: 'Ta', 74: 'W',
    75: 'Re', 76: 'Os', 77: 'Ir', 78: 'Pt', 79: 'Au', 80: 'Hg', 81: 'Tl', 82: 'Pb',
    83: 'Bi', 84: 'Po', 85: 'At', 86: 'Rn', 87: 'Fr', 88: 'Ra', 89: 'Ac', 90: 'Th',
    91: 'Pa', 92: 'U', 93: 'Np', 94: 'Pu', 95: 'Am', 96: 'Cm', 97: 'Bk', 98: 'Cf',
  };
  
  const symbol = elementSymbols[z] || `Z${z}`;
  
  if (a === 0) {
    return `${symbol}-nat`;
  }
  return `${symbol}-${a}`;
};

/**
 * Check if a ZAID represents a natural element
 */
const isNaturalElement = (zaid: string | number): boolean => {
  const zaidStr = String(zaid);
  const zaidNum = parseInt(zaidStr.replace(/\.\d+c?$/, ''), 10);
  return !isNaN(zaidNum) && (zaidNum % 1000) === 0;
};

// ============================================================================
// Material Flip Card Component
// ============================================================================

interface MaterialFlipCardProps {
  material: MaterialDetail;
  onImport: (material: MaterialDetail) => void;
  isImported: boolean;
  delay?: number;
}

const MaterialFlipCard: React.FC<MaterialFlipCardProps> = ({ 
  material, 
  onImport, 
  isImported,
  delay = 0 
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [isFlipped, setIsFlipped] = useState(false);

  const fractionType = material.fraction_type === 'weight' ? 'Weight' : 'Atomic';

  return (
    <Grow in timeout={400 + delay}>
      <Box
        sx={{
          perspective: 1000,
          height: 300,
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0)',
          }}
        >
          {/* Front of card */}
          <Card
            sx={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              backfaceVisibility: 'hidden',
              display: 'flex',
              flexDirection: 'column',
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
          >
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="h6" fontWeight={600}>
                      {material.name}
                    </Typography>
                    <Chip 
                      label={`M${material.id}`} 
                      size="small" 
                      color="info" 
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                  {material.density && (
                    <Typography variant="body2" color="text.secondary">
                      ρ = {material.density.toExponential(3)} g/cm³
                    </Typography>
                  )}
                </Box>
                {isImported && (
                  <Chip 
                    label="Imported" 
                    size="small" 
                    color="success" 
                    variant="outlined"
                  />
                )}
              </Box>

              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                <Chip
                  size="small"
                  label={`${material.nuclide_count} nuclides`}
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />
                <Chip
                  size="small"
                  label={fractionType}
                  color={fractionType === 'Weight' ? 'primary' : 'secondary'}
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />
                {material.nuclides.some(n => isNaturalElement(n.zaid)) && (
                  <Chip
                    size="small"
                    label="Natural"
                    color="warning"
                    variant="outlined"
                    sx={{ fontSize: '0.75rem' }}
                  />
                )}
              </Box>

              {/* Preview of top nuclides */}
              <Box sx={{ flex: 1, mb: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  Top nuclides:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {material.nuclides.slice(0, 5).map((nuc, i) => (
                    <Chip
                      key={i}
                      label={formatZaid(nuc.zaid)}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                  ))}
                  {material.nuclides.length > 5 && (
                    <Chip
                      label={`+${material.nuclides.length - 5}`}
                      size="small"
                      sx={{ fontSize: '0.7rem' }}
                    />
                  )}
                </Box>
              </Box>

              <Box sx={{ mt: 'auto', display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ViewIcon />}
                  onClick={() => setIsFlipped(true)}
                  sx={{ flex: 1 }}
                >
                  Composition
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={isImported ? <OpenInNew /> : <LibraryAdd />}
                  onClick={() => isImported ? navigate('/materials') : onImport(material)}
                  disabled={false}
                  color={isImported ? 'success' : 'primary'}
                  sx={{ flex: 1 }}
                >
                  {isImported ? 'View Library' : 'Import'}
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Back of card - Nuclide composition */}
          <Card
            sx={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: alpha(theme.palette.info.main, 0.02),
            }}
          >
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Composition
                </Typography>
                <IconButton size="small" onClick={() => setIsFlipped(false)}>
                  <BackIcon fontSize="small" />
                </IconButton>
              </Box>

              <Paper
                elevation={0}
                sx={{
                  flex: 1,
                  overflow: 'auto',
                  bgcolor: 'background.paper',
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 1,
                  mb: 1,
                }}
              >
                <Box sx={{ p: 1 }}>
                  {material.nuclides.map((nuc, i) => (
                    <Box
                      key={i}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 0.5,
                        px: 1,
                        borderRadius: 0.5,
                        '&:hover': { bgcolor: alpha(theme.palette.info.main, 0.05) },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontFamily="monospace" fontWeight={500}>
                          {formatZaid(nuc.zaid)}
                        </Typography>
                        {isNaturalElement(nuc.zaid) && (
                          <Chip label="nat" size="small" sx={{ height: 16, fontSize: '0.6rem' }} />
                        )}
                      </Box>
                      <Typography variant="body2" fontFamily="monospace" color="text.secondary">
                        {Math.abs(nuc.fraction).toExponential(4)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>

              <Typography variant="caption" color="text.secondary" align="center">
                {material.fraction_type === 'weight' ? 'Weight Fractions' : 'Atomic Fractions'}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Grow>
  );
};

// ============================================================================
// Info Item Component
// ============================================================================

interface InfoItemProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  copyable?: boolean;
}

const InfoItem: React.FC<InfoItemProps> = ({ label, value, icon, copyable }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(String(value));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
      {icon && (
        <Box sx={{ color: 'text.secondary' }}>
          {icon}
        </Box>
      )}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" display="block">
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={500} noWrap>
          {value}
        </Typography>
      </Box>
      {copyable && (
        <Tooltip title={copied ? 'Copied!' : 'Copy'}>
          <IconButton size="small" onClick={handleCopy}>
            <ContentCopy sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const MCNPInputFilePage: React.FC = () => {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { files, renameFile } = useFileWorkspace();
  const { materials: userMaterials, addMaterial } = useMaterials();
  
  // State
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const file = useMemo(() => {
    return files.find(f => f.id === fileId && f.type === 'mcnp-input');
  }, [files, fileId]);

  const metadata: MCNPInputMetadata | null = useMemo(() => {
    if (file?.metadata && 'material_count' in file.metadata) {
      return file.metadata as MCNPInputMetadata;
    }
    return null;
  }, [file]);

  // Track which materials have been imported (by matching material_id)
  const importedMaterialIds = useMemo(() => {
    return new Set(userMaterials.map(m => m.material_id));
  }, [userMaterials]);

  // Handle importing a material to the user's library
  const handleImportMaterial = useCallback(async (material: MaterialDetail) => {
    try {
      // Convert to MaterialCreateRequest format
      const request: MaterialCreateRequest = {
        name: material.name,
        material_id: material.id,
        nuclides: material.nuclides.map(nuc => {
          // Parse ZAID - might have library suffix like .80c
          const zaidStr = String(nuc.zaid);
          const zaidMatch = zaidStr.match(/^(\d+)/);
          const zaidNum = zaidMatch ? parseInt(zaidMatch[1], 10) : 0;
          
          return {
            zaid: zaidNum,
            fraction: nuc.fraction,
            nlib: nuc.nlib || null,
            plib: nuc.plib || null,
          };
        }),
        density: material.density || null,
        density_unit: material.density ? 'g/cm3' : null,
      };

      await addMaterial(request);
      setSnackbar({
        open: true,
        message: `Material "${material.name}" imported to your library!`,
        severity: 'success',
      });
    } catch (error) {
      console.error('Failed to import material:', error);
      setSnackbar({
        open: true,
        message: `Failed to import material: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      });
    }
  }, [addMaterial]);

  // Handlers for inline name editing
  const handleStartEditing = () => {
    if (file) {
      setEditedName(file.displayName);
      setIsEditingName(true);
    }
  };

  const handleSaveName = () => {
    if (file && editedName.trim() && editedName !== file.displayName) {
      renameFile(file.id, editedName.trim());
    }
    setIsEditingName(false);
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  if (!file) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          MCNP input file not found. It may have been removed from the workspace.
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/mcnp')}
        >
          Back to MCNP
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
              onClick={() => navigate('/mcnp')}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              MCNP
            </Link>
            <Typography color="text.primary" fontWeight={500} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Code fontSize="small" />
              {file.displayName}
            </Typography>
          </Breadcrumbs>
        </Box>
      </Fade>

      {/* Header Section */}
      <Fade in timeout={500}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 4,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.05)} 0%, ${alpha(theme.palette.info.main, 0.1)} 100%)`,
            border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3, flexWrap: 'wrap' }}>
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: alpha(theme.palette.info.main, 0.1),
                  color: theme.palette.info.main,
                }}
              >
                <Code sx={{ fontSize: 36 }} />
              </Box>

              <Box sx={{ flex: 1, minWidth: 250 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {isEditingName ? (
                    <TextField
                      size="small"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      sx={{ 
                        minWidth: 200,
                        '& .MuiInputBase-input': { 
                          fontSize: '1.5rem', 
                          fontWeight: 700,
                          py: 0.5,
                        } 
                      }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={handleSaveName} color="primary">
                              <Check />
                            </IconButton>
                            <IconButton size="small" onClick={handleCancelEdit}>
                              <Close />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  ) : (
                    <>
                      <Typography variant="h4" fontWeight={700}>
                        {file.displayName}
                      </Typography>
                      <Tooltip title="Edit name">
                        <IconButton size="small" onClick={handleStartEditing}>
                          <Edit sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                  <Chip
                    label="MCNP Input"
                    size="small"
                    sx={{
                      bgcolor: alpha(theme.palette.info.main, 0.1),
                      color: theme.palette.info.main,
                      fontWeight: 600,
                    }}
                  />
                </Box>

                {metadata && (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    <Chip
                      icon={<Inventory />}
                      label={`${metadata.material_count} materials`}
                      size="small"
                      variant="outlined"
                    />
                    {metadata.pert_count > 0 && (
                      <Chip
                        icon={<Calculate />}
                        label={`${metadata.pert_count} PERT cards`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                )}

                <Typography variant="body2" color="text.secondary">
                  Original file: {file.name}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  onClick={() => navigate('/mcnp')}
                >
                  Back
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Fade>

      {/* File Info Section */}
      {metadata && (
        <Fade in timeout={600}>
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}
            >
              File Info
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                  <InfoItem label="File ID" value={metadata.file_id?.substring(0, 12) + '...' || 'N/A'} icon={<Description sx={{ fontSize: 18 }} />} copyable />
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                  <InfoItem label="File Size" value={`${(file.size / 1024).toFixed(1)} KB`} />
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                  <InfoItem label="Materials" value={metadata.material_count} icon={<Inventory sx={{ fontSize: 18 }} />} />
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                  <InfoItem label="PERT Cards" value={metadata.pert_count} icon={<Calculate sx={{ fontSize: 18 }} />} />
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </Fade>
      )}

      {/* Materials Section - Flip Cards */}
      {metadata && metadata.materials_detail && Object.keys(metadata.materials_detail).length > 0 && (
        <Fade in timeout={700}>
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}
              >
                Materials ({Object.keys(metadata.materials_detail).length})
              </Typography>
              <Button
                size="small"
                startIcon={<OpenInNew />}
                onClick={() => navigate('/materials')}
              >
                Go to Materials Library
              </Button>
            </Box>
            
            <Grid container spacing={3}>
              {Object.values(metadata.materials_detail).map((material, index) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={material.id}>
                  <MaterialFlipCard
                    material={material}
                    onImport={handleImportMaterial}
                    isImported={importedMaterialIds.has(material.id)}
                    delay={index * 50}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        </Fade>
      )}

      {/* PERT Cards Section */}
      {metadata && metadata.pert_count > 0 && (
        <Fade in timeout={800}>
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}
            >
              PERT Cards ({metadata.pert_count})
            </Typography>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {metadata.pert_ids?.map((id: number) => (
                  <Chip
                    key={id}
                    label={`PERT ${id}`}
                    variant="outlined"
                    color="info"
                    sx={{ fontFamily: 'monospace' }}
                  />
                ))}
              </Box>
            </Paper>
          </Box>
        </Fade>
      )}

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MCNPInputFilePage;
