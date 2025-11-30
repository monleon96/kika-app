import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, IconButton, Button, Badge, Tooltip } from '@mui/material';
import { Logout, Home as HomeIcon, Folder, FolderOpen, Info, Settings, FolderCopy, Science } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useFileWorkspace } from '../contexts/FileWorkspaceContext';
import { FileWorkspace } from './FileWorkspace';
import { AboutDialog } from './AboutDialog';
import kikaIcon from '@assets/icon_kika_128.png';

const WORKSPACE_WIDTH = 360;

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { files } = useFileWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const fileCount = files.filter(f => f.status === 'ready').length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Tooltip title="Quick File Access">
            <IconButton
              color="inherit"
              onClick={() => setWorkspaceOpen(!workspaceOpen)}
              sx={{ mr: 1 }}
            >
              <Badge badgeContent={fileCount} color="secondary">
                {workspaceOpen ? <FolderOpen /> : <Folder />}
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Home">
            <IconButton
              color="inherit"
              onClick={() => navigate('/')}
              sx={{ mr: 1 }}
            >
              <HomeIcon />
            </IconButton>
          </Tooltip>

          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              mr: 2,
            }}
            onClick={() => navigate('/')}
          >
            <img src={kikaIcon} alt="KIKA" style={{ height: 32, marginRight: 8 }} />
            <Typography variant="h6" component="div" sx={{ display: { xs: 'none', sm: 'block' } }}>
              KIKA
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1, display: 'flex', gap: 0.5 }}>
            <Button
              color="inherit"
              startIcon={<FolderCopy />}
              onClick={() => navigate('/files')}
              sx={{
                bgcolor: location.pathname === '/files' ? 'rgba(255,255,255,0.15)' : 'transparent',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              Files
            </Button>
            <Button
              color="inherit"
              onClick={() => navigate('/ace-files')}
              sx={{
                bgcolor: location.pathname.startsWith('/ace-files') ? 'rgba(255,255,255,0.15)' : 'transparent',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              ACE Files
            </Button>
            <Button
              color="inherit"
              onClick={() => navigate('/endf-files')}
              sx={{
                bgcolor: location.pathname.startsWith('/endf-files') ? 'rgba(255,255,255,0.15)' : 'transparent',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              ENDF Files
            </Button>
            <Button
              color="inherit"
              startIcon={<Science />}
              onClick={() => navigate('/materials')}
              sx={{
                bgcolor: location.pathname.startsWith('/materials') ? 'rgba(255,255,255,0.15)' : 'transparent',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              Materials
            </Button>
          </Box>

          <Typography variant="body2" sx={{ mr: 1, display: { xs: 'none', md: 'block' } }}>
            {user?.is_guest ? '🚀 Guest' : user?.email}
          </Typography>
          <Tooltip title="Settings">
            <IconButton
              color="inherit"
              onClick={() => navigate('/settings')}
            >
              <Settings />
            </IconButton>
          </Tooltip>
          <Tooltip title="About KIKA">
            <IconButton
              color="inherit"
              onClick={() => setAboutOpen(true)}
            >
              <Info />
            </IconButton>
          </Tooltip>
          <Tooltip title={user?.is_guest ? 'Exit Guest Mode' : 'Logout'}>
            <IconButton 
              color="inherit" 
              onClick={logout}
            >
              <Logout />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden', pt: 8 }}>
        <Box
          sx={{
            width: workspaceOpen ? `${WORKSPACE_WIDTH}px` : 0,
            transition: 'width 0.3s ease-in-out',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          <FileWorkspace 
            open={workspaceOpen} 
            onClose={() => setWorkspaceOpen(false)}
            width={WORKSPACE_WIDTH}
          />
        </Box>
        
        <Box 
          component="main" 
          sx={{ 
            flexGrow: 1, 
            p: 3, 
            overflow: 'auto',
            width: '100%',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};
