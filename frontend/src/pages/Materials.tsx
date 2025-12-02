/**
 * Materials Page
 * 
 * Main page for managing MCNP materials. Shows user's saved materials
 * and provides access to preset material library.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Button,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Fade,
  Grow,
  alpha,
  useTheme,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Science as ScienceIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ContentCopy as CopyIcon,
  MoreVert as MoreVertIcon,
  FileUpload as ImportIcon,
  Inventory as InventoryIcon,
  LocalLibrary as LibraryIcon,
  Visibility as ViewIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import { useMaterials } from '../contexts/MaterialsContext';
import { isNaturalElement, formatZaid } from '../types/material';
import type { Material, PresetMaterial, PresetCategory } from '../types/material';
import {
  CATEGORY_INFO,
  getPresetsByCategory,
  getAllCategories,
  searchPresets,
} from '../data/presetMaterials';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <Fade in={value === index} timeout={300}>
      <div role="tabpanel" hidden={value !== index} style={{ display: value !== index ? 'none' : 'block' }}>
        {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
      </div>
    </Fade>
  );
}

// Flip card component for preset materials
interface PresetFlipCardProps {
  preset: PresetMaterial;
  onAdd: (preset: PresetMaterial) => void;
  delay?: number;
}

const PresetFlipCard: React.FC<PresetFlipCardProps> = ({ preset, onAdd, delay = 0 }) => {
  const theme = useTheme();
  const [isFlipped, setIsFlipped] = useState(false);

  const fractionType = preset.nuclides.some(n => n.fraction < 0) ? 'Weight' : 'Atomic';

  return (
    <Grow in timeout={400 + delay}>
      <Box
        sx={{
          perspective: 1000,
          height: 320,
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
                background: `linear-gradient(90deg, ${theme.palette.secondary.main}, ${alpha(theme.palette.secondary.main, 0.6)})`,
                borderRadius: '12px 12px 0 0',
              },
            }}
          >
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {preset.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                    {preset.description}
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ opacity: 0.15 }}>
                  {CATEGORY_INFO[preset.category].icon}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                <Chip
                  size="small"
                  label={`${preset.nuclides.length} nuclides`}
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
                {preset.nuclides.some(n => isNaturalElement(n.zaid)) && (
                  <Chip
                    size="small"
                    label="Natural"
                    color="warning"
                    variant="outlined"
                    sx={{ fontSize: '0.75rem' }}
                  />
                )}
              </Box>

              <Box sx={{ mt: 'auto', display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ViewIcon />}
                  onClick={() => setIsFlipped(true)}
                  sx={{ flex: 1 }}
                >
                  View Composition
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => onAdd(preset)}
                  sx={{ flex: 1 }}
                >
                  Add
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
              bgcolor: alpha(theme.palette.primary.main, 0.02),
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
                  {preset.nuclides.map((nuc, i) => (
                    <Box
                      key={i}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 0.5,
                        px: 1,
                        borderRadius: 0.5,
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) },
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
                        {nuc.fraction > 0
                          ? nuc.fraction.toFixed(6)
                          : `${Math.abs(nuc.fraction).toFixed(6)} wt`}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>

              <Button
                fullWidth
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => onAdd(preset)}
              >
                Add to My Materials
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Grow>
  );
};

export const Materials: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { materials, isLoading, error, addMaterial, removeMaterial } = useMaterials();
  
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PresetCategory | 'all'>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null);
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetMaterial | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuMaterial, setMenuMaterial] = useState<Material | null>(null);

  // Filter user materials by search
  const filteredMaterials = materials.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.material_id.toString().includes(searchQuery)
  );

  // Filter presets by category and search
  const filteredPresets = selectedCategory === 'all'
    ? searchPresets(searchQuery)
    : getPresetsByCategory(selectedCategory).filter(
        m => m.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, material: Material) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setMenuMaterial(material);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuMaterial(null);
  };

  const handleDeleteClick = () => {
    if (menuMaterial) {
      setMaterialToDelete(menuMaterial);
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (materialToDelete) {
      await removeMaterial(materialToDelete.id);
      setDeleteDialogOpen(false);
      setMaterialToDelete(null);
    }
  };

  const handleAddPreset = async (preset: PresetMaterial) => {
    try {
      const newMaterial = await addMaterial({
        name: preset.name,
        material_id: preset.material_id,
        nlib: preset.nlib,
        plib: preset.plib,
        ylib: preset.ylib,
        nuclides: preset.nuclides,
      });
      setPresetDialogOpen(false);
      setSelectedPreset(null);
      navigate(`/materials/${newMaterial.id}`);
    } catch (err) {
      console.error('Failed to add preset:', err);
    }
  };

  const handleDuplicateMaterial = async () => {
    if (menuMaterial) {
      try {
        await addMaterial({
          name: `${menuMaterial.name} (copy)`,
          material_id: menuMaterial.material_id + 1,
          nlib: menuMaterial.nlib,
          plib: menuMaterial.plib,
          ylib: menuMaterial.ylib,
          nuclides: menuMaterial.nuclides,
        });
      } catch (err) {
        console.error('Failed to duplicate material:', err);
      }
    }
    handleMenuClose();
  };

  const getFractionType = (material: Material | PresetMaterial): string => {
    if (material.nuclides.length === 0) return 'Empty';
    return material.nuclides.some(n => n.fraction < 0) ? 'Weight' : 'Atomic';
  };

  const hasNaturalElements = (material: Material | PresetMaterial): boolean => {
    return material.nuclides.some(n => isNaturalElement(n.zaid));
  };

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
            background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.12)} 100%)`,
            position: 'relative',
            overflow: 'hidden',
            border: `1px solid ${alpha(theme.palette.secondary.main, 0.1)}`,
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -80,
              right: -80,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: alpha(theme.palette.secondary.main, 0.15),
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
              background: alpha(theme.palette.primary.main, 0.1),
              filter: 'blur(40px)',
            },
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(theme.palette.secondary.main, 0.15),
                    color: theme.palette.secondary.main,
                  }}
                >
                  <ScienceIcon sx={{ fontSize: 32 }} />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight={700}>
                    Materials
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Manage your material definitions and compositions
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<ImportIcon />}
                  onClick={() => navigate('/materials/import')}
                  sx={{ borderColor: alpha(theme.palette.secondary.main, 0.5) }}
                >
                  Import from MCNP
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/materials/create')}
                  color="secondary"
                >
                  New Material
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Fade>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab 
            icon={<InventoryIcon />} 
            iconPosition="start" 
            label={`My Materials (${materials.length})`} 
          />
          <Tab 
            icon={<LibraryIcon />} 
            iconPosition="start" 
            label="Preset Library" 
          />
        </Tabs>
      </Box>

      {/* My Materials Tab */}
      <TabPanel value={tabValue} index={0}>
        {/* Search */}
        <TextField
          fullWidth
          placeholder="Search materials by name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 3 }}
        />

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredMaterials.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <ScienceIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No materials yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create a new material or import from an MCNP input file
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="outlined"
                startIcon={<LibraryIcon />}
                onClick={() => setTabValue(1)}
              >
                Browse Presets
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/materials/create')}
              >
                Create Material
              </Button>
            </Box>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {filteredMaterials.map((material, index) => (
              <Grid item xs={12} sm={6} md={4} key={material.id}>
                <Grow in timeout={300 + index * 50}>
                  <Card
                    sx={{
                      height: '100%',
                      position: 'relative',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: `0 12px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
                      },
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 4,
                        background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${alpha(theme.palette.primary.main, 0.6)})`,
                        borderRadius: '12px 12px 0 0',
                      },
                    }}
                  >
                    {/* Menu button positioned absolutely - OUTSIDE CardActionArea */}
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMenuOpen(e, material);
                      }}
                      sx={{
                        position: 'absolute',
                        top: 12,
                        right: 8,
                        zIndex: 2,
                        bgcolor: 'background.paper',
                        boxShadow: 1,
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>

                    <CardActionArea
                      onClick={() => navigate(`/materials/${material.id}`)}
                      sx={{ height: '100%' }}
                    >
                      <CardContent sx={{ pr: 5 }}>
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="h6" fontWeight={600} noWrap>
                            {material.name}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              color: 'primary.main',
                              fontFamily: 'monospace',
                              fontWeight: 500,
                            }}
                          >
                            m{material.material_id}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                          <Chip
                            size="small"
                            label={`${material.nuclides.length} nuclides`}
                            variant="outlined"
                            sx={{ fontSize: '0.75rem' }}
                          />
                          <Chip
                            size="small"
                            label={getFractionType(material)}
                            color={getFractionType(material) === 'Weight' ? 'primary' : 'secondary'}
                            variant="outlined"
                            sx={{ fontSize: '0.75rem' }}
                          />
                          {hasNaturalElements(material) && (
                            <Chip
                              size="small"
                              label="Natural"
                              color="warning"
                              variant="outlined"
                              sx={{ fontSize: '0.75rem' }}
                            />
                          )}
                        </Box>

                        {/* MCNP Libraries - displayed separately */}
                        {(material.nlib || material.plib || material.ylib) && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                              MCNP Libraries
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {material.nlib && (
                                <Chip
                                  size="small"
                                  label={`nlib=${material.nlib}`}
                                  color="info"
                                  variant="outlined"
                                  sx={{ fontSize: '0.65rem', height: 20 }}
                                />
                              )}
                              {material.plib && (
                                <Chip
                                  size="small"
                                  label={`plib=${material.plib}`}
                                  color="secondary"
                                  variant="outlined"
                                  sx={{ fontSize: '0.65rem', height: 20 }}
                                />
                              )}
                              {material.ylib && (
                                <Chip
                                  size="small"
                                  label={`ylib=${material.ylib}`}
                                  color="warning"
                                  variant="outlined"
                                  sx={{ fontSize: '0.65rem', height: 20 }}
                                />
                              )}
                            </Box>
                          </Box>
                        )}

                        <Typography variant="caption" color="text.secondary">
                          Updated {new Date(material.updated_at).toLocaleDateString()}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grow>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* Preset Library Tab */}
      <TabPanel value={tabValue} index={1}>
        {/* Search and Category Filter */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search presets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300 }}
          />
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label="All"
              onClick={() => setSelectedCategory('all')}
              color={selectedCategory === 'all' ? 'primary' : 'default'}
              variant={selectedCategory === 'all' ? 'filled' : 'outlined'}
            />
            {getAllCategories().map((cat) => (
              <Chip
                key={cat}
                label={`${CATEGORY_INFO[cat].icon} ${CATEGORY_INFO[cat].label}`}
                onClick={() => setSelectedCategory(cat)}
                color={selectedCategory === cat ? 'primary' : 'default'}
                variant={selectedCategory === cat ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
        </Box>

        <Grid container spacing={2}>
          {filteredPresets.map((preset, index) => (
            <Grid item xs={12} sm={6} md={4} key={`${preset.name}-${index}`}>
              <PresetFlipCard
                preset={preset}
                onAdd={(p) => {
                  setSelectedPreset(p);
                  setPresetDialogOpen(true);
                }}
                delay={index * 50}
              />
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          if (menuMaterial) navigate(`/materials/${menuMaterial.id}`);
          handleMenuClose();
        }}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDuplicateMaterial}>
          <ListItemIcon><CopyIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Material?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{materialToDelete?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Preset Dialog */}
      <Dialog open={presetDialogOpen} onClose={() => setPresetDialogOpen(false)}>
        <DialogTitle>Add Preset Material</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Add "{selectedPreset?.name}" to your materials?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedPreset?.description}
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Nuclides:</strong> {selectedPreset?.nuclides.length}
            </Typography>
            <Typography variant="body2">
              <strong>Type:</strong> {selectedPreset && getFractionType(selectedPreset)} fractions
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPresetDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={() => selectedPreset && handleAddPreset(selectedPreset)} 
            variant="contained"
          >
            Add Material
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
