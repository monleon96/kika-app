/**
 * Material Editor Page
 * 
 * Create new materials from scratch or import from MCNP input files.
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Card,
  CardContent,
  Alert,
  Snackbar,
  Chip,
  Grid,
  Tabs,
  Tab,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  FileUpload as ImportIcon,
  CloudUpload as UploadIcon,
} from '@mui/icons-material';
import { useMaterials } from '../contexts/MaterialsContext';
import { parseMCNPMaterials } from '../services/materialService';
import { formatZaid } from '../types/material';
import type { Nuclide, MaterialData } from '../types/material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export const MaterialEditor: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addMaterial } = useMaterials();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const isImportMode = location.pathname.includes('/import');
  
  // Tab state
  const [tabValue, setTabValue] = useState(isImportMode ? 1 : 0);
  
  // Create new material state
  const [name, setName] = useState('New Material');
  const [matId, setMatId] = useState(1);
  const [nlib, setNlib] = useState('');
  const [plib, setPlib] = useState('');
  const [ylib, setYlib] = useState('');
  const [nuclides, setNuclides] = useState<Nuclide[]>([]);
  
  // Add nuclide state
  const [newZaid, setNewZaid] = useState('');
  const [newFraction, setNewFraction] = useState('');
  
  // Import state
  const [mcnpInput, setMcnpInput] = useState('');
  const [parsedMaterials, setParsedMaterials] = useState<MaterialData[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<Set<number>>(new Set());
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  
  // UI state
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success'
  });

  const handleAddNuclide = () => {
    const zaid = parseInt(newZaid);
    const fraction = parseFloat(newFraction);
    
    if (isNaN(zaid) || isNaN(fraction)) {
      setSnackbar({ open: true, message: 'Invalid ZAID or fraction', severity: 'error' });
      return;
    }
    
    if (nuclides.some(n => n.zaid === zaid)) {
      setSnackbar({ open: true, message: 'Nuclide already exists', severity: 'error' });
      return;
    }
    
    setNuclides(prev => [...prev, { zaid, fraction, nlib: null, plib: null, ylib: null }]);
    setNewZaid('');
    setNewFraction('');
  };

  const handleRemoveNuclide = (zaid: number) => {
    setNuclides(prev => prev.filter(n => n.zaid !== zaid));
  };

  const handleCreateMaterial = async () => {
    if (!name.trim()) {
      setSnackbar({ open: true, message: 'Please enter a material name', severity: 'error' });
      return;
    }
    
    if (nuclides.length === 0) {
      setSnackbar({ open: true, message: 'Please add at least one nuclide', severity: 'error' });
      return;
    }
    
    setSaving(true);
    try {
      const newMaterial = await addMaterial({
        name,
        material_id: matId,
        nlib: nlib || null,
        plib: plib || null,
        ylib: ylib || null,
        nuclides,
      });
      setSnackbar({ open: true, message: 'Material created successfully', severity: 'success' });
      navigate(`/materials/${newMaterial.id}`);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to create material', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleParseMCNP = async () => {
    if (!mcnpInput.trim()) {
      setSnackbar({ open: true, message: 'Please paste MCNP input content', severity: 'error' });
      return;
    }
    
    setParsing(true);
    setParseError(null);
    try {
      const result = await parseMCNPMaterials(mcnpInput);
      setParsedMaterials(result.materials);
      setSelectedMaterials(new Set(result.materials.map(m => m.material_id)));
      
      if (result.materials.length === 0) {
        setParseError('No material cards found in the input');
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse MCNP input');
    } finally {
      setParsing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setMcnpInput(content);
        // Auto-parse after upload
        handleParseMCNPWithContent(content);
      }
    };
    reader.onerror = () => {
      setSnackbar({ open: true, message: 'Failed to read file', severity: 'error' });
    };
    reader.readAsText(file);

    // Reset the input so the same file can be uploaded again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleParseMCNPWithContent = async (content: string) => {
    if (!content.trim()) return;
    
    setParsing(true);
    setParseError(null);
    try {
      const result = await parseMCNPMaterials(content);
      setParsedMaterials(result.materials);
      setSelectedMaterials(new Set(result.materials.map(m => m.material_id)));
      
      if (result.materials.length === 0) {
        setParseError('No material cards found in the input');
      } else {
        setSnackbar({ 
          open: true, 
          message: `Found ${result.materials.length} material(s)`, 
          severity: 'success' 
        });
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse MCNP input');
    } finally {
      setParsing(false);
    }
  };

  const handleToggleMaterial = (materialId: number) => {
    setSelectedMaterials(prev => {
      const next = new Set(prev);
      if (next.has(materialId)) {
        next.delete(materialId);
      } else {
        next.add(materialId);
      }
      return next;
    });
  };

  const handleImportSelected = async () => {
    if (selectedMaterials.size === 0) {
      setSnackbar({ open: true, message: 'Please select materials to import', severity: 'error' });
      return;
    }
    
    setSaving(true);
    let imported = 0;
    
    try {
      for (const mat of parsedMaterials) {
        if (selectedMaterials.has(mat.material_id)) {
          await addMaterial({
            name: `Material m${mat.material_id}`,
            material_id: mat.material_id,
            nlib: mat.nlib,
            plib: mat.plib,
            ylib: mat.ylib,
            nuclides: mat.nuclides,
          });
          imported++;
        }
      }
      
      setSnackbar({ 
        open: true, 
        message: `Successfully imported ${imported} material(s)`, 
        severity: 'success' 
      });
      navigate('/materials');
    } catch (err) {
      setSnackbar({ 
        open: true, 
        message: `Imported ${imported} materials before error`, 
        severity: 'error' 
      });
    } finally {
      setSaving(false);
    }
  };

  const getFractionType = (nuclides: Nuclide[]): string => {
    if (nuclides.length === 0) return 'Empty';
    return nuclides.some(n => n.fraction < 0) ? 'Weight' : 'Atomic';
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/materials')}>
          <BackIcon />
        </IconButton>
        <Box>
          <Typography variant="h4" fontWeight={600}>
            {tabValue === 0 ? 'Create Material' : 'Import from MCNP'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {tabValue === 0 
              ? 'Define a new material from scratch'
              : 'Parse material cards from MCNP input'
            }
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab icon={<AddIcon />} iconPosition="start" label="Create New" />
          <Tab icon={<ImportIcon />} iconPosition="start" label="Import from MCNP" />
        </Tabs>
      </Box>

      {/* Create New Material Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {/* Left - Properties */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Material Properties</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Material ID"
                    type="number"
                    value={matId}
                    onChange={(e) => setMatId(parseInt(e.target.value) || 1)}
                    fullWidth
                    helperText="MCNP material number (mXXX)"
                  />
                  <Divider />
                  <Typography variant="subtitle2" color="text.secondary">
                    Default Libraries
                  </Typography>
                  <TextField
                    label="nlib (neutron)"
                    value={nlib}
                    onChange={(e) => setNlib(e.target.value)}
                    fullWidth
                    size="small"
                    placeholder="e.g., 80c"
                  />
                  <TextField
                    label="plib (photon)"
                    value={plib}
                    onChange={(e) => setPlib(e.target.value)}
                    fullWidth
                    size="small"
                    placeholder="e.g., 04p"
                  />
                  <TextField
                    label="ylib (dosimetry)"
                    value={ylib}
                    onChange={(e) => setYlib(e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Right - Nuclides */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Nuclides</Typography>
              
              {/* Add nuclide form */}
              <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
                <TextField
                  label="ZAID"
                  value={newZaid}
                  onChange={(e) => setNewZaid(e.target.value)}
                  placeholder="e.g., 1001"
                  size="small"
                  type="number"
                  sx={{ width: 150 }}
                />
                <TextField
                  label="Fraction"
                  value={newFraction}
                  onChange={(e) => setNewFraction(e.target.value)}
                  placeholder="e.g., 0.5"
                  size="small"
                  type="number"
                  inputProps={{ step: 'any' }}
                  sx={{ width: 150 }}
                />
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddNuclide}
                >
                  Add
                </Button>
              </Box>

              {nuclides.length === 0 ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Add nuclides using the form above. Use positive fractions for atomic, negative for weight.
                </Alert>
              ) : (
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>ZAID</TableCell>
                        <TableCell>Element</TableCell>
                        <TableCell align="right">Fraction</TableCell>
                        <TableCell align="center">Remove</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {nuclides.map((nuclide) => (
                          <TableRow key={nuclide.zaid}>
                            <TableCell>{nuclide.zaid}</TableCell>
                            <TableCell>{formatZaid(nuclide.zaid)}</TableCell>
                            <TableCell align="right">{nuclide.fraction}</TableCell>
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
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip label={`${nuclides.length} nuclides`} variant="outlined" />
                  <Chip 
                    label={getFractionType(nuclides)} 
                    color={getFractionType(nuclides) === 'Weight' ? 'primary' : 'secondary'}
                    variant="outlined" 
                  />
                </Box>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                  onClick={handleCreateMaterial}
                  disabled={saving || nuclides.length === 0}
                >
                  Create Material
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Import from MCNP Tab */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          {/* Input Area */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h6" gutterBottom>MCNP Input</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Upload an MCNP input file or paste content below. Material cards (mXXX) will be automatically detected.
                  </Typography>
                </Box>
                <Box>
                  <input
                    ref={fileInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<UploadIcon />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload File
                  </Button>
                </Box>
              </Box>
              <TextField
                multiline
                rows={12}
                fullWidth
                value={mcnpInput}
                onChange={(e) => setMcnpInput(e.target.value)}
                placeholder={`c Example MCNP materials
m1    1001.80c 0.666667
      8016.80c 0.333333
      
m2    26000 -1.0  $ Natural iron`}
                sx={{ 
                  fontFamily: 'monospace',
                  '& .MuiInputBase-input': { fontFamily: 'monospace' }
                }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleParseMCNP}
                  disabled={parsing || !mcnpInput.trim()}
                  startIcon={parsing ? <CircularProgress size={20} /> : <ImportIcon />}
                >
                  Parse Materials
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* Parse Results */}
          {parseError && (
            <Grid item xs={12}>
              <Alert severity="error">{parseError}</Alert>
            </Grid>
          )}

          {parsedMaterials.length > 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Found {parsedMaterials.length} Material(s)
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="text"
                      onClick={() => setSelectedMaterials(new Set(parsedMaterials.map(m => m.material_id)))}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="text"
                      onClick={() => setSelectedMaterials(new Set())}
                    >
                      Deselect All
                    </Button>
                  </Box>
                </Box>

                <Grid container spacing={2}>
                  {parsedMaterials.map((mat) => (
                    <Grid item xs={12} sm={6} md={4} key={mat.material_id}>
                      <Card 
                        variant="outlined"
                        sx={{ 
                          cursor: 'pointer',
                          borderColor: selectedMaterials.has(mat.material_id) ? 'primary.main' : 'divider',
                          borderWidth: selectedMaterials.has(mat.material_id) ? 2 : 1,
                          bgcolor: selectedMaterials.has(mat.material_id) ? 'action.selected' : 'background.paper',
                        }}
                        onClick={() => handleToggleMaterial(mat.material_id)}
                      >
                        <CardContent>
                          <Typography variant="h6">m{mat.material_id}</Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                            <Chip
                              size="small"
                              label={`${mat.nuclides.length} nuclides`}
                              variant="outlined"
                            />
                            <Chip
                              size="small"
                              label={getFractionType(mat.nuclides)}
                              color={getFractionType(mat.nuclides) === 'Weight' ? 'primary' : 'secondary'}
                              variant="outlined"
                            />
                            {mat.nlib && <Chip size="small" label={`nlib=${mat.nlib}`} />}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                  <Button
                    variant="contained"
                    size="large"
                    disabled={saving || selectedMaterials.size === 0}
                    onClick={handleImportSelected}
                    startIcon={saving ? <CircularProgress size={20} /> : <ImportIcon />}
                  >
                    Import {selectedMaterials.size} Material(s)
                  </Button>
                </Box>
              </Paper>
            </Grid>
          )}
        </Grid>
      </TabPanel>

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
