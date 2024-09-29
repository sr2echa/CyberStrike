"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, File, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Page() {
  const backendUrl = "https://3d45-2406-7400-c8-d322-a344-c630-8ad-e88.ngrok-free.app";
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const router = useRouter();

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
    <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl md:text-5xl font-bold mb-8 text-center">
        Upload Security Audit File
      </h1>
      <div className="w-full max-w-md">
        <label
          htmlFor="file-upload"
          className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            isLoading
              ? "border-gray-400 bg-gray-100 cursor-not-allowed"
              : isDragging
              ? "border-gray-600 bg-gray-100"
              : "border-gray-300 bg-white hover:bg-gray-50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {file ? (
              <>
                <File className="w-16 h-16 mb-3 text-gray-600" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">{file.name}</span>
                </p>
              </>
            ) : (
              <>
                <Upload className="w-16 h-16 mb-3 text-gray-600" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">PDF (MAX. 10MB)</p>
              </>
            )}
          </div>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf"
            disabled={isLoading}
          />
        </label>
        <Button
          className={`w-full mt-4 transition-colors ${
            isLoading || !file
              ? "bg-gray-400 text-gray-600 cursor-not-allowed"
              : "bg-black text-white hover:bg-gray-800"
          }`}
          onClick={handleUpload}
          disabled={!file || isLoading}
        >
          {isLoading ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : file ? (
            "Analyze Security Audit"
          ) : (
            "Upload File to Begin"
          )}
        </Button>
      </div>
    </div>
  );
}
