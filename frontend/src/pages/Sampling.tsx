/**
 * Sampling Page
 * 
 * GUI for configuring nuclear data perturbation sampling
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Switch,
  Chip,
  Autocomplete,
  IconButton,
  Tooltip,
  Alert,
  AlertTitle,
  Collapse,
  Divider,
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  alpha,
  useTheme,
  Fade,
} from '@mui/material';
import {
  Add,
  Delete,
  Download,
  ContentCopy,
  PlayArrow,
  Settings,
  ExpandMore,
  ExpandLess,
  Warning,
  CheckCircle,
  Code,
  Terminal,
  ScatterPlot,
  InfoOutlined,
} from '@mui/icons-material';

import type {
  SamplingConfig,
  ACEPerturbationConfig,
  ENDFPerturbationConfig,
  ACEFromENDFConfig,
  FileEntry,
  SamplingMethod,
  DecompositionMethod,
  SamplingSpace,
  AutofixLevel,
  LogEntry,
  GeneratedScript,
} from '../types/sampling';
import {
  MT_REACTIONS,
  MT_GROUPS,
  DEFAULT_ACE_CONFIG,
  DEFAULT_ENDF_CONFIG,
  DEFAULT_ACE_FROM_ENDF_CONFIG,
} from '../types/sampling';
import {
  generateScript,
  validateConfig,
  downloadScript,
  copyScriptToClipboard,
  runDryRun,
} from '../services/samplingService';

// Tab panel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`sampling-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

// MT Number selector component with additive group selection
interface MTSelectorProps {
  value: number[];
  onChange: (mts: number[]) => void;
}

function MTSelector({ value, onChange }: MTSelectorProps) {
  const mtOptions = useMemo(() => 
    Object.entries(MT_REACTIONS).map(([mt, name]) => ({
      mt: parseInt(mt),
      label: `MT${mt}: ${name}`,
    })),
    []
  );

  // Toggle a group - add/remove its MTs from current selection
  const handleGroupToggle = (groupMts: number[]) => {
    if (groupMts.length === 0) {
      // "All Available" - clear selection
      onChange([]);
      return;
    }

    // Check if all MTs in this group are already selected
    const allSelected = groupMts.every(mt => value.includes(mt));
    
    if (allSelected) {
      // Remove all MTs in this group
      onChange(value.filter(mt => !groupMts.includes(mt)));
    } else {
      // Add missing MTs from this group
      const newMts = [...value];
      groupMts.forEach(mt => {
        if (!newMts.includes(mt)) {
          newMts.push(mt);
        }
      });
      onChange(newMts.sort((a, b) => a - b));
    }
  };

  // Check if a group is fully selected
  const isGroupSelected = (groupMts: number[]) => {
    if (groupMts.length === 0) return value.length === 0; // "All Available"
    return groupMts.every(mt => value.includes(mt));
  };

  // Check if a group is partially selected
  const isGroupPartial = (groupMts: number[]) => {
    if (groupMts.length === 0) return false;
    const selectedCount = groupMts.filter(mt => value.includes(mt)).length;
    return selectedCount > 0 && selectedCount < groupMts.length;
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {value.length === 0 
          ? '✓ All MT numbers from covariance will be used' 
          : `${value.length} MT number${value.length !== 1 ? 's' : ''} selected`}
      </Typography>
      
      <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {MT_GROUPS.map((group) => {
          const isSelected = isGroupSelected(group.mts);
          const isPartial = isGroupPartial(group.mts);
          
          return (
            <Tooltip key={group.name} title={group.description} arrow>
              <Chip
                label={group.name}
                onClick={() => handleGroupToggle(group.mts)}
                variant={isSelected ? 'filled' : 'outlined'}
                color={isSelected ? 'primary' : 'default'}
                size="small"
                sx={{
                  borderColor: isPartial ? group.color : undefined,
                  borderWidth: isPartial ? 2 : undefined,
                  backgroundColor: isSelected ? group.color : undefined,
                  '&:hover': {
                    backgroundColor: isSelected 
                      ? alpha(group.color, 0.8) 
                      : alpha(group.color, 0.1),
                  },
                }}
              />
            </Tooltip>
          );
        })}
      </Box>

      <Autocomplete
        multiple
        options={mtOptions}
        getOptionLabel={(option) => option.label}
        value={mtOptions.filter(opt => value.includes(opt.mt))}
        onChange={(_, newValue) => onChange(newValue.map(v => v.mt))}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Individual MT Numbers"
            placeholder={value.length === 0 ? "All available" : "Add individual MT numbers..."}
            helperText="Use groups above for quick selection, or add individual MT numbers here"
          />
        )}
        renderTags={(tagValue, getTagProps) =>
          tagValue.map((option, index) => (
            <Chip
              {...getTagProps({ index })}
              key={option.mt}
              label={`MT${option.mt}`}
              size="small"
            />
          ))
        }
      />
    </Box>
  );
}

// File entry component for ACE/ENDF files
interface FileEntryInputProps {
  entry: FileEntry;
  index: number;
  onChange: (index: number, entry: FileEntry) => void;
  onRemove: (index: number) => void;
  dataLabel: string;
  covLabel: string;
  showZaid?: boolean;
}

function FileEntryInput({ entry, index, onChange, onRemove, dataLabel, covLabel, showZaid }: FileEntryInputProps) {
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent sx={{ pb: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle2" sx={{ flex: 1 }}>
            File {index + 1}
          </Typography>
          <IconButton size="small" onClick={() => onRemove(index)} color="error">
            <Delete fontSize="small" />
          </IconButton>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} md={showZaid ? 5 : 6}>
            <TextField
              fullWidth
              size="small"
              label={dataLabel}
              value={entry.dataFilePath}
              onChange={(e) => onChange(index, { ...entry, dataFilePath: e.target.value })}
              placeholder="/path/to/file"
            />
          </Grid>
          <Grid item xs={12} md={showZaid ? 5 : 6}>
            <TextField
              fullWidth
              size="small"
              label={covLabel}
              value={entry.covFilePath}
              onChange={(e) => onChange(index, { ...entry, covFilePath: e.target.value })}
              placeholder="/path/to/covariance"
            />
          </Grid>
          {showZaid && (
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="small"
                label="ZAID"
                type="number"
                value={entry.zaid || ''}
                onChange={(e) => onChange(index, { ...entry, zaid: parseInt(e.target.value) || undefined })}
                placeholder="92235"
              />
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
}

// Advanced options component
interface AdvancedOptionsProps {
  autofix: AutofixLevel;
  highValThresh: number;
  acceptTol: number;
  onAutofixChange: (val: AutofixLevel) => void;
  onHighValThreshChange: (val: number) => void;
  onAcceptTolChange: (val: number) => void;
}

function AdvancedOptions({
  autofix,
  highValThresh,
  acceptTol,
  onAutofixChange,
  onHighValThreshChange,
  onAcceptTolChange,
}: AdvancedOptionsProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
      <Box
        sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <Settings fontSize="small" sx={{ mr: 1 }} />
        <Typography variant="subtitle2" sx={{ flex: 1 }}>
          Advanced Covariance Options
        </Typography>
        <Tooltip title="Click for help" arrow>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              alert('Advanced Covariance Options\n\nFine-tune covariance matrix processing.\n\n• Autofix: Automatically fix non-positive definite matrices\n  - none: No fixing (may fail)\n  - soft: Minimal eigenvalue adjustment\n  - medium: Standard correction\n  - hard: Aggressive fixing\n• High Val Threshold: Clip extreme covariance values\n• Accept Tolerance: Minimum eigenvalue threshold\n\n[Placeholder: Link to covariance fixing algorithms]');
            }}
            sx={{ p: 0.25, mr: 1 }}
          >
            <InfoOutlined fontSize="small" color="action" />
          </IconButton>
        </Tooltip>
        {expanded ? <ExpandLess /> : <ExpandMore />}
      </Box>
      <Collapse in={expanded}>
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Autofix Level</InputLabel>
                <Select
                  value={autofix}
                  label="Autofix Level"
                  onChange={(e) => onAutofixChange(e.target.value as AutofixLevel)}
                >
                  <MenuItem value="none">None - Use as-is</MenuItem>
                  <MenuItem value="soft">Soft - Clamp variances only</MenuItem>
                  <MenuItem value="medium">Medium - Remove bad block pairs</MenuItem>
                  <MenuItem value="hard">Hard - Remove bad reactions</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="High Value Threshold"
                type="number"
                value={highValThresh}
                onChange={(e) => onHighValThreshChange(parseFloat(e.target.value) || 1.0)}
                inputProps={{ step: 0.1, min: 0 }}
                helperText="For detecting problematic values"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="Accept Tolerance"
                type="number"
                value={acceptTol}
                onChange={(e) => onAcceptTolChange(parseFloat(e.target.value) || -1e-4)}
                inputProps={{ step: 1e-5 }}
                helperText="Min eigenvalue threshold"
              />
            </Grid>
          </Grid>
          <Alert severity="info" sx={{ mt: 2 }}>
            <AlertTitle>About Autofix</AlertTitle>
            Use autofix only if the covariance matrix decomposition fails. "None" preserves 
            the original uncertainties exactly as specified in the nuclear data evaluation.
          </Alert>
        </Box>
      </Collapse>
    </Paper>
  );
}

// Log viewer component
interface LogViewerProps {
  logs: LogEntry[];
  progress: number;
  running: boolean;
}

function LogViewer({ logs, progress, running }: LogViewerProps) {
  const theme = useTheme();
  
  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return theme.palette.error.main;
      case 'warning': return theme.palette.warning.main;
      case 'info': return theme.palette.info.main;
      case 'debug': return theme.palette.text.secondary;
      default: return theme.palette.text.primary;
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        bgcolor: alpha(theme.palette.background.default, 0.5),
        fontFamily: 'monospace',
        fontSize: '0.85rem',
      }}
    >
      {running && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Progress: {Math.round(progress)}%
          </Typography>
          <LinearProgress variant="determinate" value={progress} />
        </Box>
      )}
      <Box
        sx={{
          maxHeight: 400,
          overflow: 'auto',
          bgcolor: theme.palette.mode === 'dark' ? '#1a1a2e' : '#f5f5f5',
          borderRadius: 1,
          p: 1,
        }}
      >
        {logs.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No logs yet. Run a dry-run to see output.
          </Typography>
        ) : (
          logs.map((log, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1, py: 0.25 }}>
              <Typography
                component="span"
                sx={{ color: 'text.secondary', minWidth: 80 }}
              >
                {log.timestamp}
              </Typography>
              <Typography
                component="span"
                sx={{
                  color: getLogColor(log.level),
                  fontWeight: log.level === 'error' ? 600 : 400,
                }}
              >
                [{log.level.toUpperCase()}]
              </Typography>
              <Typography component="span" sx={{ flex: 1 }}>
                {log.message}
              </Typography>
            </Box>
          ))
        )}
      </Box>
    </Paper>
  );
}

// Script preview dialog
interface ScriptPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  script: GeneratedScript | null;
}

function ScriptPreviewDialog({ open, onClose, script }: ScriptPreviewDialogProps) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (script) {
      const success = await copyScriptToClipboard(script);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleDownload = () => {
    if (script) {
      downloadScript(script);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Code />
          Generated Python Script
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {script && (
          <>
            <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
              <Chip label={script.filename} color="primary" />
              {script.estimatedRuntime && (
                <Typography variant="body2" color="text.secondary">
                  Estimated runtime: {script.estimatedRuntime}
                </Typography>
              )}
            </Box>
            <Paper
              sx={{
                p: 2,
                bgcolor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#f5f5f5',
                fontFamily: 'Consolas, Monaco, monospace',
                fontSize: '0.85rem',
                overflow: 'auto',
                maxHeight: '60vh',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {script.script}
            </Paper>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button startIcon={copied ? <CheckCircle /> : <ContentCopy />} onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </Button>
        <Button startIcon={<Download />} onClick={handleDownload} variant="contained">
          Download Script
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// Dry run confirmation dialog
interface DryRunDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  estimatedTime: string;
}

function DryRunConfirmDialog({ open, onClose, onConfirm, estimatedTime }: DryRunDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning color="warning" />
          Run Locally (Dry Run)?
        </Box>
      </DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>Resource Warning</AlertTitle>
          Running locally may consume significant CPU and memory resources, especially with 
          large numbers of samples or files.
        </Alert>
        <Typography variant="body2" sx={{ mb: 2 }}>
          This will run a <strong>dry run</strong> that generates perturbation factors 
          without creating actual perturbed files. This is useful to:
        </Typography>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>Validate that all files can be read correctly</li>
          <li>Check covariance matrix decomposition</li>
          <li>Preview perturbation factor distributions</li>
        </ul>
        <Typography variant="body2" sx={{ mt: 2 }}>
          Estimated time: <strong>{estimatedTime}</strong>
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm} variant="contained" color="warning" startIcon={<PlayArrow />}>
          Run Dry Run
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Comma-separated number input component
interface CommaSeparatedNumberInputProps {
  label: string;
  value: number[];
  onChange: (values: number[]) => void;
  helperText?: string;
  placeholder?: string;
  type?: 'int' | 'float';
  fullWidth?: boolean;
  size?: 'small' | 'medium';
}

function CommaSeparatedNumberInput({
  label,
  value,
  onChange,
  helperText,
  placeholder,
  type = 'float',
  fullWidth = true,
  size,
}: CommaSeparatedNumberInputProps) {
  const [inputValue, setInputValue] = useState(value.join(', '));
  const [error, setError] = useState<string | null>(null);

  // Sync with external value changes
  useEffect(() => {
    setInputValue(value.join(', '));
  }, [value]);

  const handleBlur = () => {
    try {
      const parser = type === 'int' ? parseInt : parseFloat;
      const numbers = inputValue
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(s => parser(s));

      // Check for NaN
      const hasInvalid = numbers.some(n => isNaN(n));
      if (hasInvalid) {
        setError('Invalid number format');
        return;
      }

      setError(null);
      onChange(numbers);
    } catch (e) {
      setError('Invalid input format');
    }
  };

  return (
    <TextField
      fullWidth={fullWidth}
      size={size}
      label={label}
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      onBlur={handleBlur}
      error={!!error}
      helperText={error || helperText}
      placeholder={placeholder}
    />
  );
}

// Main Sampling component
export const Sampling: React.FC = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  
  // ACE perturbation state
  const [aceConfig, setAceConfig] = useState<ACEPerturbationConfig>({
    ...DEFAULT_ACE_CONFIG,
    aceFiles: [{ id: '1', dataFilePath: '', covFilePath: '' }],
  });
  
  // ENDF perturbation state
  const [endfConfig, setEndfConfig] = useState<ENDFPerturbationConfig>({
    ...DEFAULT_ENDF_CONFIG,
    endfFiles: [{ id: '1', dataFilePath: '', covFilePath: '' }],
  });
  
  // ACE from ENDF state
  const [aceFromEndfConfig, setAceFromEndfConfig] = useState<ACEFromENDFConfig>({
    ...DEFAULT_ACE_FROM_ENDF_CONFIG,
    rootDir: '',
    zaids: [],
    covFiles: [],
  });

  // UI state
  const [scriptPreviewOpen, setScriptPreviewOpen] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<GeneratedScript | null>(null);
  const [dryRunDialogOpen, setDryRunDialogOpen] = useState(false);
  const [dryRunning, setDryRunning] = useState(false);
  const [dryRunLogs, setDryRunLogs] = useState<LogEntry[]>([]);
  const [dryRunProgress, setDryRunProgress] = useState(0);
  const [validationResult, setValidationResult] = useState<{ errors: string[]; warnings: string[] } | null>(null);

  // Get current config based on active tab
  const getCurrentConfig = useCallback((): SamplingConfig => {
    switch (activeTab) {
      case 0: return aceConfig;
      case 1: return endfConfig;
      case 2: return aceFromEndfConfig;
      default: return aceConfig;
    }
  }, [activeTab, aceConfig, endfConfig, aceFromEndfConfig]);

  // Handle generate script
  const handleGenerateScript = useCallback(() => {
    const config = getCurrentConfig();
    const validation = validateConfig(config);
    setValidationResult({ errors: validation.errors, warnings: validation.warnings });
    
    if (!validation.valid) {
      return;
    }
    
    const script = generateScript(config);
    setGeneratedScript(script);
    setScriptPreviewOpen(true);
  }, [getCurrentConfig]);

  // Handle dry run
  const handleDryRunClick = useCallback(() => {
    const config = getCurrentConfig();
    const validation = validateConfig(config);
    setValidationResult({ errors: validation.errors, warnings: validation.warnings });
    
    if (!validation.valid) {
      return;
    }
    
    setDryRunDialogOpen(true);
  }, [getCurrentConfig]);

  const handleDryRunConfirm = useCallback(async () => {
    setDryRunDialogOpen(false);
    setDryRunning(true);
    setDryRunLogs([]);
    setDryRunProgress(0);
    
    const config = getCurrentConfig();
    
    await runDryRun(
      config,
      (log) => setDryRunLogs(prev => [...prev, log]),
      (progress) => setDryRunProgress(progress),
      () => {
        setDryRunning(false);
        setDryRunLogs(prev => [...prev, {
          timestamp: new Date().toLocaleTimeString(),
          level: 'info',
          message: 'Dry run completed successfully!',
        }]);
      },
      (error) => {
        setDryRunning(false);
        setDryRunLogs(prev => [...prev, {
          timestamp: new Date().toLocaleTimeString(),
          level: 'error',
          message: error,
        }]);
      }
    );
  }, [getCurrentConfig]);

  // File management handlers
  const addFile = useCallback((tab: number) => {
    const newEntry: FileEntry = { id: Date.now().toString(), dataFilePath: '', covFilePath: '' };
    if (tab === 0) {
      setAceConfig(prev => ({ ...prev, aceFiles: [...prev.aceFiles, newEntry] }));
    } else if (tab === 1) {
      setEndfConfig(prev => ({ ...prev, endfFiles: [...prev.endfFiles, newEntry] }));
    }
  }, []);

  const updateFile = useCallback((tab: number, index: number, entry: FileEntry) => {
    if (tab === 0) {
      setAceConfig(prev => ({
        ...prev,
        aceFiles: prev.aceFiles.map((f, i) => i === index ? entry : f),
      }));
    } else if (tab === 1) {
      setEndfConfig(prev => ({
        ...prev,
        endfFiles: prev.endfFiles.map((f, i) => i === index ? entry : f),
      }));
    }
  }, []);

  const removeFile = useCallback((tab: number, index: number) => {
    if (tab === 0) {
      setAceConfig(prev => ({
        ...prev,
        aceFiles: prev.aceFiles.filter((_, i) => i !== index),
      }));
    } else if (tab === 1) {
      setEndfConfig(prev => ({
        ...prev,
        endfFiles: prev.endfFiles.filter((_, i) => i !== index),
      }));
    }
  }, []);

  const estimatedTime = useMemo(() => {
    const config = getCurrentConfig();
    const script = generateScript(config);
    return script.estimatedRuntime || '< 1 minute';
  }, [getCurrentConfig]);

  return (
    <Box sx={{ width: '100%', minHeight: '100%' }}>
      {/* Hero Section */}
      <Fade in timeout={600}>
        <Box
          sx={{
            position: 'relative',
            py: 4,
            px: 4,
            mb: 4,
            borderRadius: 4,
            background: `linear-gradient(135deg, ${alpha('#f59e0b', 0.08)} 0%, ${alpha('#f59e0b', 0.15)} 100%)`,
            overflow: 'hidden',
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
                  bgcolor: alpha('#f59e0b', 0.15),
                }}
              >
                <ScatterPlot sx={{ fontSize: 32, color: '#f59e0b' }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={700}>
                  Nuclear Data Sampling
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Generate perturbed nuclear data files for uncertainty quantification
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Fade>

      {/* Validation alerts */}
      {validationResult && (
        <Box sx={{ mb: 3 }}>
          {validationResult.errors.length > 0 && (
            <Alert severity="error" sx={{ mb: 1 }}>
              <AlertTitle>Validation Errors</AlertTitle>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {validationResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </Alert>
          )}
          {validationResult.warnings.length > 0 && (
            <Alert severity="warning">
              <AlertTitle>Warnings</AlertTitle>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {validationResult.warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </Alert>
          )}
        </Box>
      )}

      {/* Main content */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Tab label="ACE Perturbation" />
          <Tab label="ENDF Perturbation" />
          <Tab label="ACE from ENDF" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* ACE Perturbation Tab */}
          <TabPanel value={activeTab} index={0}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Perturb ACE cross-section files using covariance matrices. Each ACE file 
              needs a corresponding covariance file (NJOY GENDF or SCALE format).
            </Typography>
            
            {/* File entries */}
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              Nuclear Data Files
            </Typography>
            {aceConfig.aceFiles.map((entry, index) => (
              <FileEntryInput
                key={entry.id}
                entry={entry}
                index={index}
                onChange={(i, e) => updateFile(0, i, e)}
                onRemove={(i) => removeFile(0, i)}
                dataLabel="ACE File Path"
                covLabel="Covariance File Path"
              />
            ))}
            <Button
              startIcon={<Add />}
              onClick={() => addFile(0)}
              variant="outlined"
              size="small"
              sx={{ mb: 3 }}
            >
              Add File
            </Button>

            <Divider sx={{ my: 3 }} />

            {/* Sampling options */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Sampling Configuration
              </Typography>
              <Tooltip title="Click for more info" arrow>
                <IconButton
                  size="small"
                  onClick={() => {
                    alert('Sampling Configuration\n\nConfigure the number of samples and sampling strategy.\n\n• Number of Samples: Total perturbed files to generate\n• Sampling Method: Algorithm for generating samples (Sobol recommended)\n• Decomposition Method: Matrix factorization for covariance\n• Sampling Space: Linear or logarithmic perturbations\n• Random Seed: For reproducible results\n\n[Placeholder: Link to KIKA documentation will be added here]');
                  }}
                  sx={{ p: 0.25 }}
                >
                  <InfoOutlined fontSize="small" color="action" />
                </IconButton>
              </Tooltip>
            </Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Number of Samples"
                  type="number"
                  value={aceConfig.numSamples}
                  onChange={(e) => setAceConfig(prev => ({ ...prev, numSamples: parseInt(e.target.value) || 100 }))}
                  inputProps={{ min: 1, max: 100000 }}
                  helperText="Number of perturbed ACE files to generate"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Output Directory"
                  value={aceConfig.outputDir}
                  onChange={(e) => setAceConfig(prev => ({ ...prev, outputDir: e.target.value }))}
                  placeholder="/path/to/output"
                  helperText="Directory for perturbed files"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Sampling Method</InputLabel>
                  <Select
                    value={aceConfig.samplingMethod}
                    label="Sampling Method"
                    onChange={(e) => setAceConfig(prev => ({ ...prev, samplingMethod: e.target.value as SamplingMethod }))}
                  >
                    <MenuItem value="sobol">Sobol (Quasi-random)</MenuItem>
                    <MenuItem value="lhs">Latin Hypercube</MenuItem>
                    <MenuItem value="random">Random</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Decomposition Method</InputLabel>
                  <Select
                    value={aceConfig.decompositionMethod}
                    label="Decomposition Method"
                    onChange={(e) => setAceConfig(prev => ({ ...prev, decompositionMethod: e.target.value as DecompositionMethod }))}
                  >
                    <MenuItem value="svd">SVD (Recommended)</MenuItem>
                    <MenuItem value="cholesky">Cholesky</MenuItem>
                    <MenuItem value="eigen">Eigenvalue</MenuItem>
                    <MenuItem value="pca">PCA</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Sampling Space</InputLabel>
                  <Select
                    value={aceConfig.space}
                    label="Sampling Space"
                    onChange={(e) => setAceConfig(prev => ({ ...prev, space: e.target.value as SamplingSpace }))}
                  >
                    <MenuItem value="log">Log (factors = exp(Y))</MenuItem>
                    <MenuItem value="linear">Linear (factors = 1 + X)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Random Seed"
                  type="number"
                  value={aceConfig.seed ?? ''}
                  onChange={(e) => setAceConfig(prev => ({ 
                    ...prev, 
                    seed: e.target.value ? parseInt(e.target.value) : null 
                  }))}
                  helperText="Leave empty for random seed"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Parallel Processes"
                  type="number"
                  value={aceConfig.nprocs}
                  onChange={(e) => setAceConfig(prev => ({ ...prev, nprocs: parseInt(e.target.value) || 1 }))}
                  inputProps={{ min: 1 }}
                  helperText="Number of CPU cores to use"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="XSDIR File"
                  value={aceConfig.xsdirFile}
                  onChange={(e) => setAceConfig(prev => ({ ...prev, xsdirFile: e.target.value }))}
                  placeholder="/path/to/xsdir"
                  helperText="Master XSDIR file (optional)"
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  MT Numbers to Perturb
                </Typography>
                <Tooltip title="Click for help" arrow>
                  <IconButton
                    size="small"
                    onClick={() => {
                      alert('MT Number Selection\n\nSelect which reaction channels (MT numbers) to perturb.\n\n• Empty selection = All available MTs in covariance\n• Groups are additive: click multiple to combine\n• MT4 perturbs total inelastic (all levels 51-91)\n• Can also select individual MT numbers\n\n[Placeholder: Link to ENDF MT documentation]');
                    }}
                    sx={{ p: 0.25 }}
                  >
                    <InfoOutlined fontSize="small" color="action" />
                  </IconButton>
                </Tooltip>
              </Box>
              <MTSelector
                value={aceConfig.mtList}
                onChange={(mts) => setAceConfig(prev => ({ ...prev, mtList: mts }))}
              />
            </Box>

            {/* Advanced options */}
            <AdvancedOptions
              autofix={aceConfig.advancedOptions.autofix}
              highValThresh={aceConfig.advancedOptions.highValThresh}
              acceptTol={aceConfig.advancedOptions.acceptTol}
              onAutofixChange={(val) => setAceConfig(prev => ({
                ...prev,
                advancedOptions: { ...prev.advancedOptions, autofix: val },
              }))}
              onHighValThreshChange={(val) => setAceConfig(prev => ({
                ...prev,
                advancedOptions: { ...prev.advancedOptions, highValThresh: val },
              }))}
              onAcceptTolChange={(val) => setAceConfig(prev => ({
                ...prev,
                advancedOptions: { ...prev.advancedOptions, acceptTol: val },
              }))}
            />
          </TabPanel>

          {/* ENDF Perturbation Tab */}
          <TabPanel value={activeTab} index={1}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Perturb ENDF angular distribution data using MF34 covariance matrices. 
              Optionally generate ACE files via NJOY for each perturbed ENDF.
            </Typography>

            {/* File entries */}
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              ENDF Files
            </Typography>
            {endfConfig.endfFiles.map((entry, index) => (
              <FileEntryInput
                key={entry.id}
                entry={entry}
                index={index}
                onChange={(i, e) => updateFile(1, i, e)}
                onRemove={(i) => removeFile(1, i)}
                dataLabel="ENDF File Path"
                covLabel="MF34 Covariance File (optional)"
              />
            ))}
            <Button
              startIcon={<Add />}
              onClick={() => addFile(1)}
              variant="outlined"
              size="small"
              sx={{ mb: 3 }}
            >
              Add File
            </Button>

            <Divider sx={{ my: 3 }} />

            {/* Sampling options */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Angular Distribution Configuration
              </Typography>
              <Tooltip title="Click for help" arrow>
                <IconButton
                  size="small"
                  onClick={() => {
                    alert('Angular Distribution Configuration\n\nConfigure ENDF angular distribution perturbation.\n\n• Legendre Coefficients: Which Legendre expansion coefficients to perturb (e.g., 1, 2, 3)\n• Uses MF34 covariance matrices from ENDF files\n• Can optionally generate ACE files via NJOY after perturbation\n\n[Placeholder: Link to ENDF MF34 documentation]');
                  }}
                  sx={{ p: 0.25 }}
                >
                  <InfoOutlined fontSize="small" color="action" />
                </IconButton>
              </Tooltip>
            </Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <CommaSeparatedNumberInput
                  label="Legendre Coefficients"
                  value={endfConfig.legendreCoeffs}
                  onChange={(coeffs) => setEndfConfig(prev => ({ ...prev, legendreCoeffs: coeffs }))}
                  helperText="Comma-separated list (e.g., 1, 2, 3)"
                  type="int"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Number of Samples"
                  type="number"
                  value={endfConfig.numSamples}
                  onChange={(e) => setEndfConfig(prev => ({ ...prev, numSamples: parseInt(e.target.value) || 100 }))}
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Output Directory"
                  value={endfConfig.outputDir}
                  onChange={(e) => setEndfConfig(prev => ({ ...prev, outputDir: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Sampling Method</InputLabel>
                  <Select
                    value={endfConfig.samplingMethod}
                    label="Sampling Method"
                    onChange={(e) => setEndfConfig(prev => ({ ...prev, samplingMethod: e.target.value as SamplingMethod }))}
                  >
                    <MenuItem value="sobol">Sobol</MenuItem>
                    <MenuItem value="lhs">LHS</MenuItem>
                    <MenuItem value="random">Random</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Decomposition Method</InputLabel>
                  <Select
                    value={endfConfig.decompositionMethod}
                    label="Decomposition Method"
                    onChange={(e) => setEndfConfig(prev => ({ ...prev, decompositionMethod: e.target.value as DecompositionMethod }))}
                  >
                    <MenuItem value="svd">SVD</MenuItem>
                    <MenuItem value="cholesky">Cholesky</MenuItem>
                    <MenuItem value="eigen">Eigen</MenuItem>
                    <MenuItem value="pca">PCA</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Sampling Space</InputLabel>
                  <Select
                    value={endfConfig.space}
                    label="Sampling Space"
                    onChange={(e) => setEndfConfig(prev => ({ ...prev, space: e.target.value as SamplingSpace }))}
                  >
                    <MenuItem value="linear">Linear</MenuItem>
                    <MenuItem value="log">Log</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Random Seed"
                  type="number"
                  value={endfConfig.seed ?? ''}
                  onChange={(e) => setEndfConfig(prev => ({
                    ...prev,
                    seed: e.target.value ? parseInt(e.target.value) : null
                  }))}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Processes"
                  type="number"
                  value={endfConfig.nprocs}
                  onChange={(e) => setEndfConfig(prev => ({ ...prev, nprocs: parseInt(e.target.value) || 1 }))}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                MT Numbers
              </Typography>
              <MTSelector
                value={endfConfig.mtList}
                onChange={(mts) => setEndfConfig(prev => ({ ...prev, mtList: mts }))}
              />
            </Box>

            {/* ACE Generation options */}
            <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={endfConfig.generateAce}
                    onChange={(e) => setEndfConfig(prev => ({ ...prev, generateAce: e.target.checked }))}
                  />
                }
                label="Generate ACE files via NJOY"
              />
              <Collapse in={endfConfig.generateAce}>
                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="NJOY Executable"
                        value={endfConfig.njoyExe}
                        onChange={(e) => setEndfConfig(prev => ({ ...prev, njoyExe: e.target.value }))}
                        placeholder="/path/to/njoy"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <CommaSeparatedNumberInput
                        size="small"
                        label="Temperatures (K)"
                        value={endfConfig.temperatures}
                        onChange={(temps) => setEndfConfig(prev => ({ ...prev, temperatures: temps }))}
                        helperText="Comma-separated (e.g., 300, 600, 900)"
                        type="float"
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Library Name"
                        value={endfConfig.libraryName}
                        onChange={(e) => setEndfConfig(prev => ({ ...prev, libraryName: e.target.value }))}
                        placeholder="endfb81"
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="NJOY Version"
                        value={endfConfig.njoyVersion}
                        onChange={(e) => setEndfConfig(prev => ({ ...prev, njoyVersion: e.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="XSDIR File"
                        value={endfConfig.xsdirFile}
                        onChange={(e) => setEndfConfig(prev => ({ ...prev, xsdirFile: e.target.value }))}
                      />
                    </Grid>
                  </Grid>
                </Box>
              </Collapse>
            </Paper>
          </TabPanel>

          {/* ACE from ENDF Tab */}
          <TabPanel value={activeTab} index={2}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Apply cross-section perturbations to ACE files generated from perturbed ENDF files. 
              This uses the directory structure created by the ENDF perturbation process.
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              <AlertTitle>Prerequisites</AlertTitle>
              This function expects ACE files to exist in the directory structure:
              <code style={{ display: 'block', marginTop: 8, padding: 8, background: alpha(theme.palette.info.main, 0.1), borderRadius: 4 }}>
                root_dir/ace/tempK/zaid/sample_num/
              </code>
            </Alert>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Root Directory"
                  value={aceFromEndfConfig.rootDir}
                  onChange={(e) => setAceFromEndfConfig(prev => ({ ...prev, rootDir: e.target.value }))}
                  placeholder="/path/to/endf_perturbation_output"
                  helperText="Directory containing perturbed ACE files"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <CommaSeparatedNumberInput
                  label="Temperatures (K)"
                  value={aceFromEndfConfig.temperatures}
                  onChange={(temps) => setAceFromEndfConfig(prev => ({ ...prev, temperatures: temps }))}
                  helperText="Comma-separated list (e.g., 300, 600, 900)"
                  type="float"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <CommaSeparatedNumberInput
                  label="ZAIDs"
                  value={aceFromEndfConfig.zaids}
                  onChange={(zaids) => setAceFromEndfConfig(prev => ({ ...prev, zaids }))}
                  helperText="Comma-separated list (e.g., 92235, 92238)"
                  type="int"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Number of Samples"
                  type="number"
                  value={aceFromEndfConfig.numSamples}
                  onChange={(e) => setAceFromEndfConfig(prev => ({ ...prev, numSamples: parseInt(e.target.value) || 100 }))}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              Covariance Files
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Covariance File Paths"
              value={aceFromEndfConfig.covFiles.join('\n')}
              onChange={(e) => {
                const files = e.target.value.split('\n').filter(s => s.trim());
                setAceFromEndfConfig(prev => ({ ...prev, covFiles: files }));
              }}
              helperText="One file path per line (one per ZAID)"
              sx={{ mb: 3 }}
            />

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Sampling Method</InputLabel>
                  <Select
                    value={aceFromEndfConfig.samplingMethod}
                    label="Sampling Method"
                    onChange={(e) => setAceFromEndfConfig(prev => ({ ...prev, samplingMethod: e.target.value as SamplingMethod }))}
                  >
                    <MenuItem value="sobol">Sobol</MenuItem>
                    <MenuItem value="lhs">LHS</MenuItem>
                    <MenuItem value="random">Random</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Random Seed"
                  type="number"
                  value={aceFromEndfConfig.seed ?? ''}
                  onChange={(e) => setAceFromEndfConfig(prev => ({
                    ...prev,
                    seed: e.target.value ? parseInt(e.target.value) : null
                  }))}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Processes"
                  type="number"
                  value={aceFromEndfConfig.nprocs}
                  onChange={(e) => setAceFromEndfConfig(prev => ({ ...prev, nprocs: parseInt(e.target.value) || 1 }))}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                MT Numbers
              </Typography>
              <MTSelector
                value={aceFromEndfConfig.mtList}
                onChange={(mts) => setAceFromEndfConfig(prev => ({ ...prev, mtList: mts }))}
              />
            </Box>

            <AdvancedOptions
              autofix={aceFromEndfConfig.advancedOptions.autofix}
              highValThresh={aceFromEndfConfig.advancedOptions.highValThresh}
              acceptTol={aceFromEndfConfig.advancedOptions.acceptTol}
              onAutofixChange={(val) => setAceFromEndfConfig(prev => ({
                ...prev,
                advancedOptions: { ...prev.advancedOptions, autofix: val },
              }))}
              onHighValThreshChange={(val) => setAceFromEndfConfig(prev => ({
                ...prev,
                advancedOptions: { ...prev.advancedOptions, highValThresh: val },
              }))}
              onAcceptTolChange={(val) => setAceFromEndfConfig(prev => ({
                ...prev,
                advancedOptions: { ...prev.advancedOptions, acceptTol: val },
              }))}
            />
          </TabPanel>
        </Box>

        {/* Action buttons */}
        <Divider />
        <Box sx={{ p: 3, display: 'flex', gap: 2, justifyContent: 'flex-end', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 'auto' }}>
            Estimated runtime: {estimatedTime}
          </Typography>
          <Tooltip title="Run dry-run locally to validate configuration and preview perturbation factors">
            <Button
              variant="outlined"
              startIcon={<Terminal />}
              onClick={handleDryRunClick}
              disabled={dryRunning}
            >
              {dryRunning ? 'Running...' : 'Run Dry-Run Locally'}
            </Button>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Code />}
            onClick={handleGenerateScript}
            sx={{
              bgcolor: '#f59e0b',
              '&:hover': { bgcolor: '#d97706' },
            }}
          >
            Generate Script
          </Button>
        </Box>
      </Paper>

      {/* Log viewer (shown when dry run has been executed) */}
      {(dryRunning || dryRunLogs.length > 0) && (
        <Paper sx={{ mt: 3, p: 3, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Terminal />
            <Typography variant="subtitle1" fontWeight={600}>
              Dry Run Output
            </Typography>
            {dryRunning && <Chip label="Running" color="warning" size="small" />}
          </Box>
          <LogViewer logs={dryRunLogs} progress={dryRunProgress} running={dryRunning} />
        </Paper>
      )}

      {/* Dialogs */}
      <ScriptPreviewDialog
        open={scriptPreviewOpen}
        onClose={() => setScriptPreviewOpen(false)}
        script={generatedScript}
      />
      <DryRunConfirmDialog
        open={dryRunDialogOpen}
        onClose={() => setDryRunDialogOpen(false)}
        onConfirm={handleDryRunConfirm}
        estimatedTime={estimatedTime}
      />
    </Box>
  );
};
