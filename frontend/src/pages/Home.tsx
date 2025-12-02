import { useState } from 'react';
import {
  Typography,
  Box,
  Card,
  CardActionArea,
  Button,
  Chip,
  alpha,
  useTheme,
  Fade,
  Grow,
  Paper,
} from '@mui/material';
import {
  Science,
  Timeline,
  Build,
  ArrowForward,
  Folder,
  Speed,
  Storage,
  DesktopWindows,
  Inventory,
  Analytics,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useFileWorkspace } from '../contexts/FileWorkspaceContext';
import kikaLogo from '@assets/logo_dark_optimized.png';
import kikaIcon from '@assets/icon_kika_128.png';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: string;
  badge?: string;
  disabled?: boolean;
  delay?: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon,
  onClick,
  color,
  badge,
  disabled = false,
  delay = 0,
}) => {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);

  return (
    <Grow in timeout={500 + delay}>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'visible',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: hovered && !disabled ? 'translateY(-8px)' : 'translateY(0)',
          boxShadow: hovered && !disabled
            ? `0 20px 40px ${alpha(color, 0.25)}`
            : theme.shadows[2],
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: `linear-gradient(90deg, ${color}, ${alpha(color, 0.6)})`,
            borderRadius: '12px 12px 0 0',
          },
          opacity: disabled ? 0.6 : 1,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {badge && (
          <Chip
            label={badge}
            size="small"
            sx={{
              position: 'absolute',
              top: -10,
              right: 16,
              bgcolor: disabled ? 'warning.main' : 'success.main',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.7rem',
            }}
          />
        )}
        <CardActionArea
          onClick={onClick}
          disabled={disabled}
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            p: 3,
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(color, 0.1),
              color: color,
              mb: 2,
              transition: 'all 0.3s ease',
              transform: hovered && !disabled ? 'scale(1.1)' : 'scale(1)',
            }}
          >
            {icon}
          </Box>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {title}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ flexGrow: 1, mb: 2 }}
          >
            {description}
          </Typography>
          {!disabled && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                color: color,
                fontWeight: 500,
                fontSize: '0.875rem',
                transition: 'gap 0.2s ease',
                gap: hovered ? 1.5 : 1,
              }}
            >
              Get Started <ArrowForward sx={{ fontSize: 18 }} />
            </Box>
          )}
        </CardActionArea>
      </Card>
    </Grow>
  );
};

interface QuickStatProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

const QuickStat: React.FC<QuickStatProps> = ({ label, value, icon, color }) => (
  <Paper
    elevation={0}
    sx={{
      p: 2,
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      bgcolor: alpha(color, 0.05),
      border: `1px solid ${alpha(color, 0.1)}`,
      borderRadius: 2,
    }}
  >
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: alpha(color, 0.1),
        color: color,
      }}
    >
      {icon}
    </Box>
    <Box>
      <Typography variant="h6" fontWeight={700} lineHeight={1}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  </Paper>
);

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { files } = useFileWorkspace();

  const aceFiles = files.filter(f => f.type === 'ace' && f.status === 'ready').length;
  const endfFiles = files.filter(f => f.type === 'endf' && f.status === 'ready').length;
  const mcnpFiles = files.filter(f => (f.type === 'mcnp-input' || f.type === 'mcnp-mctal') && f.status === 'ready').length;

  const features = [
    {
      title: 'ACE Files',
      description: 'Explore, visualize, and analyze ACE format nuclear data files with interactive cross-section plots and angular distributions.',
      icon: <Science sx={{ fontSize: 28 }} />,
      onClick: () => navigate('/ace-files'),
      color: theme.palette.primary.main,
    },
    {
      title: 'ENDF Files',
      description: 'Explore, visualize, and analyze ENDF-6 format evaluated nuclear data with uncertainty bands and Legendre coefficients.',
      icon: <Timeline sx={{ fontSize: 28 }} />,
      onClick: () => navigate('/endf-files'),
      color: theme.palette.secondary.main,
    },
    {
      title: 'MCNP',
      description: 'Parse MCNP input decks and analyze MCTAL tally outputs with material compositions, PERT cards, and sensitivity analysis.',
      icon: <Analytics sx={{ fontSize: 28 }} />,
      onClick: () => navigate('/mcnp'),
      color: theme.palette.info.main,
    },
    {
      title: 'Materials',
      description: 'Define and manage MCNP material compositions with nuclide fractions, library specifications, and natural element expansion.',
      icon: <Inventory sx={{ fontSize: 28 }} />,
      onClick: () => navigate('/materials'),
      color: theme.palette.success.main,
    },
    {
      title: 'NJOY Processing',
      description: 'Generate ACE files from ENDF data with temperature selection and automatic versioning.',
      icon: <Build sx={{ fontSize: 28 }} />,
      onClick: () => {},
      color: theme.palette.warning.main,
      badge: 'Coming Soon',
      disabled: true,
    },
  ];

  const highlights = [
    { icon: <Speed />, text: 'Fast Processing' },
    { icon: <Storage />, text: 'Local Storage' },
    { icon: <DesktopWindows />, text: 'Desktop App' },
  ];

  return (
    <Box sx={{ width: '100%', minHeight: '100%' }}>
      {/* Hero Section */}
      <Fade in timeout={600}>
        <Box
          sx={{
            position: 'relative',
            py: 6,
            px: 4,
            mb: 4,
            borderRadius: 4,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.08)} 100%)`,
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -100,
              right: -100,
              width: 300,
              height: 300,
              borderRadius: '50%',
              background: alpha(theme.palette.primary.main, 0.1),
              filter: 'blur(60px)',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: -80,
              left: -80,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: alpha(theme.palette.secondary.main, 0.1),
              filter: 'blur(40px)',
            },
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
              <Box
                component="img"
                src={kikaLogo}
                alt="KIKA Logo"
                sx={{
                  height: { xs: 48, md: 64 },
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))',
                }}
              />
            </Box>
            
            <Typography
              variant="h3"
              component="h1"
              fontWeight={700}
              sx={{
                mb: 1,
                background: `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${theme.palette.primary.main} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Nuclear Data Visualization
            </Typography>
            
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ mb: 3, maxWidth: 600 }}
            >
              Analyze and visualize ACE and ENDF nuclear data files with powerful
              interactive tools designed for nuclear engineers and researchers.
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {highlights.map((h, i) => (
                <Chip
                  key={i}
                  icon={h.icon}
                  label={h.text}
                  variant="outlined"
                  sx={{
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                    '& .MuiChip-icon': { color: theme.palette.primary.main },
                  }}
                />
              ))}
            </Box>
          </Box>
        </Box>
      </Fade>

      {/* Quick Stats */}
      {(aceFiles > 0 || endfFiles > 0) && (
        <Fade in timeout={800}>
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
              Your Workspace
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              }}
            >
              <QuickStat
                label="ACE Files Loaded"
                value={aceFiles}
                icon={<Science />}
                color={theme.palette.primary.main}
              />
              <QuickStat
                label="ENDF Files Loaded"
                value={endfFiles}
                icon={<Timeline />}
                color={theme.palette.secondary.main}
              />
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  bgcolor: alpha(theme.palette.info.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                  borderRadius: 2,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                  },
                }}
                onClick={() => navigate('/files')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha(theme.palette.info.main, 0.1),
                      color: theme.palette.info.main,
                    }}
                  >
                    <Folder />
                  </Box>
                  <Typography variant="body2" fontWeight={500}>
                    Manage Files
                  </Typography>
                </Box>
                <ArrowForward sx={{ color: theme.palette.info.main, fontSize: 20 }} />
              </Paper>
            </Box>
          </Box>
        </Fade>
      )}

      {/* Feature Cards */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="subtitle2"
          color="text.secondary"
          sx={{ mb: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}
        >
          Tools & Features
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
          }}
        >
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} {...feature} delay={index * 100} />
          ))}
        </Box>
      </Box>

      {/* Quick Start Section */}
      <Fade in timeout={1000}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
            background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${theme.palette.background.paper} 100%)`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3, flexWrap: 'wrap' }}>
            <Box
              component="img"
              src={kikaIcon}
              alt="KIKA"
              sx={{ width: 48, height: 48, borderRadius: 2 }}
            />
            <Box sx={{ flex: 1, minWidth: 280 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Quick Start Guide
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Get started by uploading your nuclear data files. KIKA supports both ACE and ENDF-6 formats.
                Use the file workspace panel on the left or drag and drop files anywhere.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<Folder />}
                  onClick={() => navigate('/files')}
                >
                  Open File Manager
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/ace-files')}
                >
                  Go to ACE Files
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Fade>

      {/* Footer spacing */}
      <Box sx={{ height: 24 }} />
    </Box>
  );
};
