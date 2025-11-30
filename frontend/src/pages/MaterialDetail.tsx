/**
 * Material Detail Page
 * 
 * View and edit a single material. Provides nuclide table,
 * conversion actions, and export functionality.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Divider,
  Grid,
  Card,
  CardContent,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  alpha,
  useTheme,
  Collapse,
  Fade,
  InputAdornment,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  SwapHoriz as ConvertIcon,
  MoreVert as MoreVertIcon,
  Transform as TransformIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Science as ScienceIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Balance as NormalizeIcon,
} from '@mui/icons-material';
import { useMaterials } from '../contexts/MaterialsContext';
import { 
  formatZaid, 
  isNaturalElement, 
  ELEMENT_DATA,
  normalizeFractions,
  convertTemperature,
  convertDensity,
} from '../types/material';
import type { 
  Nuclide, 
  MaterialInfo, 
  DensityUnit, 
  TemperatureUnit,
} from '../types/material';

export const MaterialDetail: React.FC = () => {
  const { materialId } = useParams<{ materialId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const {
    materials,
    isLoading,
    saveMaterial,
    removeMaterial,
    convertMaterialToWeight,
    convertMaterialToAtomic,
    expandMaterialNaturalElements,
    getMaterialMCNP,
    getMaterialAnalysis,
  } = useMaterials();

  const material = materials.find(m => m.id === materialId);
  
  // Local editing state
  const [name, setName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [matId, setMatId] = useState(1);
  const [nlib, setNlib] = useState('');
  const [plib, setPlib] = useState('');
  const [ylib, setYlib] = useState('');
  const [nuclides, setNuclides] = useState<Nuclide[]>([]);
  const [density, setDensity] = useState<number | null>(null);
  const [densityUnit, setDensityUnit] = useState<DensityUnit>('g/cm3');
  const [temperature, setTemperature] = useState<number | null>(null);
  const [temperatureUnit, setTemperatureUnit] = useState<TemperatureUnit>('K');
  const [hasChanges, setHasChanges] = useState(false);
  
  // UI state
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [mcnpText, setMcnpText] = useState('');
  const [materialInfo, setMaterialInfo] = useState<MaterialInfo | null>(null);
  const [mcnpLibrariesOpen, setMcnpLibrariesOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success'
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mcnpDialogOpen, setMcnpDialogOpen] = useState(false);
  const [addNuclideDialogOpen, setAddNuclideDialogOpen] = useState(false);
  const [newNuclideZaid, setNewNuclideZaid] = useState('');
  const [newNuclideFraction, setNewNuclideFraction] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Load material data
  useEffect(() => {
    if (material) {
      setName(material.name);
      setEditedName(material.name);
      setMatId(material.material_id);
      setNlib(material.nlib || '');
      setPlib(material.plib || '');
      setYlib(material.ylib || '');
      setNuclides([...material.nuclides]);
      setDensity(material.density ?? null);
      setDensityUnit(material.density_unit || 'g/cm3');
      setTemperature(material.temperature ?? null);
      setTemperatureUnit(material.temperature_unit || 'K');
      setHasChanges(false);
    }
  }, [material]);

  // Load analysis
  useEffect(() => {
    if (materialId) {
      getMaterialAnalysis(materialId)
        .then(setMaterialInfo)
        .catch(console.error);
    }
  }, [materialId, getMaterialAnalysis, nuclides]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!material) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Material not found</Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/materials')} sx={{ mt: 2 }}>
          Back to Materials
        </Button>
      </Box>
    );
  }

  const fractionType = nuclides.some(n => n.fraction < 0) ? 'Weight' : 'Atomic';
  const naturalElements = nuclides.filter(n => isNaturalElement(n.zaid));

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveMaterial(materialId!, {
        name,
        material_id: matId,
        nlib: nlib || null,
        plib: plib || null,
        ylib: ylib || null,
        nuclides,
        density,
        density_unit: densityUnit,
        temperature,
        temperature_unit: temperatureUnit,
      });
      setHasChanges(false);
      setSnackbar({ open: true, message: 'Material saved successfully', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to save material', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await removeMaterial(materialId!);
      navigate('/materials');
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to delete material', severity: 'error' });
    }
    setDeleteDialogOpen(false);
  };

  const handleConvertToWeight = async () => {
    setProcessing(true);
    try {
      await convertMaterialToWeight(materialId!);
      setSnackbar({ open: true, message: 'Converted to weight fractions', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Conversion failed', severity: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const handleConvertToAtomic = async () => {
    setProcessing(true);
    try {
      await convertMaterialToAtomic(materialId!);
      setSnackbar({ open: true, message: 'Converted to atomic fractions', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Conversion failed', severity: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const handleExpandNatural = async () => {
    setProcessing(true);
    try {
      await expandMaterialNaturalElements(materialId!);
      setSnackbar({ open: true, message: 'Natural elements expanded', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Expansion failed', severity: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  // Name editing handlers
  const handleStartEditingName = () => {
    setEditedName(name);
    setIsEditingName(true);
  };

  const handleSaveName = () => {
    setName(editedName);
    setIsEditingName(false);
    setHasChanges(true);
  };

  const handleCancelEditName = () => {
    setEditedName(name);
    setIsEditingName(false);
  };

  const handleKeyDownName = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      handleCancelEditName();
    }
  };

  // Normalize fractions handler
  const handleNormalize = () => {
    const normalized = normalizeFractions(nuclides);
    setNuclides(normalized);
    setHasChanges(true);
    setSnackbar({ open: true, message: 'Fractions normalized to sum to 1.0', severity: 'success' });
  };

  // Density unit conversion handler
  const handleDensityUnitChange = (newUnit: DensityUnit) => {
    if (density !== null && newUnit !== densityUnit) {
      // Calculate average atomic mass for conversion
      // This is a simplified approximation - for accurate conversion we'd need actual atomic masses
      const avgMass = calculateAverageAtomicMass();
      const converted = convertDensity(density, densityUnit, newUnit, avgMass);
      if (converted !== null) {
        setDensity(converted);
      }
    }
    setDensityUnit(newUnit);
    setHasChanges(true);
  };

  // Temperature unit conversion handler
  const handleTemperatureUnitChange = (newUnit: TemperatureUnit) => {
    if (temperature !== null && newUnit !== temperatureUnit) {
      const converted = convertTemperature(temperature, temperatureUnit, newUnit);
      setTemperature(converted);
    }
    setTemperatureUnit(newUnit);
    setHasChanges(true);
  };

  // Calculate average atomic mass from nuclides
  const calculateAverageAtomicMass = (): number => {
    if (nuclides.length === 0) return 1;
    // Approximate atomic mass as mass number from ZAID
    const totalFraction = nuclides.reduce((sum, n) => sum + Math.abs(n.fraction), 0);
    if (totalFraction === 0) return 1;
    const weightedSum = nuclides.reduce((sum, n) => {
      const massNumber = n.zaid % 1000;
      // If natural element (mass=0), estimate ~2*Z
      const mass = massNumber > 0 ? massNumber : Math.floor(n.zaid / 1000) * 2;
      return sum + mass * Math.abs(n.fraction);
    }, 0);
    return weightedSum / totalFraction;
  };

  const handleShowMCNP = async () => {
    try {
      const text = await getMaterialMCNP(materialId!);
      setMcnpText(text);
      setMcnpDialogOpen(true);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to generate MCNP format', severity: 'error' });
    }
  };

  const handleCopyMCNP = () => {
    navigator.clipboard.writeText(mcnpText);
    setSnackbar({ open: true, message: 'Copied to clipboard', severity: 'success' });
  };

  const handleRemoveNuclide = (zaid: number) => {
    setNuclides(prev => prev.filter(n => n.zaid !== zaid));
    setHasChanges(true);
  };

  const handleAddNuclide = () => {
    const zaid = parseInt(newNuclideZaid);
    const fraction = parseFloat(newNuclideFraction);
    
    if (isNaN(zaid) || isNaN(fraction)) {
      setSnackbar({ open: true, message: 'Invalid ZAID or fraction', severity: 'error' });
      return;
    }
    
    if (nuclides.some(n => n.zaid === zaid)) {
      setSnackbar({ open: true, message: 'Nuclide already exists', severity: 'error' });
      return;
    }
    
    setNuclides(prev => [...prev, { zaid, fraction, nlib: null, plib: null, ylib: null }]);
    setHasChanges(true);
    setAddNuclideDialogOpen(false);
    setNewNuclideZaid('');
    setNewNuclideFraction('');
  };

  const handleFractionChange = (zaid: number, newFraction: string) => {
    const fraction = parseFloat(newFraction);
    if (!isNaN(fraction)) {
      setNuclides(prev => prev.map(n => 
        n.zaid === zaid ? { ...n, fraction } : n
      ));
      setHasChanges(true);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Hero Header */}
      <Fade in timeout={500}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 4,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0.12)} 100%)`,
            position: 'relative',
            overflow: 'hidden',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -60,
              right: -60,
              width: 150,
              height: 150,
              borderRadius: '50%',
              background: alpha(theme.palette.primary.main, 0.15),
              filter: 'blur(40px)',
            },
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton 
                  onClick={() => navigate('/materials')}
                  sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
                >
                  <BackIcon />
                </IconButton>
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
                  <ScienceIcon sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    {isEditingName ? (
                      <TextField
                        size="small"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        onKeyDown={handleKeyDownName}
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
                                <CheckIcon />
                              </IconButton>
                              <IconButton size="small" onClick={handleCancelEditName}>
                                <CloseIcon />
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    ) : (
                      <>
                        <Typography variant="h4" fontWeight={700}>
                          {name}
                        </Typography>
                        <Tooltip title="Edit name">
                          <IconButton size="small" onClick={handleStartEditingName}>
                            <EditIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Box>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'primary.main', 
                      fontFamily: 'monospace', 
                      fontWeight: 600,
                      fontSize: '1rem',
                    }}
                  >
                    m{matId}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleShowMCNP}
                  sx={{ bgcolor: 'background.paper' }}
                >
                  MCNP Format
                </Button>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                >
                  Save
                </Button>
                <IconButton 
                  onClick={(e) => setAnchorEl(e.currentTarget)}
                  sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
                >
                  <MoreVertIcon />
                </IconButton>
              </Box>
            </Box>

            {/* Material Stats */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
              <Chip
                label={`${nuclides.length} nuclides`}
                size="small"
                sx={{ 
                  bgcolor: alpha(theme.palette.info.main, 0.1),
                  color: theme.palette.info.main,
                  fontWeight: 600,
                }}
              />
              <Chip
                label={fractionType === 'Weight' ? '⚖️ Weight Fractions' : '⚛️ Atomic Fractions'}
                size="small"
                color={fractionType === 'Weight' ? 'primary' : 'secondary'}
                sx={{ fontWeight: 600 }}
              />
              {naturalElements.length > 0 && (
                <Chip
                  label={`${naturalElements.length} Natural Elements`}
                  size="small"
                  color="warning"
                  sx={{ fontWeight: 600 }}
                />
              )}
              {(nlib || plib || ylib) && (
                <Chip
                  label="MCNP Libraries Set"
                  size="small"
                  sx={{ 
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    color: theme.palette.success.main,
                    fontWeight: 600,
                  }}
                />
              )}
            </Box>
          </Box>
        </Paper>
      </Fade>

      {hasChanges && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You have unsaved changes
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left Column - Material Info & Actions */}
        <Grid item xs={12} md={4}>
          {/* Properties Card */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Material Properties</Typography>
              <TextField
                label="Material ID"
                type="number"
                value={matId}
                onChange={(e) => { setMatId(parseInt(e.target.value) || 1); setHasChanges(true); }}
                fullWidth
                size="small"
                helperText="MCNP material number (mXXX)"
                sx={{ mb: 2 }}
              />
              
              {/* Density Field */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  label="Density"
                  type="number"
                  value={density ?? ''}
                  onChange={(e) => { 
                    const val = e.target.value ? parseFloat(e.target.value) : null;
                    setDensity(val);
                    setHasChanges(true);
                  }}
                  size="small"
                  sx={{ flex: 1 }}
                  inputProps={{ step: 'any' }}
                />
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Unit</InputLabel>
                  <Select
                    value={densityUnit}
                    label="Unit"
                    onChange={(e) => handleDensityUnitChange(e.target.value as DensityUnit)}
                  >
                    <MenuItem value="g/cm3">g/cm³</MenuItem>
                    <MenuItem value="atoms/barn-cm">atoms/b-cm</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Temperature Field */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  label="Temperature"
                  type="number"
                  value={temperature ?? ''}
                  onChange={(e) => { 
                    const val = e.target.value ? parseFloat(e.target.value) : null;
                    setTemperature(val);
                    setHasChanges(true);
                  }}
                  size="small"
                  sx={{ flex: 1 }}
                  inputProps={{ step: 'any' }}
                />
                <FormControl size="small" sx={{ minWidth: 90 }}>
                  <InputLabel>Unit</InputLabel>
                  <Select
                    value={temperatureUnit}
                    label="Unit"
                    onChange={(e) => handleTemperatureUnitChange(e.target.value as TemperatureUnit)}
                  >
                    <MenuItem value="K">K</MenuItem>
                    <MenuItem value="MeV">MeV</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </CardContent>
          </Card>

          {/* MCNP Libraries Card - Collapsible */}
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ pb: 1 }}>
              <Box 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
                onClick={() => setMcnpLibrariesOpen(!mcnpLibrariesOpen)}
              >
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
                    MCNP Libraries
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Default cross-section libraries for this material
                  </Typography>
                </Box>
                <IconButton size="small">
                  {mcnpLibrariesOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
              <Collapse in={mcnpLibrariesOpen}>
                <Box sx={{ mt: 2 }}>
                  <Alert severity="info" sx={{ mb: 2, fontSize: '0.75rem' }}>
                    These are MCNP-specific library suffixes. They specify which nuclear data libraries to use for transport calculations.
                  </Alert>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        label="nlib (neutron)"
                        value={nlib}
                        onChange={(e) => { setNlib(e.target.value); setHasChanges(true); }}
                        fullWidth
                        size="small"
                        placeholder="e.g., 80c"
                        helperText="Neutron cross-section library"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="plib (photon)"
                        value={plib}
                        onChange={(e) => { setPlib(e.target.value); setHasChanges(true); }}
                        fullWidth
                        size="small"
                        placeholder="e.g., 04p"
                        helperText="Photon interaction library"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="ylib (dosimetry)"
                        value={ylib}
                        onChange={(e) => { setYlib(e.target.value); setHasChanges(true); }}
                        fullWidth
                        size="small"
                        helperText="Dosimetry library"
                      />
                    </Grid>
                  </Grid>
                </Box>
              </Collapse>
            </CardContent>
          </Card>

          {/* Analysis Card */}
          {materialInfo && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Analysis</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="body2">
                    <strong>Fraction Type:</strong> {materialInfo.fraction_type}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Unique Elements:</strong> {materialInfo.unique_elements.length}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Natural Elements:</strong> {materialInfo.natural_element_count}
                  </Typography>
                  {materialInfo.natural_elements.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                      {materialInfo.natural_elements.map(z => (
                        <Chip 
                          key={z} 
                          label={formatZaid(z)} 
                          size="small" 
                          color="warning" 
                          variant="outlined" 
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Actions Card */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Actions</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<NormalizeIcon />}
                  onClick={handleNormalize}
                  disabled={nuclides.length === 0}
                >
                  Normalize Fractions
                </Button>
                <Divider sx={{ my: 1 }} />
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={processing ? <CircularProgress size={20} /> : <ConvertIcon />}
                  onClick={handleConvertToWeight}
                  disabled={processing || fractionType === 'Weight'}
                >
                  Convert to Weight Fractions
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={processing ? <CircularProgress size={20} /> : <ConvertIcon />}
                  onClick={handleConvertToAtomic}
                  disabled={processing || fractionType === 'Atomic'}
                >
                  Convert to Atomic Fractions
                </Button>
                <Divider sx={{ my: 1 }} />
                <Button
                  fullWidth
                  variant="outlined"
                  color="warning"
                  startIcon={processing ? <CircularProgress size={20} /> : <TransformIcon />}
                  onClick={handleExpandNatural}
                  disabled={processing || naturalElements.length === 0}
                >
                  Expand Natural Elements ({naturalElements.length})
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Nuclide Table */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Nuclides</Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={() => setAddNuclideDialogOpen(true)}
              >
                Add Nuclide
              </Button>
            </Box>
            
            <TableContainer sx={{ maxHeight: 500 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ZAID</TableCell>
                    <TableCell>Element</TableCell>
                    <TableCell align="right">Fraction</TableCell>
                    <TableCell>Libraries</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {nuclides.map((nuclide) => {
                    const z = Math.floor(nuclide.zaid / 1000);
                    const element = ELEMENT_DATA[z];
                    return (
                      <TableRow key={nuclide.zaid} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {nuclide.zaid}
                            {isNaturalElement(nuclide.zaid) && (
                              <Chip label="nat" size="small" color="warning" variant="outlined" />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Tooltip title={element?.name || 'Unknown'}>
                            <span>{formatZaid(nuclide.zaid)}</span>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            value={nuclide.fraction}
                            onChange={(e) => handleFractionChange(nuclide.zaid, e.target.value)}
                            size="small"
                            type="number"
                            inputProps={{ step: 'any', style: { textAlign: 'right' } }}
                            sx={{ width: 140 }}
                          />
                        </TableCell>
                        <TableCell>
                          {nuclide.nlib || nuclide.plib || nuclide.ylib ? (
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              {nuclide.nlib && <Chip label={nuclide.nlib} size="small" />}
                              {nuclide.plib && <Chip label={nuclide.plib} size="small" />}
                              {nuclide.ylib && <Chip label={nuclide.ylib} size="small" />}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">—</Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveNuclide(nuclide.zaid)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* More Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => { setAnchorEl(null); /* duplicate logic */ }}>
          <ListItemIcon><CopyIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Duplicate Material</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { setAnchorEl(null); setDeleteDialogOpen(true); }} sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Delete Material</ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Material?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* MCNP Dialog */}
      <Dialog open={mcnpDialogOpen} onClose={() => setMcnpDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>MCNP Format</DialogTitle>
        <DialogContent>
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2, 
              bgcolor: 'grey.900', 
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              color: 'grey.100',
              overflowX: 'auto',
            }}
          >
            {mcnpText}
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMcnpDialogOpen(false)}>Close</Button>
          <Button onClick={handleCopyMCNP} startIcon={<CopyIcon />} variant="contained">
            Copy to Clipboard
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Nuclide Dialog */}
      <Dialog open={addNuclideDialogOpen} onClose={() => setAddNuclideDialogOpen(false)}>
        <DialogTitle>Add Nuclide</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="ZAID"
              value={newNuclideZaid}
              onChange={(e) => setNewNuclideZaid(e.target.value)}
              placeholder="e.g., 1001 for H-1, 6000 for nat-C"
              fullWidth
              type="number"
              helperText="ZZAAA format: ZZ=atomic number, AAA=mass number (000 for natural)"
            />
            <TextField
              label="Fraction"
              value={newNuclideFraction}
              onChange={(e) => setNewNuclideFraction(e.target.value)}
              placeholder="e.g., 0.5 or -0.5"
              fullWidth
              type="number"
              inputProps={{ step: 'any' }}
              helperText="Positive for atomic, negative for weight fractions"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddNuclideDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddNuclide} variant="contained">Add</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
