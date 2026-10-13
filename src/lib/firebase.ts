import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";
import { getAppConfig } from "./app-config";

const runtimeConfig = getAppConfig();

// Placeholders keep the SDK from throwing before the admin fills in /setup.
const firebaseConfig = {
  apiKey: runtimeConfig.firebaseApiKey || "not-configured",
  authDomain:
    runtimeConfig.firebaseAuthDomain || "not-configured.firebaseapp.com",
  projectId: runtimeConfig.firebaseProjectId || "not-configured",
  storageBucket:
    runtimeConfig.firebaseStorageBucket || "not-configured.appspot.com",
  messagingSenderId:
    runtimeConfig.firebaseMessagingSenderId || "000000000000",
  appId: runtimeConfig.firebaseAppId || "1:000000000000:web:0000000000",
};

const app = initializeApp(firebaseConfig);

// Firebase App Check + reCAPTCHA Enterprise
const recaptchaKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_KEY;

if (recaptchaKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(recaptchaKey),
    isTokenAutoRefreshEnabled: true,
  });
}

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
