import { Navigate, Route, Routes } from "react-router";
import { Layout } from "./components/Layout.jsx";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import { BoardPage } from "./pages/Board.jsx";
import { DashboardPage } from "./pages/Dashboard.jsx";
import { EditorsPage } from "./pages/Editors.jsx";
import { LoginPage } from "./pages/Login.jsx";
import { PostFormPage } from "./pages/PostForm.jsx";
import { PrivacyPage } from "./pages/Privacy.jsx";
import { TrashPage } from "./pages/Trash.jsx";
import { UsernameSetupPage } from "./pages/UsernameSetup.jsx";

export function App() {
  return (
    <Routes>
      <Route path="/inloggen" element={<LoginPage />} />
      <Route path="/welkom" element={<UsernameSetupPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/bord" element={<BoardPage />} />
          <Route path="/overzicht" element={<DashboardPage />} />
          <Route element={<ProtectedRoute editor />}>
            <Route path="/berichten/nieuw" element={<PostFormPage />} />
            <Route path="/berichten/:id/bewerken" element={<PostFormPage />} />
            <Route path="/prullenbak" element={<TrashPage />} />
          </Route>
          <Route element={<ProtectedRoute creator />}>
            <Route path="/redactie" element={<EditorsPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/bord" replace />} />
    </Routes>
  );
}
