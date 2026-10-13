import { getAppConfig } from "./app-config";

const CLOUD_NAME = getAppConfig().cloudinaryCloudName;
const UPLOAD_PRESET = getAppConfig().cloudinaryUploadPreset;

export async function uploadToCloudinary(
  file: File,
  type: "image" | "video" | "raw" = "image"
): Promise<string> {
  if (!CLOUD_NAME) {
    throw new Error("VITE_CLOUDINARY_CLOUD_NAME belum diisi.");
  }

  if (!UPLOAD_PRESET) {
    throw new Error("VITE_CLOUDINARY_UPLOAD_PRESET belum diisi.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const resourceType = type === "video" ? "video" : type === "raw" ? "raw" : "image";

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Upload Cloudinary gagal.");
  }

  const data = await res.json();

  if (!data.secure_url) {
    throw new Error("Cloudinary tidak mengembalikan secure_url.");
  }

  return data.secure_url as string;
}