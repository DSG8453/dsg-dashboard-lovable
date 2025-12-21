import { createContext, useContext, useState, useEffect } from "react";
import { authAPI, credentialsAPI } from "@/services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Logout function
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("dsg_token");
    localStorage.removeItem("dsg_user");
  };

  // Check for existing session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("dsg_token");
    const savedUser = localStorage.getItem("dsg_user");
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      
      // Verify token is still valid
      authAPI.getMe()
        .then((userData) => {
          setUser(userData);
          localStorage.setItem("dsg_user", JSON.stringify(userData));
        })
        .catch(() => {
          // Token invalid, clear session
          logout();
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  // Login function - calls backend API
  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      
      // Save token and user
      localStorage.setItem("dsg_token", response.access_token);
      localStorage.setItem("dsg_user", JSON.stringify(response.user));
      
      setToken(response.access_token);
      setUser(response.user);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || "Invalid email or password" };
    }
  };

  // Add credential for a tool
  const addToolCredential = async (toolId, username, password, label = "Default Account") => {
    if (!user) return null;
    
    try {
      const credential = await credentialsAPI.create({
        tool_id: toolId,
        label,
        username,
        password,
      });
      return credential;
    } catch (error) {
      console.error("Failed to add credential:", error);
      throw error;
    }
  };

  // Update existing credential
  const updateToolCredential = async (credentialId, updates) => {
    if (!user) return;
    
    try {
      const updated = await credentialsAPI.update(credentialId, updates);
      return updated;
    } catch (error) {
      console.error("Failed to update credential:", error);
      throw error;
    }
  };

  // Delete credential
  const deleteToolCredential = async (credentialId) => {
    if (!user) return;
    
    try {
      await credentialsAPI.delete(credentialId);
    } catch (error) {
      console.error("Failed to delete credential:", error);
      throw error;
    }
  };

  // Get credentials for a specific tool
  const getUserToolCredentials = async (toolId) => {
    if (!user) return [];
    
    try {
      const credentials = await credentialsAPI.getByTool(toolId);
      return credentials;
    } catch (error) {
      console.error("Failed to get credentials:", error);
      return [];
    }
  };

  // Reveal password for a credential
  const revealPassword = async (credentialId) => {
    if (!user) return null;
    
    try {
      const result = await credentialsAPI.reveal(credentialId);
      return result.password;
    } catch (error) {
      console.error("Failed to reveal password:", error);
      throw error;
    }
  };

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    addToolCredential,
    updateToolCredential,
    deleteToolCredential,
    getUserToolCredentials,
    revealPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
