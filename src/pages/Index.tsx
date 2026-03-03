import { Navigate } from 'react-router-dom';
import { useAuth, isAdminRole } from '@/contexts/AuthContext';
import Login from './Login';

const Index = () => {
  const { user } = useAuth();
  if (user) return isAdminRole(user.role) ? <Navigate to="/admin" /> : <Navigate to="/staff" />;
  return <Login />;
};

export default Index;
