import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { ACEFiles } from './pages/ACEFiles';
import { ACEFilePage } from './pages/ACEFilePage';
import { ACEPlotter } from './pages/ACEPlotter';
import { ACEDataSection } from './pages/ACEDataSection';
import { ENDFFiles } from './pages/ENDFFiles';
import { ENDFFilePage } from './pages/ENDFFilePage';
import { ENDFPlotter } from './pages/ENDFPlotter';
import { ENDFDataSection } from './pages/ENDFDataSection';
import { MCNPInputFiles } from './pages/MCNPInputFiles';
import { MCNPInputFilePage } from './pages/MCNPInputFilePage';
import { MCTALFiles } from './pages/MCTALFiles';
import { MCTALFilePage } from './pages/MCTALFilePage';
import { MCNPPage } from './pages/MCNPPage';
import { Materials } from './pages/Materials';
import { MaterialDetail } from './pages/MaterialDetail';
import { MaterialEditor } from './pages/MaterialEditor';
import { Sampling } from './pages/Sampling';
import { Settings } from './pages/Settings';
import { FileManager } from './pages/FileManager';
import { useAuth } from './contexts/AuthContext';

// Protected route wrapper
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Home />} />
        <Route path="files" element={<FileManager />} />
        <Route path="ace-files" element={<ACEFiles />} />
        <Route path="ace-files/plotter" element={<ACEPlotter />} />
        <Route path="ace-files/:fileId" element={<ACEFilePage />} />
        <Route path="ace-files/:fileId/:section" element={<ACEDataSection />} />
        <Route path="endf-files" element={<ENDFFiles />} />
        <Route path="endf-files/plotter" element={<ENDFPlotter />} />
        <Route path="endf-files/:fileId" element={<ENDFFilePage />} />
        <Route path="endf-files/:fileId/:section" element={<ENDFDataSection />} />
        <Route path="mcnp" element={<MCNPPage />} />
        <Route path="mcnp-input" element={<MCNPInputFiles />} />
        <Route path="mcnp-input/:fileId" element={<MCNPInputFilePage />} />
        <Route path="mcnp-mctal" element={<MCTALFiles />} />
        <Route path="mcnp-mctal/:fileId" element={<MCTALFilePage />} />
        <Route path="materials" element={<Materials />} />
        <Route path="materials/create" element={<MaterialEditor />} />
        <Route path="materials/import" element={<MaterialEditor />} />
        <Route path="materials/:materialId" element={<MaterialDetail />} />
        <Route path="sampling" element={<Sampling />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
};
