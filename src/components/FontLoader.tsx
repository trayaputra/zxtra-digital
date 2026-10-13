import { useEffect } from "react";
import { subscribeFontSettings, type FontSetting } from "../lib/firestore";

const STYLE_ID = "custom-font-overrides";

function apply(fonts: FontSetting | null) {
  const root = document.documentElement;
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;

  if (!fonts || !fonts.enabled) {
    if (el) el.textContent = "";
    root.style.removeProperty("--app-font-display");
    root.style.removeProperty("--app-font-sans");
    return;
  }

  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }

  const faces: string[] = [];

  if (fonts.headingFamily && fonts.headingUrl) {
    faces.push(
      `@font-face{font-family:'${fonts.headingFamily}';src:url('${fonts.headingUrl}');font-display:swap;}`,
    );
    root.style.setProperty(
      "--app-font-display",
      `'${fonts.headingFamily}', 'Plus Jakarta Sans', sans-serif`,
    );
  }

  if (fonts.bodyFamily && fonts.bodyUrl) {
    faces.push(
      `@font-face{font-family:'${fonts.bodyFamily}';src:url('${fonts.bodyUrl}');font-display:swap;}`,
    );
    root.style.setProperty(
      "--app-font-sans",
      `'${fonts.bodyFamily}', 'Inter', sans-serif`,
    );
  }

  el.textContent = faces.join("\n");
}

export function FontLoader() {
  useEffect(() => {
    try {
      return subscribeFontSettings(apply);
    } catch {
      return;
    }
  }, []);

  return null;
}
