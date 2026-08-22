import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../contexts/AuthContext.jsx";

export function ProtectedRoute({ editor = false, creator = false }) {
  const { loading, isAuthenticated, needsUsername, isEditor, isCreator } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-primary-500">
        Het bord wordt geopend…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/inloggen" replace state={{ from: location.pathname }} />;
  }

  if (needsUsername) {
    return <Navigate to="/welkom" replace />;
  }

  if (creator && !isCreator) {
    return <Navigate to="/bord" replace />;
  }

  if (editor && !isEditor) {
    return <Navigate to="/bord" replace />;
  }

  return <Outlet />;
}
