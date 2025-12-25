import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Shield } from "lucide-react";

export const LoginPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [email, setEmail] = useState("info@dsgtransport.net");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  // Check if we're inside an iframe (Emergent preview panel)
  const isInIframe = () => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    
    try {
      const redirectUrl = window.location.origin + '/';
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      
      // If in iframe (Emergent preview), redirect the parent/top window
      if (isInIframe()) {
        window.top.location.href = authUrl;
      } else {
        window.location.replace(authUrl);
      }
    } catch (error) {
      setIsLoading(false);
      toast.error("Login failed", {
        description: "Please try again or contact your administrator.",
      });
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    
    if (!password) {
      toast.error("Please enter your password");
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await login(email, password);
      
      if (result.success) {
        if (result.requiresOtp) {
          toast.info("2-Step Verification Required", {
            description: result.message,
          });
          // Handle OTP flow if needed
        } else {
          toast.success("Welcome back!", {
            description: "Super Admin login successful",
          });
          navigate("/", { replace: true });
        }
      } else {
        toast.error("Login failed", {
          description: result.error || "Invalid email or password",
        });
      }
    } catch (error) {
      toast.error("Login failed", {
        description: error.message || "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f0f4f8]">
      <div className="w-full max-w-md text-center">
        {/* Logo with text - outside card */}
        <div className="mb-8">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/691ee53ded166d6334e8b9c6/0583cf617_315logodsg_.png"
            alt="DSG Transport LLC"
            className="h-20 w-auto mx-auto"
          />
        </div>

        {/* Card */}
        <div className="bg-white shadow-lg rounded-2xl p-6">
          {!showAdminLogin ? (
            // Default View - Google SSO
            <>
              {/* Google Button - Light blue */}
              <Button
                variant="outline"
                className="w-full h-12 gap-3 text-base font-medium rounded-lg bg-[#bae6fd] hover:bg-[#7dd3fc] text-gray-700 border border-gray-200"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>

              {/* Super Admin Link */}
              <button
                type="button"
                onClick={() => setShowAdminLogin(true)}
                className="mt-4 text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center justify-center gap-1 mx-auto"
              >
                <Shield className="h-3 w-3" />
                Super Admin? Click here
              </button>
            </>
          ) : (
            // Super Admin Login View
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                <Shield className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-gray-700">Super Admin Login</span>
              </div>

              <div className="text-left space-y-2">
                <Label htmlFor="email" className="text-gray-600">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-gray-100"
                />
              </div>

              <div className="text-left space-y-2">
                <Label htmlFor="password" className="text-gray-600">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setShowAdminLogin(false);
                  setPassword("");
                }}
                className="mt-2 text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center justify-center gap-1 mx-auto"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to Google Sign In
              </button>
            </form>
          )}
        </div>

        {/* Copyright - outside card */}
        <p className="text-xs text-gray-500 mt-6">
          © 2025 DSG Transport LLC. All rights reserved.
        </p>
      </div>
    </div>
  );
};
