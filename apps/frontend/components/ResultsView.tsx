'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, FileDown, Edit3, Trash2, ArrowLeft } from 'lucide-react';
import { CRMRecord, ProcessingResult } from '../lib/api';

interface ResultsViewProps {
  result: ProcessingResult;
  onReset: () => void;
}

// Custom NoteCell with 1-second expansion delay to prevent scattering/layout jump
function NoteCell({ note }: { note: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    // Start timeout for 1 second (1000ms)
    timeoutRef.current = setTimeout(() => {
      setIsExpanded(true);
    }, 1000);
  };

  const handleMouseLeave = () => {
    // Cancel timeout if cursor leaves before 1 second
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsExpanded(false);
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!note) return <span className="text-zinc-400 dark:text-zinc-600">-</span>;

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`break-words whitespace-normal leading-relaxed cursor-help transition-all duration-300 ${
        isExpanded ? 'line-clamp-none' : 'line-clamp-2'
      }`}
    >
      {note}
    </div>
  );
}

export default function ResultsView({ result, onReset }: ResultsViewProps) {
  const [activeTab, setActiveTab] = useState<'success' | 'skipped'>('success');
  const [successRecords, setSuccessRecords] = useState<CRMRecord[]>(result.successful);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<CRMRecord>>({});

  const totalImported = successRecords.length;
  const totalSkipped = result.skipped.length;
  const processingTimeSec = (result.metrics.processingTimeMs / 1000).toFixed(2);

  // Calculate completeness score (percentage of fields filled across successful records)
  const completenessScore = useMemo(() => {
    if (successRecords.length === 0) return 0;
    let filledCount = 0;
    const totalFields = successRecords.length * 15; // 15 fields per record

    successRecords.forEach(rec => {
      Object.values(rec).forEach(val => {
        if (val !== undefined && val !== null && val !== '') {
          filledCount++;
        }
      });
    });

    return Math.round((filledCount / totalFields) * 100);
  }, [successRecords]);

  // Export via fetch() to backend, then programmatic blob download
  const handleExport = async (format: 'csv' | 'json') => {
    if (successRecords.length === 0) return;

    try {
      const res = await fetch('/api/backend/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: successRecords, format }),
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const dateStr = new Date().toISOString().slice(0, 10);
      const ext = format === 'csv' ? 'csv' : 'json';
      const filename = `crm_leads_${dateStr}.${ext}`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export. Please try again.');
    }
  };

  const startEdit = (idx: number, record: CRMRecord) => {
    setEditingId(idx);
    setEditFormData({ ...record });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const saveEdit = (idx: number) => {
    const updated = [...successRecords];
    updated[idx] = editFormData as CRMRecord;
    setSuccessRecords(updated);
    setEditingId(null);
  };

  const deleteRecord = (idx: number) => {
    const updated = successRecords.filter((_, i) => i !== idx);
    setSuccessRecords(updated);
  };

  return (
    <div className="space-y-8">
      {/* Top action header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onReset}
          className="flex items-center space-x-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Upload Another File</span>
        </button>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleExport('csv')}
            disabled={successRecords.length === 0}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-border dark:border-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-850 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-zinc-700 dark:text-zinc-200 transition-all animate-fade-in"
          >
            <FileDown className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => handleExport('json')}
            disabled={successRecords.length === 0}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-border dark:border-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-850 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-zinc-700 dark:text-zinc-200 transition-all animate-fade-in"
          >
            <FileDown className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="p-5 rounded-2xl glass-panel text-left space-y-1"
        >
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Total Imported</div>
          <div className="text-3xl font-bold text-zinc-800 dark:text-zinc-100">{totalImported}</div>
          <div className="text-[10px] text-zinc-550 dark:text-zinc-400">Successfully mapped leads</div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-2xl glass-panel text-left space-y-1"
        >
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Total Skipped</div>
          <div className="text-3xl font-bold text-red-500 dark:text-red-400">{totalSkipped}</div>
          <div className="text-[10px] text-zinc-500 dark:text-zinc-400">No email or mobile found</div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="p-5 rounded-2xl glass-panel text-left space-y-1"
        >
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Completeness</div>
          <div className="text-3xl font-bold text-indigo-650 dark:text-indigo-400">{completenessScore}%</div>
          <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Field population density</div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="p-5 rounded-2xl glass-panel text-left space-y-1"
        >
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Processing Time</div>
          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{processingTimeSec}s</div>
          <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Fast streaming parser & AI</div>
        </motion.div>
      </div>

      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('success')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center space-x-2 ${
            activeTab === 'success'
              ? 'border-indigo-500 text-indigo-650 dark:text-indigo-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-205 dark:hover:text-white'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Success Records ({successRecords.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('skipped')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center space-x-2 ${
            activeTab === 'skipped'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-205 dark:hover:text-white'
          }`}
        >
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span>Skipped Records ({result.skipped.length})</span>
        </button>
      </div>

      {/* Content Grid */}
      <div>
        {activeTab === 'success' && (
          <div className="overflow-x-auto rounded-xl border border-border bg-card/20 backdrop-blur-md">
            {successRecords.length === 0 ? (
              <div className="py-12 text-center text-sm text-zinc-500">No records successfully imported.</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-zinc-100/90 dark:bg-zinc-900/60 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-zinc-650 dark:text-zinc-400">Created At</th>
                    <th className="px-4 py-3 font-semibold text-zinc-655 dark:text-zinc-400">Name</th>
                    <th className="px-4 py-3 font-semibold text-zinc-655 dark:text-zinc-400">Contact Details</th>
                    <th className="px-4 py-3 font-semibold text-zinc-655 dark:text-zinc-400">Company</th>
                    <th className="px-4 py-3 font-semibold text-zinc-655 dark:text-zinc-400">Location</th>
                    <th className="px-4 py-3 font-semibold text-zinc-655 dark:text-zinc-400">Status</th>
                    <th className="px-4 py-3 font-semibold text-zinc-655 dark:text-zinc-400">Source</th>
                    <th className="px-4 py-3 font-semibold text-zinc-655 dark:text-zinc-400">Note</th>
                    <th className="px-4 py-3 font-semibold text-zinc-655 dark:text-zinc-400 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {successRecords.map((rec, idx) => {
                    const isEditing = editingId === idx;
                    return (
                      <tr key={idx} className="hover:bg-zinc-100/40 dark:hover:bg-zinc-900/20 transition-all">
                        {/* Created At */}
                        <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                          {isEditing ? (
                            <input
                              type="text"
                              name="created_at"
                              value={editFormData.created_at || ''}
                              onChange={handleEditChange}
                              className="w-full bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded px-1.5 py-0.5 text-zinc-900 dark:text-zinc-100"
                            />
                          ) : (
                            new Date(rec.created_at).toLocaleDateString()
                          )}
                        </td>

                        {/* Name */}
                        <td className="px-4 py-2.5 font-semibold text-zinc-900 dark:text-zinc-100">
                          {isEditing ? (
                            <input
                              type="text"
                              name="name"
                              value={editFormData.name || ''}
                              onChange={handleEditChange}
                              className="w-full bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded px-1.5 py-0.5 text-zinc-900 dark:text-zinc-100"
                            />
                          ) : (
                            rec.name
                          )}
                        </td>

                        {/* Contact Details */}
                        <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300 space-y-0.5">
                          {isEditing ? (
                            <div className="space-y-1">
                              <input
                                type="email"
                                name="email"
                                value={editFormData.email || ''}
                                onChange={handleEditChange}
                                className="w-full bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded px-1.5 py-0.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
                                placeholder="Email"
                              />
                              <div className="flex space-x-1">
                                <input
                                  type="text"
                                  name="country_code"
                                  value={editFormData.country_code || ''}
                                  onChange={handleEditChange}
                                  className="w-12 bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded px-1.5 py-0.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 text-center"
                                  placeholder="+91"
                                />
                                <input
                                  type="text"
                                  name="mobile_without_country_code"
                                  value={editFormData.mobile_without_country_code || ''}
                                  onChange={handleEditChange}
                                  className="flex-1 bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded px-1.5 py-0.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
                                  placeholder="Mobile"
                                />
                              </div>
                            </div>
                          ) : (
                            <>
                              {rec.email && <div className="text-zinc-800 dark:text-zinc-200">{rec.email}</div>}
                              {rec.mobile_without_country_code && (
                                <div className="text-zinc-500 dark:text-zinc-400 font-mono">
                                  {rec.country_code} {rec.mobile_without_country_code}
                                </div>
                              )}
                            </>
                          )}
                        </td>

                        {/* Company */}
                        <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                          {isEditing ? (
                            <input
                              type="text"
                              name="company"
                              value={editFormData.company || ''}
                              onChange={handleEditChange}
                              className="w-full bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded px-1.5 py-0.5 text-zinc-900 dark:text-zinc-100"
                            />
                          ) : (
                            rec.company || <span className="text-zinc-400 dark:text-zinc-600">-</span>
                          )}
                        </td>

                        {/* Location */}
                        <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                          {isEditing ? (
                            <div className="space-y-1">
                              <input
                                type="text"
                                name="city"
                                value={editFormData.city || ''}
                                onChange={handleEditChange}
                                className="w-full bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded px-1.5 py-0.5 text-zinc-900 dark:text-zinc-100"
                                placeholder="City"
                              />
                              <input
                                type="text"
                                name="country"
                                value={editFormData.country || ''}
                                onChange={handleEditChange}
                                className="w-full bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded px-1.5 py-0.5 text-zinc-900 dark:text-zinc-100"
                                placeholder="Country"
                              />
                            </div>
                          ) : (
                            <span>
                              {rec.city || rec.state || rec.country
                                ? [rec.city, rec.state, rec.country].filter(Boolean).join(', ')
                                : <span className="text-zinc-400 dark:text-zinc-600">-</span>}
                            </span>
                          )}
                        </td>

                        {/* CRM Status */}
                        <td className="px-4 py-2.5">
                          {isEditing ? (
                            <select
                              name="crm_status"
                              value={editFormData.crm_status}
                              onChange={handleEditChange}
                              className="bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded px-1 py-0.5 text-zinc-900 dark:text-zinc-100"
                            >
                              <option value="GOOD_LEAD_FOLLOW_UP">GOOD_LEAD_FOLLOW_UP</option>
                              <option value="DID_NOT_CONNECT">DID_NOT_CONNECT</option>
                              <option value="BAD_LEAD">BAD_LEAD</option>
                              <option value="SALE_DONE">SALE_DONE</option>
                            </select>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${
                                rec.crm_status === 'GOOD_LEAD_FOLLOW_UP'
                                  ? 'bg-emerald-500/10 text-emerald-650 dark:text-emerald-400'
                                  : rec.crm_status === 'SALE_DONE'
                                  ? 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400'
                                  : rec.crm_status === 'DID_NOT_CONNECT'
                                  ? 'bg-amber-500/10 text-amber-650 dark:text-amber-400'
                                  : 'bg-red-500/10 text-red-650 dark:text-red-400'
                              }`}
                            >
                              {rec.crm_status.replace(/_/g, ' ')}
                            </span>
                          )}
                        </td>

                        {/* Source */}
                        <td className="px-4 py-2.5 text-zinc-550 dark:text-zinc-400 font-mono">
                          {isEditing ? (
                            <select
                              name="data_source"
                              value={editFormData.data_source || ''}
                              onChange={handleEditChange}
                              className="bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded px-1 py-0.5 text-zinc-900 dark:text-zinc-100"
                            >
                              <option value="">(None)</option>
                              <option value="leads_on_demand">leads_on_demand</option>
                              <option value="meridian_tower">meridian_tower</option>
                              <option value="eden_park">eden_park</option>
                              <option value="varah_swamy">varah_swamy</option>
                              <option value="sarjapur_plots">sarjapur_plots</option>
                            </select>
                          ) : (
                            rec.data_source || <span className="text-zinc-400 dark:text-zinc-600">-</span>
                          )}
                        </td>

                        {/* Note */}
                        <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400 max-w-xs">
                          {isEditing ? (
                            <input
                              type="text"
                              name="crm_note"
                              value={editFormData.crm_note || ''}
                              onChange={handleEditChange}
                              className="w-full bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded px-1.5 py-0.5 text-zinc-900 dark:text-zinc-100"
                            />
                          ) : (
                            <NoteCell note={rec.crm_note} />
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-2.5 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveEdit(idx)}
                                  className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 hover:text-indigo-650 dark:hover:text-indigo-300"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-550 dark:hover:text-zinc-300"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEdit(idx, rec)}
                                  className="p-1 rounded bg-white dark:bg-zinc-900 border border-border dark:border-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                                  title="Edit Record"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteRecord(idx)}
                                  className="p-1 rounded bg-white dark:bg-zinc-900 border border-border dark:border-zinc-850 hover:bg-red-50 dark:hover:bg-zinc-800 text-red-500 dark:text-red-400 hover:text-red-600 hover:bg-red-500/10 transition-colors"
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'skipped' && (
          <div className="overflow-x-auto rounded-xl border border-border bg-card/20 backdrop-blur-md">
            {result.skipped.length === 0 ? (
              <div className="py-12 text-center text-sm text-zinc-500">No records were skipped! Clean import.</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-zinc-100/90 dark:bg-zinc-900/60 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-zinc-600 dark:text-zinc-400">Index</th>
                    <th className="px-4 py-3 font-semibold text-red-500 dark:text-red-400">Reason for Skip</th>
                    <th className="px-4 py-3 font-semibold text-zinc-600 dark:text-zinc-400">Original Row Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {result.skipped.map((skip, idx) => (
                    <tr key={idx} className="hover:bg-zinc-100/40 dark:hover:bg-zinc-900/10 transition-all">
                      <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400 font-mono">#{idx + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-red-500 dark:text-red-400 flex items-center space-x-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{skip.reason}</span>
                      </td>
                      <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400 max-w-lg font-mono text-[10px] break-all">
                        {JSON.stringify(skip.row)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
