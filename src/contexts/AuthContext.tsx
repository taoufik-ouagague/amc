import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  addUser: (userData: Omit<User, 'id' | 'created_at'>) => Promise<User>;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  getAllUsers: () => User[];
  setUserPassword: (email: string, password: string) => void;
  getUserById: (id: string) => User | undefined;
  syncData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);

  // Load users from Supabase
  const loadUsers = async () => {
    try {
      // Check if profiles table exists by making a minimal query
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      if (error && error.code === '42P01') {
        // Table doesn't exist, use localStorage
        const storedUsers = localStorage.getItem('amc_booking_system_v1.0_users');
        if (storedUsers) {
          setUsers(JSON.parse(storedUsers));
        }
        return;
      }
      
      if (error) {
        throw error;
      }
      
      // Table exists, get all users
      const { data: allUsers, error: allUsersError } = await supabase
        .from('profiles')
        .select('*');
        
      if (allUsersError) {
        throw allUsersError;
      }
      
      if (allUsers && allUsers.length > 0) {
        setUsers(allUsers);
      } else {
        // If no users in Supabase, check localStorage
        const storedUsers = localStorage.getItem('amc_booking_system_v1.0_users');
        if (storedUsers) {
          setUsers(JSON.parse(storedUsers));
        }
      }
    } catch (error) {
      // Silently fall back to localStorage for any Supabase errors
      const storedUsers = localStorage.getItem('amc_booking_system_v1.0_users');
      if (storedUsers) {
        setUsers(JSON.parse(storedUsers));
      }
    }
  };

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Check if profiles table exists first
          const { data: testData, error: testError } = await supabase
            .from('profiles')
            .select('id')
            .limit(1);
          
          if (testError && testError.code === '42P01') {
            // Table doesn't exist, use localStorage
            const storedUser = localStorage.getItem('amc_booking_system_v1.0_currentUser');
            if (storedUser) {
              setUser(JSON.parse(storedUser));
            }
            return;
          }
          
          // Table exists, get user profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (profileError || !profile) {
            // Profile not found, check localStorage
            const storedUser = localStorage.getItem('amc_booking_system_v1.0_currentUser');
            if (storedUser) {
              setUser(JSON.parse(storedUser));
            }
          } else {
            setUser(profile);
          }
        }
      } catch (error) {
        // Silently fall back to localStorage
        const storedUser = localStorage.getItem('amc_booking_system_v1.0_currentUser');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
    loadUsers();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (!error && profile) {
            setUser(profile);
          }
        } catch (error) {
          // Silently ignore profile fetch errors during auth state changes
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.user) {
        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) throw profileError;
        
        if (profile) {
          setUser(profile);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      
      // Fallback to localStorage authentication
      const storedUsers = localStorage.getItem('amc_booking_system_v1.0_users');
      const storedPasswords = localStorage.getItem('amc_booking_system_v1.0_userPasswords');
      
      if (storedUsers && storedPasswords) {
        const users = JSON.parse(storedUsers);
        const passwords = JSON.parse(storedPasswords);
        
        const foundUser = users.find((u: User) => u.email === email);
        if (foundUser && passwords[email] === password) {
          setUser(foundUser);
          localStorage.setItem('amc_booking_system_v1.0_currentUser', JSON.stringify(foundUser));
          return true;
        }
      }
      
      return false;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    setUser(null);
    localStorage.removeItem('amc_booking_system_v1.0_currentUser');
  };

  const addUser = async (userData: Omit<User, 'id' | 'created_at'>): Promise<User> => {
    try {
      // Create auth user first
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: 'temp123456', // Temporary password
        email_confirm: true
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            name: userData.name,
            role: userData.role,
            tokens_given: userData.tokens_given,
            tokens_consumed: userData.tokens_consumed,
            tokens_remaining: userData.tokens_remaining
          })
          .select()
          .single();

        if (profileError) throw profileError;
        
        await loadUsers(); // Refresh users list
        return profile;
      }
      
      throw new Error('Failed to create user');
    } catch (error) {
      console.error('Error adding user:', error);
      
      // Fallback to localStorage
      const newUser: User = {
        ...userData,
        id: Date.now().toString(),
        created_at: new Date().toISOString()
      };
      
      const updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      localStorage.setItem('amc_booking_system_v1.0_users', JSON.stringify(updatedUsers));
      
      return newUser;
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      await loadUsers(); // Refresh users list
      
      // Update current user if it's the same user
      if (user && user.id === id) {
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      
      // Fallback to localStorage
      const updatedUsers = users.map(u => u.id === id ? { ...u, ...updates } : u);
      setUsers(updatedUsers);
      localStorage.setItem('amc_booking_system_v1.0_users', JSON.stringify(updatedUsers));
      
      if (user && user.id === id) {
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        localStorage.setItem('amc_booking_system_v1.0_currentUser', JSON.stringify(updatedUser));
      }
    }
  };

  const deleteUser = async (id: string) => {
    try {
      // Delete from profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (profileError) throw profileError;

      // Delete auth user
      const { error: authError } = await supabase.auth.admin.deleteUser(id);
      if (authError) console.error('Error deleting auth user:', authError);
      
      await loadUsers(); // Refresh users list
      
      // If current user was deleted, log them out
      if (user && user.id === id) {
        logout();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      
      // Fallback to localStorage
      const updatedUsers = users.filter(u => u.id !== id);
      setUsers(updatedUsers);
      localStorage.setItem('amc_booking_system_v1.0_users', JSON.stringify(updatedUsers));
      
      if (user && user.id === id) {
        logout();
      }
    }
  };

  const getAllUsers = () => users;

  const setUserPassword = async (email: string, password: string) => {
    try {
      const targetUser = users.find(u => u.email === email);
      if (targetUser) {
        const { error } = await supabase.auth.admin.updateUserById(targetUser.id, {
          password: password
        });
        
        if (error) throw error;
        
        // Force refresh users list to ensure sync across devices
        await loadUsers();
        
        // If this is the current user, they'll need to re-login with new password
        if (user && user.email === email) {
          // Optional: Show a message that they need to re-login
          console.log('Password updated for current user - re-login may be required');
        }
      }
    } catch (error) {
      console.error('Error setting password:', error);
      throw error; // Re-throw to let the UI handle the error
    }
  };

  const getUserById = (id: string) => {
    return users.find(user => user.id === id);
  };

  const syncData = () => {
    loadUsers();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isLoading, 
      addUser, 
      updateUser, 
      deleteUser, 
      getAllUsers,
      setUserPassword,
      getUserById,
      syncData
    }}>
      {children}
    </AuthContext.Provider>
  );
};