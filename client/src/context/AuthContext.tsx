import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
  rating: number;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  signup: (userData: { username: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: async () => {},
  signup: async () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => localStorage.getItem('user') !== null
  );

  useEffect(() => {
    user ? localStorage.setItem('user', JSON.stringify(user)) : localStorage.removeItem('user');
  }, [user]);

  const login = async (credentials: { email: string; password: string }) => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // Simulated API response with actual user data
        const authenticatedUser = {
          id: 'user123',
          username: 'ActualUsername', // Replace with real username from backend
          email: credentials.email,
          rating: 1500, // Real rating from backend
        };
        
        setUser(authenticatedUser);
        setIsAuthenticated(true);
        resolve();
      }, 1000);
    });
  };

  const signup = async (userData: { username: string; email: string; password: string }) => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const newUser = {
          id: `user${Math.floor(Math.random() * 1000)}`,
          username: userData.username,
          email: userData.email,
          rating: 1200, // Initial rating for new users
        };
        
        setUser(newUser);
        setIsAuthenticated(true);
        resolve();
      }, 1000);
    });
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
