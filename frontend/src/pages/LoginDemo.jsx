import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// Preview page with user's requested changes
export const LoginDemo = () => {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-2xl font-bold text-center mb-2">Login Page Preview</h1>
      <p className="text-center text-gray-600 mb-8">Changes: No "DSG TRANSPORT LLC" text, Blue button matching logo, Bold copyright</p>
      
      {/* Preview Container */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-50 rounded-2xl p-8 flex items-center justify-center min-h-[500px]">
          <div className="w-full max-w-sm">
            {/* Card */}
            <div className="bg-white shadow-xl rounded-3xl p-8 text-center">
              {/* Logo Only - No Text */}
              <div className="mb-8">
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/691ee53ded166d6334e8b9c6/0583cf617_315logodsg_.png"
                  alt="DSG Transport LLC"
                  className="h-28 w-auto mx-auto"
                />
              </div>

              {/* Google Button - Blue to match logo */}
              <Button
                className="w-full h-14 gap-3 text-base font-medium rounded-xl bg-[#1e6bb8] hover:bg-[#1a5a9e] text-white border-0"
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
                      <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#ffffff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>

              {/* Copyright - Bold */}
              <p className="text-sm font-bold text-gray-700 mt-8">
                © 2025 DSG Transport LLC. All rights reserved.
              </p>
            </div>
          </div>
        </div>
        
        {/* Summary of changes */}
        <div className="mt-6 p-4 bg-white rounded-lg shadow">
          <h3 className="font-semibold mb-2">Changes Made:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>✅ Removed "DSG TRANSPORT LLC" text</li>
            <li>✅ Button color changed to blue (#1e6bb8) to match logo</li>
            <li>✅ Google icon changed to white for contrast</li>
            <li>✅ Copyright text is now <strong>bold</strong></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LoginDemo;
