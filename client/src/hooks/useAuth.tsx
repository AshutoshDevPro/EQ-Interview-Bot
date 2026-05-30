import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase";

interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isFirebaseReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
    confirmPassword: string,
    firstName?: string,
    lastName?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth || !db) {
      setIsLoading(false);
      return;
    }

    const authInstance = auth;
    const dbInstance = db;

    const unsubscribe = onAuthStateChanged(authInstance, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const userDocRef = doc(dbInstance, "users", firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          setUser({
            id: firebaseUser.uid,
            username: String(data.username ?? firebaseUser.email?.split("@")[0] ?? "user"),
            email: firebaseUser.email ?? "",
            firstName: data.firstName ? String(data.firstName) : null,
            lastName: data.lastName ? String(data.lastName) : null,
          });
        } else {
          const fallbackUser: User = {
            id: firebaseUser.uid,
            username: firebaseUser.email?.split("@")[0] ?? "user",
            email: firebaseUser.email ?? "",
            firstName: null,
            lastName: null,
          };

          await setDoc(userDocRef, {
            username: fallbackUser.username,
            email: fallbackUser.email,
            firstName: null,
            lastName: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          setUser(fallbackUser);
        }
      } catch (error) {
        console.error("Failed to load user profile:", error);
        setUser({
          id: firebaseUser.uid,
          username: firebaseUser.email?.split("@")[0] ?? "user",
          email: firebaseUser.email ?? "",
          firstName: null,
          lastName: null,
        });
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error("Firebase is not configured. Add VITE_FIREBASE_* values in .env.");
    }

    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (
    username: string,
    email: string,
    password: string,
    confirmPassword: string,
    firstName?: string,
    lastName?: string
  ) => {
    if (!isFirebaseConfigured || !auth || !db) {
      throw new Error("Firebase is not configured. Add VITE_FIREBASE_* values in .env.");
    }

    if (password !== confirmPassword) {
      throw new Error("Passwords do not match");
    }

    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const userDocRef = doc(db, "users", credential.user.uid);

    await setDoc(userDocRef, {
      username,
      email,
      firstName: firstName || null,
      lastName: lastName || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  const logout = async () => {
    if (!isFirebaseConfigured || !auth) {
      setUser(null);
      return;
    }

    await signOut(auth);
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isFirebaseReady: isFirebaseConfigured,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
