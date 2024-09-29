"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, File } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (file) {
      // Simulating file upload and analysis
      console.log("Uploading file:", file.name);
      // Redirect to analysis page with a dummy ID
      router.push("/analyze/dummy-id");
    }
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
            isDragging ? "border-gray-600 bg-gray-100" : "border-gray-300 bg-white hover:bg-gray-50"
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
          />
        </label>
        <Button
          className="w-full mt-4 bg-black text-white hover:bg-gray-800 transition-colors"
          onClick={handleUpload}
          disabled={!file}
        >
          {file ? "Analyze Security Audit" : "Upload File to Begin"}
        </Button>
      </div>
    </div>
  );
}
