'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, CheckCircle2, ChevronRight, FileSpreadsheet } from 'lucide-react';
import Dropzone from '../components/Dropzone';
import PreviewTable from '../components/PreviewTable';
import ResultsView from '../components/ResultsView';
import { uploadCSV, processCSVRows, UploadResponse, ProcessingResult } from '../lib/api';

export default function Home() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadData, setUploadData] = useState<UploadResponse | null>(null);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const res = await uploadCSV(file);
      setUploadData(res);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'File upload and parsing failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (!uploadData || uploadData.rows.length === 0) return;
    setIsProcessing(true);
    setError(null);
    setStep(3);
    try {
      const res = await processCSVRows(uploadData.rows);
      setProcessingResult(res);
      setStep(4);
    } catch (err: any) {
      setError(err.message || 'AI Mapping processing failed.');
      setStep(2);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setUploadData(null);
    setProcessingResult(null);
    setError(null);
  };

  return (
    <div className="space-y-12">
      {/* Header section with brand and sparkles */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Intelligent Lead Mapping</span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-zinc-100">
          AI-Powered CSV Importer
        </h1>
        <p className="text-sm text-zinc-450">
          Upload any CSV format with custom headers, and let GrowEasy's AI intelligently map and extract high-quality CRM records instantly.
        </p>
      </div>

      {/* Dynamic Step indicator */}
      <div className="flex items-center justify-center space-x-2 text-xs font-medium text-zinc-500 max-w-md mx-auto">
        <span className={step >= 1 ? 'text-indigo-400 font-bold' : ''}>1. Upload</span>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-700" />
        <span className={step >= 2 ? 'text-indigo-400 font-bold' : ''}>2. Preview</span>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-700" />
        <span className={step >= 3 ? 'text-indigo-400 font-bold' : ''}>3. AI Process</span>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-700" />
        <span className={step >= 4 ? 'text-indigo-400 font-bold' : ''}>4. Results</span>
      </div>

      {/* Main interaction workspace */}
      <div className="max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          {/* Step 1: Upload Dropzone */}
          {step === 1 && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <Dropzone onFileSelect={handleFileSelect} isLoading={isUploading} />
              
              {isUploading && (
                <div className="flex flex-col items-center justify-center space-y-2 text-xs text-zinc-400">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                  <span>Parsing CSV file structures...</span>
                </div>
              )}

              {error && (
                <div className="text-center text-xs text-red-400 bg-red-500/10 border border-red-500/20 max-w-md mx-auto p-3 rounded-xl">
                  {error}
                </div>
              )}
            </motion.div>
          )}

          {/* Step 2: Data Table Preview */}
          {step === 2 && uploadData && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* File Info Bar */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-950/20">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-indigo-400">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-200">{uploadData.filename}</h3>
                    <p className="text-[10px] text-zinc-500">File loaded successfully • {uploadData.totalRows} rows parsed</p>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 rounded-lg border border-zinc-800 hover:bg-zinc-900 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] flex items-center space-x-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Map with AI</span>
                  </button>
                </div>
              </div>

              {/* Preview Grid */}
              <PreviewTable rows={uploadData.rows} />
            </motion.div>
          )}

          {/* Step 3: AI Processing Loader */}
          {step === 3 && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 space-y-6 text-center"
            >
              <div className="relative">
                <Loader2 className="w-16 h-16 animate-spin text-indigo-500" />
                <Sparkles className="w-6 h-6 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-zinc-200">AI Semantic Mapping in Progress...</h3>
                <p className="text-xs text-zinc-505 text-zinc-500 max-w-sm">
                  We are scanning columns, mapping fields to the CRM schema, standardizing statuses and sources, and filtering invalid rows.
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 4: Final Results View */}
          {step === 4 && processingResult && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4 }}
            >
              <ResultsView result={processingResult} onReset={handleReset} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
