import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { ReactNode } from "react";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const auth = useAuth();

  if (!auth?.token || !auth?.user) {
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
}
