"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, File, Loader } from "lucide-react";
import { Button, RainbowButton, FileUpload } from "@/components/ui";

export default function Page() {
  const backendUrl = "https://24c3-2406-7400-c8-df4b-636e-473-68ea-5287.ngrok-free.app";
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const handleFileUpload = (files: File[]) => {
    setFile(files[0]);
    console.log(files);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && !isLoading) {
      setFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isLoading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && !isLoading) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (file && !isLoading) {
      setIsLoading(true);
      try {
        // Convert file to base64
        const base64File = await convertToBase64(file);
        console.log("Base64 file:", base64File);

        // Make POST request
        const response = await fetch(backendUrl + "/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            file: base64File,
            filename: file.name,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.id) {
            router.push(`/analyze/${data.id}`);
          } else {
            console.error("Response does not contain an id");
          }
        } else {
          console.error("Upload failed");
        }
      } catch (error) {
        console.error("Error during upload:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result?.toString().split(",")[1];
        if (base64String) {
          resolve(base64String);
        } else {
          reject(new Error("Failed to convert file to base64"));
        }
      };
      reader.onerror = (error) => reject(error);
    });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-black flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl dark:text-white md:text-5xl font-bold mb-8 text-center">
        {/* Upload Security Audit File */}
      </h1>
      <div className="w-full max-w-md">
        <div className="w-full max-w-4xl mx-auto min-h-96 border-dashed border-4 bg-white dark:bg-[#0a0a0a] border-neutral-200 dark:border-neutral-800 rounded-lg">
          <FileUpload onChange={handleFileUpload} />
        </div>
        <RainbowButton
          className={`w-full mt-8 transition-colors p-4 rounded-xl flex items-center justify-center ${
            isLoading || !file
              ? "border text-gray-600 cursor-not-allowed"
              : "bg-black text-white hover:bg-gray-800"
          }`}
          onClick={handleUpload}
          disabled={!file || isLoading}
        >
          {isLoading ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              <span>Processing...</span>
            </>
          ) : file ? (
            "Analyze Security Audit"
          ) : (
            "Upload File to Begin"
          )}
        </RainbowButton>
      </div>
    </div>
  );
}
