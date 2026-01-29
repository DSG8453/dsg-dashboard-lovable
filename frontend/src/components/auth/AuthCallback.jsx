import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

/**
 * AuthCallback component handles the Google OAuth callback.
 * It processes the token from the URL fragment and sets up the user session.
 */
export const AuthCallback = () => {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      // Extract params from URL fragment (after #)
      const hash = location.hash;
      const params = new URLSearchParams(hash.replace("#", ""));
      
      // Check for direct token (from Google OAuth flow)
      const token = params.get("token");
      
      // Check for error
      const error = params.get("error");
      
      if (error) {
        let errorMessage = "Authentication failed";
        if (error === "no_account") {
          const email = params.get("email");
          errorMessage = `No account found for ${email || 'this email'}. Please contact your administrator.`;
        } else if (error === "suspended") {
          errorMessage = "Your account is suspended. Please contact administrator.";
        }
        toast.error("Login Failed", { description: errorMessage });
        navigate("/login", { replace: true });
        return;
      }

      if (token) {
        // New direct Google OAuth flow - token received directly
        try {
          const result = await loginWithToken(token);
          
          if (result.success) {
            toast.success("Welcome!", {
              description: `Signed in as ${result.user.name}`,
            });
            navigate("/", { replace: true });
          } else {
            toast.error("Login Failed", { description: result.error });
            navigate("/login", { replace: true });
          }
        } catch (error) {
          console.error("Token auth error:", error);
          toast.error("Authentication failed");
          navigate("/login", { replace: true });
        }
        return;
      }

      // No token found
      toast.error("Invalid authentication callback");
      navigate("/login", { replace: true });
    };

    processSession();
  }, [location.hash, loginWithToken, navigate]);

  return (
    <div className="min-h-screen bg-gradient-dsg flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Signing you in...
        </h2>
        <p className="text-muted-foreground">
          Please wait while we verify your Google account.
        </p>
      </div>
    </div>
  );
};
