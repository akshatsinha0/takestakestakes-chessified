import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
  rating: number;
  avatarUrl? : string;
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
  // Initialize state from localStorage if available
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('user') !== null;
  });

  // Update localStorage whenever auth state changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  // Simulated login function - replace with actual API call in production
  const login = async (credentials: any) => {
    // Simulate API call
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        // Demo user
        const demoUser = {
          id: 'user123',
          username: credentials.email?.split('@')[0] || 'CosmosCorona10',
          email: credentials.email || 'player@chess.com',
          rating: 1850,
        };
        
        setUser(demoUser);
        setIsAuthenticated(true);
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
          username: userData.username || 'ChessPlayer',
          email: userData.email || 'player@chess.com',
          rating: 1200, // Default rating for new users
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
