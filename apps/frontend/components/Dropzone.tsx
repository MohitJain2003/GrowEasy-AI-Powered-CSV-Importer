'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, X, AlertCircle } from 'lucide-react';

interface DropzoneProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

export default function Dropzone({ onFileSelect, isLoading }: DropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const validateFile = (file: File): boolean => {
    setError(null);
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setError('Invalid file format. Please upload a valid CSV file.');
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds the 10MB limit.');
      return false;
    }
    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        onFileSelect(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        onFileSelect(file);
      }
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={`relative rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 glass-panel ${
          isDragActive 
            ? 'border-indigo-500 bg-indigo-500/5 shadow-[0_0_25px_rgba(99,102,241,0.15)]' 
            : 'hover:border-zinc-500/50'
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFileChange}
          disabled={isLoading}
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <motion.div
            animate={isDragActive ? { scale: 1.1, rotate: 5 } : { scale: 1 }}
            className={`p-4 rounded-full ${
              isDragActive ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-200/50 dark:bg-zinc-800/50 text-zinc-650 dark:text-zinc-400'
            }`}
          >
            {selectedFile ? (
              <FileSpreadsheet className="w-10 h-10 text-indigo-400 animate-pulse" />
            ) : (
              <Upload className="w-10 h-10" />
            )}
          </motion.div>

          {selectedFile ? (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{selectedFile.name}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-base font-medium text-zinc-800 dark:text-zinc-200">
                {isDragActive ? 'Drop your CSV file here' : 'Drop your CSV file here, or click to browse'}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Supports .csv files up to 10MB</p>
            </div>
          )}
        </div>

        {/* Action Button inside Dropzone */}
        {selectedFile && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearSelection();
            }}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800/80 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </motion.div>

      {/* Error alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center space-x-2.5 text-xs text-red-400"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
