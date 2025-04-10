import { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
  rating: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: any) => Promise<void>;
  signup: (userData: any) => Promise<void>;
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
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Simulated login function - replace with actual API call in production
  const login = async (credentials: any) => {
    // Simulate API call
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        // Demo user
        const demoUser = {
          id: 'user123',
          username: credentials.email.split('@')[0],
          email: credentials.email,
          rating: 1850,
        };
        
        setUser(demoUser);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(demoUser));
        resolve();
      }, 1000);
    });
  };

  // Simulated signup function - replace with actual API call in production
  const signup = async (userData: any) => {
    // Simulate API call
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        // Create new user
        const newUser = {
          id: 'user' + Math.floor(Math.random() * 1000),
          username: userData.username,
          email: userData.email,
          rating: 1200, // Default rating for new users
        };
        
        setUser(newUser);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(newUser));
        resolve();
      }, 1000);
    });
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
