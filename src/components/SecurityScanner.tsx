'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Shield, Scan, AlertTriangle, CheckCircle, XCircle, Clock,
  ChevronRight, FileCode, Zap, Target, Eye, Cpu, Lock,
  TrendingUp, Activity, Wifi, WifiOff, RefreshCw, Download
} from 'lucide-react';
import { SecurityVulnerability, SecurityScanResult, CodeFile } from '@/lib/types';
import { DEMO_SECURITY_VULNERABILITIES, DEMO_SECURITY_SCAN, DEMO_CODE_FILES } from '@/lib/demo-data';

interface SecurityScannerProps {
  onClose: () => void;
}

// Severity colors
const SEVERITY_COLORS = {
  critical: { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-400', glow: 'shadow-red-500/50' },
  high: { bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-400', glow: 'shadow-orange-500/50' },
  medium: { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400', glow: 'shadow-yellow-500/50' },
  low: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400', glow: 'shadow-blue-500/50' },
  info: { bg: 'bg-gray-500/20', border: 'border-gray-500', text: 'text-gray-400', glow: 'shadow-gray-500/50' },
};

// Animated scanning line
function ScanningLine({ progress }: { progress: number }) {
  return (
    <div className="relative h-0.5 bg-nexus-border rounded-full overflow-hidden">
      <div
        className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-70"
        style={{
          transform: `translateX(${progress * 100 - 100}%)`,
          width: '50%',
          animation: 'scan-move 2s ease-in-out infinite',
        }}
      />
    </div>
  );
}

// Hex grid animation
function HexGrid({ active }: { active: boolean }) {
  const gridRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={gridRef} className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className={`absolute w-8 h-8 border border-cyan-500/20 transform rotate-45 transition-all duration-1000 ${
            active ? 'opacity-100 scale-110' : 'opacity-30 scale-100'
          }`}
          style={{
            left: `${(i * 13) % 100}%`,
            top: `${(i * 17) % 100}%`,
            animationDelay: `${i * 0.1}s`,
          }}
        >
          <div className={`w-2 h-2 bg-cyan-500/40 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${active ? 'animate-pulse' : ''}`} />
        </div>
      ))}
    </div>
  );
}

// Vulnerability card
function VulnerabilityCard({ vulnerability, onClick, isExpanded }: {
  vulnerability: SecurityVulnerability;
  onClick: () => void;
  isExpanded: boolean;
}) {
  const colors = SEVERITY_COLORS[vulnerability.severity];

  return (
    <div
      onClick={onClick}
      className={`${colors.bg} ${colors.border} border rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] ${colors.glow} shadow-lg`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`${colors.text} flex-shrink-0 mt-0.5`}>
            {vulnerability.severity === 'critical' || vulnerability.severity === 'high' ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full uppercase font-bold ${colors.bg} ${colors.text}`}>
                {vulnerability.severity}
              </span>
              <span className="text-xs text-nexus-muted">{vulnerability.category}</span>
            </div>
            <h4 className="font-medium text-sm">{vulnerability.title}</h4>
            <p className="text-xs text-nexus-muted mt-1">{vulnerability.file}:{vulnerability.line}</p>
          </div>
          <ChevronRight className={`w-5 h-5 text-nexus-muted transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
      </div>
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 animate-fade-in">
          <div>
            <h5 className="text-xs font-medium text-nexus-muted uppercase mb-1">Description</h5>
            <p className="text-sm">{vulnerability.description}</p>
          </div>
          <div>
            <h5 className="text-xs font-medium text-nexus-muted uppercase mb-1">Vulnerable Code</h5>
            <pre className="bg-nexus-darker p-3 rounded-lg text-xs overflow-x-auto border border-nexus-border">
              <code className="text-red-400">{vulnerability.codeSnippet}</code>
            </pre>
          </div>
          <div>
            <h5 className="text-xs font-medium text-nexus-muted uppercase mb-1">Recommended Fix</h5>
            <pre className="bg-nexus-darker p-3 rounded-lg text-xs overflow-x-auto border border-nexus-border">
              <code className="text-green-400">{vulnerability.fix}</code>
            </pre>
          </div>
          {vulnerability.cwe && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-nexus-muted">CWE:</span>
              <span className="text-cyan-400 font-mono">{vulnerability.cwe}</span>
              {vulnerability.owasp && (
                <>
                  <span className="text-nexus-muted">OWASP:</span>
                  <span className="text-cyan-400 font-mono">{vulnerability.owasp}</span>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Main Security Scanner Component
export default function SecurityScanner({ onClose }: SecurityScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [scanResults, setScanResults] = useState<SecurityScanResult | null>(null);
  const [selectedVuln, setSelectedVuln] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scan' | 'results'>('scan');

  const startScan = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setActiveTab('scan');
    setScanResults(null);

    const files = DEMO_CODE_FILES;
    const totalFiles = files.length;
    const totalLines = files.reduce((acc, f) => acc + f.lines, 0);

    // Simulate scanning process
    for (let i = 0; i < files.length; i++) {
      setCurrentFile(files[i].name);
      setScanProgress(((i + 1) / totalFiles) * 100);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Complete scan
    setScanResults({
      ...DEMO_SECURITY_SCAN,
      timestamp: Date.now(),
      filesScanned: 247,
      linesScanned: 12847,
      vulnerabilities: DEMO_SECURITY_VULNERABILITIES,
    });
    setIsScanning(false);
    setActiveTab('results');
  };

  const vulnerabilities = scanResults?.vulnerabilities || [];
  const criticalCount = vulnerabilities.filter(v => v.severity === 'critical').length;
  const highCount = vulnerabilities.filter(v => v.severity === 'high').length;
  const mediumCount = vulnerabilities.filter(v => v.severity === 'medium').length;
  const lowCount = vulnerabilities.filter(v => v.severity === 'low').length;

  return (
    <div className="h-full flex flex-col bg-nexus-darker animate-fade-in">
      {/* Header */}
      <div className="h-14 bg-nexus-card border-b border-nexus-border flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-orange-600 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Security Scanner</h2>
            <p className="text-xs text-nexus-muted">Line-by-line vulnerability analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isScanning ? (
            <div className="flex items-center gap-2 text-cyan-400">
              <Activity className="w-4 h-4 animate-pulse" />
              <span className="text-sm">Scanning...</span>
            </div>
          ) : scanResults ? (
            <button
              onClick={startScan}
              className="flex items-center gap-2 px-3 py-1.5 bg-nexus-hover hover:bg-nexus-border rounded-lg text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Rescan
            </button>
          ) : null}
          <button
            onClick={onClose}
            className="p-2 hover:bg-nexus-hover rounded-lg transition-colors"
          >
            <XCircle className="w-5 h-5 text-nexus-muted" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Main scanning area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {isScanning ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
              {/* Animated background */}
              <HexGrid active={true} />
              
              {/* Scanning animation */}
              <div className="relative z-10 text-center">
                <div className="relative mb-8">
                  <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 border border-cyan-500/50 flex items-center justify-center animate-pulse">
                      <Scan className="w-12 h-12 text-cyan-400 animate-spin" />
                    </div>
                  </div>
                  {/* Scanning rings */}
                  <div className="absolute inset-0 rounded-full border-2 border-cyan-500/30 animate-ping" />
                  <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 animate-pulse" style={{ animationDelay: '0.5s' }} />
                </div>

                <h3 className="text-xl font-bold mb-2">Analyzing Codebase</h3>
                <p className="text-nexus-muted mb-4">{currentFile}</p>
                
                <div className="w-64 mx-auto mb-4">
                  <ScanningLine progress={scanProgress / 100} />
                </div>
                
                <div className="flex items-center justify-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span>{Math.round(scanProgress)}% Complete</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-nexus-muted" />
                    <span className="text-nexus-muted">{currentFile}</span>
                  </div>
                </div>

                {/* Scanning stats */}
                <div className="flex items-center justify-center gap-8 mt-8">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-400">{Math.round(scanProgress * 2.47)}</div>
                    <div className="text-xs text-nexus-muted">Files Scanned</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-400">{Math.round(scanProgress * 128.47)}</div>
                    <div className="text-xs text-nexus-muted">Lines Analyzed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-400 animate-pulse">●</div>
                    <div className="text-xs text-nexus-muted">Scanning</div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'results' && scanResults ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Results summary */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-red-400">{criticalCount}</div>
                  <div className="text-xs text-nexus-muted mt-1">Critical</div>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-orange-400">{highCount}</div>
                  <div className="text-xs text-nexus-muted mt-1">High</div>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-yellow-400">{mediumCount}</div>
                  <div className="text-xs text-nexus-muted mt-1">Medium</div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-blue-400">{lowCount}</div>
                  <div className="text-xs text-nexus-muted mt-1">Low</div>
                </div>
              </div>

              {/* Security score */}
              <div className="bg-gradient-to-r from-nexus-card to-nexus-hover border border-nexus-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold">Security Score</h3>
                      <p className="text-xs text-nexus-muted">Based on {vulnerabilities.length} findings</p>
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-red-400">{scanResults.score}</div>
                </div>
                <div className="h-3 bg-nexus-darker rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full transition-all duration-1000"
                    style={{ width: `${scanResults.score}%` }}
                  />
                </div>
              </div>

              {/* Vulnerability list */}
              <div className="space-y-3">
                <h3 className="font-medium text-sm text-nexus-muted uppercase">Vulnerabilities Found</h3>
                {vulnerabilities.map(vuln => (
                  <VulnerabilityCard
                    key={vuln.id}
                    vulnerability={vuln}
                    onClick={() => setSelectedVuln(selectedVuln === vuln.id ? null : vuln.id)}
                    isExpanded={selectedVuln === vuln.id}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="w-24 h-24 bg-gradient-to-br from-nexus-card to-nexus-hover border border-nexus-border rounded-2xl flex items-center justify-center mb-6">
                <Shield className="w-12 h-12 text-red-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Security Scanner</h3>
              <p className="text-nexus-muted text-center max-w-md mb-6">
                Perform a comprehensive line-by-line security analysis of your codebase. 
                Detect SQL injection, XSS, authentication flaws, and more.
              </p>
              <button
                onClick={startScan}
                className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
              >
                <Scan className="w-5 h-5" />
                Start Security Scan
              </button>
              <div className="flex items-center gap-6 mt-8 text-sm text-nexus-muted">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  <span>OWASP Top 10</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  <span>CWE Coverage</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  <span>Real-time</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        {scanResults && (
          <div className="w-80 bg-nexus-card border-l border-nexus-border overflow-y-auto">
            <div className="p-4 border-b border-nexus-border">
              <h3 className="font-medium">Scan Details</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-nexus-muted">Files Scanned</span>
                  <span className="font-mono">{scanResults.filesScanned}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-nexus-muted">Lines Analyzed</span>
                  <span className="font-mono">{scanResults.linesScanned.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-nexus-muted">Duration</span>
                  <span className="font-mono">{(scanResults.duration / 1000).toFixed(1)}s</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-nexus-muted">Vulnerabilities</span>
                  <span className="font-mono text-red-400">{vulnerabilities.length}</span>
                </div>
              </div>
              <div className="pt-4 border-t border-nexus-border">
                <h4 className="text-sm font-medium mb-2">Categories</h4>
                <div className="space-y-2">
                  {['SQL Injection', 'Broken Authentication', 'XSS', 'Sensitive Data', 'File Upload'].map(cat => {
                    const count = vulnerabilities.filter(v => v.category.includes(cat) || (cat === 'SQL Injection' && v.category === 'SQL Injection')).length;
                    return count > 0 ? (
                      <div key={cat} className="flex items-center justify-between text-sm">
                        <span className="text-nexus-muted">{cat}</span>
                        <span className="font-mono">{count}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
              <div className="pt-4 border-t border-nexus-border">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-nexus-hover hover:bg-nexus-border rounded-lg text-sm transition-colors">
                  <Download className="w-4 h-4" />
                  Export Report
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
