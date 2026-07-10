'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Eye, ChevronLeft, ChevronRight } from 'lucide-react';

interface PreviewTableProps {
  rows: Record<string, string>[];
}

export default function PreviewTable({ rows }: PreviewTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Deduplicate and extract headers
  const headers = useMemo(() => {
    if (rows.length === 0) return [];
    return Object.keys(rows[0]);
  }, [rows]);

  if (rows.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Eye className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">Parsed CSV Data Preview</h2>
        </div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
          Total: {rows.length} rows parsed (scroll to view all)
        </div>
      </div>

      {/* Main Table Container with Sticky Headers & Scrollbars */}
      <div className="w-full overflow-x-auto rounded-xl border border-border bg-card/20 backdrop-blur-md">
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-zinc-100/90 dark:bg-zinc-900/90 backdrop-blur-md z-10 border-b border-border">
              <tr>
                {headers.map((header) => (
                  <th
                     key={header}
                     className="px-4 py-3 text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, idx) => (
                <tr
                   key={idx}
                   className="hover:bg-zinc-100/50 dark:hover:bg-zinc-800/20 transition-colors"
                >
                  {headers.map((header) => (
                    <td
                       key={header}
                       className="px-4 py-2.5 text-xs text-zinc-700 dark:text-zinc-300 max-w-xs truncate"
                       title={row[header]}
                    >
                      {row[header] || <span className="text-zinc-400 dark:text-zinc-600 font-mono">-</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
