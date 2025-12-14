/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';

interface DebugLog {
  message: string;
  data?: any;
  timestamp: string;
}

export default function DebugLogsPage() {
  const [logs, setLogs] = useState<DebugLog[]>([]);

  useEffect(() => {
    const storedLogs = localStorage.getItem('debugLogs');
    if (storedLogs) {
      try {
        setLogs(JSON.parse(storedLogs));
      } catch {
        setLogs([]);
      }
    }
  }, []);

  const downloadLogs = () => {
    const blob = new Blob(
      [JSON.stringify(logs, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `debug_logs_${new Date().toISOString()}.json`;
    a.click();

    URL.revokeObjectURL(url);
  };

  const clearLogs = () => {
    localStorage.removeItem('debugLogs');
    setLogs([]);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Debug Logs</h1>

        <div className="flex gap-3">
          <button
            onClick={downloadLogs}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            Download Logs
          </button>

          <button
            onClick={clearLogs}
            className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
          >
            Clear Logs
          </button>
        </div>
      </header>

      {logs.length === 0 ? (
        <p className="text-gray-500">No logs found.</p>
      ) : (
        <div className="space-y-4">
          {logs.map((log, index) => (
            <div
              key={index}
              className="border rounded-md p-4 bg-gray-50"
            >
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>#{index + 1}</span>
                <span>{new Date(log.timestamp).toLocaleString()}</span>
              </div>

              <p className="font-medium mb-2">{log.message}</p>

              {log.data && (
                <pre className="text-xs bg-white border rounded p-2 overflow-auto">
                  {JSON.stringify(log.data, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
