import { Routes, Route, Navigate } from "react-router-dom";
import Signin from "./Pages/signin";
import Signup from "./Pages/signup";
import Dashboard from "./Pages/dashboard";
import Interview from "./Pages/interview";
import Feedback from "./Pages/feedback";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/signin" element={<Signin />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/interview/:id"
        element={
          <ProtectedRoute>
            <Interview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/feedback/:id"
        element={
          <ProtectedRoute>
            <Feedback />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/signin" replace />} />
    </Routes>
  );
}

export default App;
