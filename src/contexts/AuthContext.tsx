import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  sendEmailVerification,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { createUserProfile, getUserProfile } from "../lib/firestore";
import type { User } from "../types";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  checkEmailVerification: () => Promise<boolean>;
  isAdmin: boolean;
  isReseller: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (firebaseUser) {
      const profile = await getUserProfile(firebaseUser.uid);
      setUserProfile(profile);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (user) {
        // Admin email may skip email verification only when its Firestore profile
        // already has the admin role. Never grant admin role from email alone.
        const existingProfile = await getUserProfile(user.uid);
        const isVerifiedAdmin =
          user.email?.trim().toLowerCase() === "admin@gmail.com" &&
          existingProfile?.role === "admin";

        const isPasswordProvider = user.providerData.some((p) => p.providerId === "password");
        if (isPasswordProvider && !user.emailVerified && !isVerifiedAdmin) {
          setFirebaseUser(null);
          setUserProfile(null);
          setLoading(false);
          return;
        }

        const profile = existingProfile;

        if (!profile) {
          await createUserProfile(user.uid, {
            displayName:
              user.displayName ||
              user.email?.split("@")[0] ||
              "User",
            email: user.email || "",
            role: "user",
            totalTransactions: 0,
            photoURL: user.photoURL || "",
          });

          const newProfile = await getUserProfile(user.uid);
          setUserProfile(newProfile);
        } else {
          setUserProfile(profile);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    if (credential.user.emailVerified) return;

    const isAdminEmail = email.trim().toLowerCase() === "admin@gmail.com";
    const profile = isAdminEmail
      ? await getUserProfile(credential.user.uid)
      : null;
    const isVerifiedAdmin = isAdminEmail && profile?.role === "admin";

    if (!isVerifiedAdmin) {
      await signOut(auth);
      throw new Error("Email belum diverifikasi. Buka link verifikasi yang dikirim ke email kamu, lalu coba masuk lagi.");
    }
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();

    provider.setCustomParameters({
      prompt: "select_account",
    });

    const result = await signInWithPopup(auth, provider);
    const googleUser = result.user;

    const existingProfile = await getUserProfile(googleUser.uid);

    if (!existingProfile) {
      await createUserProfile(googleUser.uid, {
        displayName:
          googleUser.displayName ||
          googleUser.email?.split("@")[0] ||
          "User",
        email: googleUser.email || "",
        role: "user",
        totalTransactions: 0,
        photoURL: googleUser.photoURL || "",
      });
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string
  ) => {
    const cred = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    await updateProfile(cred.user, {
      displayName: name,
    });

    // Firebase sends the verification link. Profile is created only after
    // the user verifies their email and signs in again.
    const actionCodeSettings = {
      url: `${window.location.origin}/auth?verified=1`,
      handleCodeInApp: false,
    };
    await sendEmailVerification(cred.user, actionCodeSettings);
    // Keep Firebase session available so the verification page can detect
    // emailVerified after the user opens the link in the same browser.
  };

  const checkEmailVerification = async (): Promise<boolean> => {
    const current = auth.currentUser;
    if (!current) return false;

    await current.reload();
    const refreshedUser = auth.currentUser;
    if (!refreshedUser) return false;

    const profile = await getUserProfile(refreshedUser.uid);
    const isVerifiedAdmin =
      refreshedUser.email?.trim().toLowerCase() === "admin@gmail.com" &&
      profile?.role === "admin";
    if (!refreshedUser.emailVerified && !isVerifiedAdmin) return false;

    setFirebaseUser(refreshedUser);
    if (!profile) {
      await createUserProfile(refreshedUser.uid, {
        displayName: refreshedUser.displayName || refreshedUser.email?.split("@")[0] || "User",
        email: refreshedUser.email || "",
        role: "user",
        totalTransactions: 0,
        photoURL: refreshedUser.photoURL || "",
      });
      setUserProfile(await getUserProfile(refreshedUser.uid));
    } else {
      setUserProfile(profile);
    }
    return true;
  };

  const logout = async () => {
    await signOut(auth);
  };

  const isAdmin = userProfile?.role === "admin";
  const isReseller =
    userProfile?.role === "reseller" ||
    userProfile?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        loading,
        login,
        loginWithGoogle,
        register,
        logout,
        refreshProfile,
        checkEmailVerification,
        isAdmin,
        isReseller,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be inside AuthProvider");
  }

  return ctx;
}
