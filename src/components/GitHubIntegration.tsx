'use client';

import React, { useState, useEffect } from 'react';
import {
  Github, Folder, File, Search, RefreshCw, Check, X,
  ChevronRight, Loader2, AlertCircle, GitBranch, Link as LinkIcon,
  Plus, Code
} from 'lucide-react';

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  default_branch: string;
  private: boolean;
  language: string | null;
  owner: {
    login: string;
    avatar_url: string;
  };
}

interface GitHubFile {
  path: string;
  type: 'file' | 'dir';
  size?: number;
}

interface GitHubConnection {
  connected: boolean;
  username?: string;
  avatar_url?: string;
  repos?: GitHubRepo[];
}

export default function GitHubIntegration({ onClose }: { onClose: () => void }) {
  const [connection, setConnection] = useState<GitHubConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Repo browser state
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [currentPath, setCurrentPath] = useState('');
  const [fileTree, setFileTree] = useState<GitHubFile[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Rate limit info
  const [rateLimit, setRateLimit] = useState<{ remaining: number; limit: number } | null>(null);

  // Create project modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState<'config' | 'files' | 'review'>('config');
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDesc, setNewRepoDesc] = useState('');
  const [newRepoPrivate, setNewRepoPrivate] = useState(true);
  const [newRepoFiles, setNewRepoFiles] = useState<{path: string; content: string}[]>([]);
  const [newFilePath, setNewFilePath] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState<{success: boolean; repo?: any; message?: string} | null>(null);

  useEffect(() => {
    fetchConnection();
  }, []);

  const fetchConnection = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/github/repos');
      const data = await res.json();

      if (res.ok) {
        setConnection({
          connected: data.connected,
          username: data.repos?.[0]?.owner?.login,
          avatar_url: data.repos?.[0]?.owner?.avatar_url,
          repos: data.repos,
        });
      } else {
        setConnection({ connected: false });
      }
    } catch (err) {
      setError('Failed to fetch GitHub connection');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setProcessing('connect');
    try {
      // Redirect to GitHub OAuth
      window.location.href = '/api/github/callback?action=authorize';
    } catch (err) {
      setError('Failed to initiate GitHub connection');
      setProcessing(null);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect GitHub? Your cached repos will be removed.')) return;

    setProcessing('disconnect');
    try {
      // Get connection ID first
      const { data: connections } = await fetch('/api/github/repos').then(r => r.json());
      if (!connections?.connected) {
        setConnection({ connected: false });
        return;
      }

      // Find connection ID from repos
      const connectionId = connection?.repos?.[0] ? 'existing' : ''; // Simplified for demo

      const res = await fetch(`/api/github/repos?connection_id=${connectionId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setConnection({ connected: false });
        setSelectedRepo(null);
        setFileTree([]);
      }
    } catch (err) {
      setError('Failed to disconnect GitHub');
    } finally {
      setProcessing(null);
    }
  };

  const fetchFileTree = async (repo: GitHubRepo, path: string = '') => {
    setProcessing(`files-${repo.full_name}`);
    try {
      const params = new URLSearchParams({
        repo: repo.full_name,
        branch: repo.default_branch,
      });
      if (path) params.append('path', path);

      const res = await fetch(`/api/github/files?${params}`);
      const data = await res.json();

      if (res.ok) {
        setFileTree(data.items || []);
      }
    } catch (err) {
      setError('Failed to load file tree');
    } finally {
      setProcessing(null);
    }
  };

  const handleSelectRepo = async (repo: GitHubRepo) => {
    setSelectedRepo(repo);
    setCurrentPath('');
    setExpandedDirs(new Set());
    await fetchFileTree(repo);
  };

  const handleNavigate = async (repo: GitHubRepo, path: string) => {
    await fetchFileTree(repo, path);
    setCurrentPath(path);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !selectedRepo) return;

    setIsSearching(true);
    try {
      const params = new URLSearchParams({
        repo: selectedRepo.full_name,
        q: searchQuery,
      });

      const res = await fetch(`/api/github/files?${params}`);
      const data = await res.json();

      if (res.ok) {
        setSearchResults(data.results || []);
      }
    } catch (err) {
      setError('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleReadFile = async (filePath: string) => {
    if (!selectedRepo) return;

    setProcessing(`read-${filePath}`);
    try {
      const res = await fetch('/api/github/files/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: selectedRepo.full_name,
          path: filePath,
          branch: selectedRepo.default_branch,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Open file in modal or new window
        window.open(
          `data:text/plain;charset=utf-8,${encodeURIComponent(data.content)}`,
          '_blank'
        );
      }
    } catch (err) {
      setError('Failed to read file');
    } finally {
      setProcessing(null);
    }
  };

  // Create project handlers
  const handleCreateProject = async () => {
    if (!newRepoName.trim()) {
      setError('Repository name is required');
      return;
    }

    if (newRepoFiles.length === 0) {
      setError('Please add at least one file');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/github/repos/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRepoName,
          description: newRepoDesc,
          isPrivate: newRepoPrivate,
          files: newRepoFiles,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setCreateResult({
          success: true,
          repo: data.repo,
          message: data.message,
        });
        setCreateStep('review');
        // Refresh repos list
        fetchConnection();
      } else {
        setError(data.error || 'Failed to create project');
      }
    } catch (err) {
      setError('Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const addFileToProject = () => {
    if (!newFilePath.trim() || !newFileContent.trim()) return;
    setNewRepoFiles([...newRepoFiles, { path: newFilePath, content: newFileContent }]);
    setNewFilePath('');
    setNewFileContent('');
  };

  const removeFileFromProject = (index: number) => {
    setNewRepoFiles(newRepoFiles.filter((_, i) => i !== index));
  };

  const resetCreateModal = () => {
    setShowCreateModal(false);
    setCreateStep('config');
    setNewRepoName('');
    setNewRepoDesc('');
    setNewRepoPrivate(true);
    setNewRepoFiles([]);
    setNewFilePath('');
    setNewFileContent('');
    setCreateResult(null);
    setError(null);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-nexus-card border border-nexus-border rounded-xl p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-nexus-text">Loading GitHub integration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-nexus-card border border-nexus-border rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden animate-slide-in-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-nexus-border">
          <div className="flex items-center gap-3">
            <Github className="w-6 h-6" />
            <h2 className="text-xl font-bold">GitHub Integration</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-nexus-hover rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {!connection?.connected ? (
            // Not connected state
            <div className="text-center py-12">
              <Github className="w-16 h-16 mx-auto mb-4 text-nexus-muted opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Connect Your GitHub</h3>
              <p className="text-nexus-muted mb-6 max-w-md mx-auto">
                Link your GitHub account to browse repositories, read code files,
                and get AI assistance with your codebase.
              </p>
              <button
                onClick={handleConnect}
                disabled={processing === 'connect'}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#24292e] text-white rounded-lg font-medium hover:bg-[#2f363d] transition-colors disabled:opacity-50"
              >
                {processing === 'connect' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <LinkIcon className="w-5 h-5" />
                )}
                Connect GitHub Account
              </button>

              <div className="mt-8 grid grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
                <div className="p-4 bg-nexus-hover rounded-lg">
                  <Folder className="w-8 h-8 text-blue-400 mb-2" />
                  <h4 className="font-medium mb-1">Browse Repos</h4>
                  <p className="text-sm text-nexus-muted">Explore your repositories with full file navigation</p>
                </div>
                <div className="p-4 bg-nexus-hover rounded-lg">
                  <Search className="w-8 h-8 text-green-400 mb-2" />
                  <h4 className="font-medium mb-1">Search Code</h4>
                  <p className="text-sm text-nexus-muted">Find code patterns across all your repos</p>
                </div>
                <div className="p-4 bg-nexus-hover rounded-lg">
                  <File className="w-8 h-8 text-purple-400 mb-2" />
                  <h4 className="font-medium mb-1">AI Context</h4>
                  <p className="text-sm text-nexus-muted">Get AI help with your actual codebase</p>
                </div>
              </div>
            </div>
          ) : (
            // Connected state
            <div className="grid grid-cols-3 gap-6">
              {/* Repositories List */}
              <div className="col-span-1">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Folder className="w-5 h-5" />
                    Repositories
                  </h3>
                  <button
                    onClick={fetchConnection}
                    className="p-1 hover:bg-nexus-hover rounded"
                    title="Refresh"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {connection.repos?.map((repo) => (
                    <button
                      key={repo.id}
                      onClick={() => handleSelectRepo(repo)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedRepo?.id === repo.id
                          ? 'bg-primary-600/20 border border-primary-500/30'
                          : 'bg-nexus-hover hover:bg-nexus-hover/80'
                      }`}
                    >
                      <div className="font-medium truncate">{repo.name}</div>
                      <div className="text-xs text-nexus-muted flex items-center gap-2">
                        {repo.private && <span className="text-yellow-400">Private</span>}
                        {repo.language && <span>{repo.language}</span>}
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowCreateModal(true)}
                  className="w-full mt-4 p-2 flex items-center justify-center gap-2 bg-primary-600/20 text-primary-400 hover:bg-primary-600/30 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create New Project
                </button>

                <button
                  onClick={handleDisconnect}
                  disabled={processing === 'disconnect'}
                  className="w-full mt-4 p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  {processing === 'disconnect' ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    'Disconnect GitHub'
                  )}
                </button>
              </div>

              {/* File Browser / Search */}
              <div className="col-span-2">
                {selectedRepo ? (
                  <>
                    {/* Repo Info */}
                    <div className="flex items-center gap-2 mb-4 text-sm">
                      <Github className="w-4 h-4" />
                      <span className="font-medium">{selectedRepo.full_name}</span>
                      <GitBranch className="w-4 h-4 ml-2 text-nexus-muted" />
                      <span className="text-nexus-muted">{selectedRepo.default_branch}</span>
                    </div>

                    {/* Search */}
                    <div className="flex gap-2 mb-4">
                      <div className="flex-1 relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-nexus-muted" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                          placeholder="Search code in this repo..."
                          className="w-full pl-10 pr-4 py-2 bg-nexus-hover border border-nexus-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <button
                        onClick={handleSearch}
                        disabled={isSearching}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                      >
                        {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                      </button>
                    </div>

                    {/* Breadcrumb */}
                    {currentPath && (
                      <div className="flex items-center gap-1 text-sm mb-4">
                        <button
                          onClick={() => handleNavigate(selectedRepo, '')}
                          className="text-nexus-muted hover:text-nexus-text"
                        >
                          root
                        </button>
                        {currentPath.split('/').map((part, i, arr) => (
                          <React.Fragment key={i}>
                            <ChevronRight className="w-4 h-4 text-nexus-muted" />
                            <button
                              onClick={() => {
                                const path = arr.slice(0, i + 1).join('/');
                                handleNavigate(selectedRepo, path);
                              }}
                              className="hover:text-nexus-text"
                            >
                              {part}
                            </button>
                          </React.Fragment>
                        ))}
                      </div>
                    )}

                    {/* File Tree */}
                    <div className="bg-nexus-hover/50 rounded-lg p-4 max-h-[400px] overflow-y-auto">
                      {processing?.startsWith('files') ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                        </div>
                      ) : searchResults.length > 0 ? (
                        <div className="space-y-2">
                          <div className="text-sm text-nexus-muted mb-2">
                            Search results ({searchResults.length})
                          </div>
                          {searchResults.map((result, i) => (
                            <button
                              key={i}
                              onClick={() => handleReadFile(result.path)}
                              className="w-full text-left p-2 hover:bg-nexus-card rounded flex items-center gap-2"
                            >
                              <File className="w-4 h-4 text-nexus-muted" />
                              <span className="text-sm">{result.path}</span>
                            </button>
                          ))}
                        </div>
                      ) : fileTree.length > 0 ? (
                        <div className="space-y-1">
                          {fileTree.map((file) => (
                            <button
                              key={file.path}
                              onClick={() => {
                                if (file.type === 'dir') {
                                  handleNavigate(selectedRepo, file.path);
                                } else {
                                  handleReadFile(file.path);
                                }
                              }}
                              className="w-full text-left p-2 hover:bg-nexus-card rounded flex items-center gap-2"
                            >
                              {file.type === 'dir' ? (
                                <Folder className="w-4 h-4 text-blue-400" />
                              ) : (
                                <File className="w-4 h-4 text-nexus-muted" />
                              )}
                              <span className="text-sm">{file.path.split('/').pop()}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-nexus-muted">
                          No files found
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-nexus-muted">
                    <Github className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a repository to browse</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create New Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-nexus-card border border-nexus-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-nexus-border">
              <div className="flex items-center gap-3">
                <Code className="w-5 h-5 text-primary-400" />
                <h3 className="text-lg font-bold">Create New Project</h3>
              </div>
              <button onClick={resetCreateModal} className="p-2 hover:bg-nexus-hover rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {createStep === 'config' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Repository Name *</label>
                    <input
                      type="text"
                      value={newRepoName}
                      onChange={(e) => setNewRepoName(e.target.value)}
                      placeholder="my-awesome-project"
                      className="w-full px-4 py-2 bg-nexus-hover border border-nexus-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <p className="text-xs text-nexus-muted mt-1">
                      Only alphanumeric characters, hyphens, underscores, and periods
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <input
                      type="text"
                      value={newRepoDesc}
                      onChange={(e) => setNewRepoDesc(e.target.value)}
                      placeholder="A short description of your project"
                      className="w-full px-4 py-2 bg-nexus-hover border border-nexus-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="isPrivate"
                      checked={newRepoPrivate}
                      onChange={(e) => setNewRepoPrivate(e.target.checked)}
                      className="w-4 h-4 rounded border-nexus-border"
                    />
                    <label htmlFor="isPrivate" className="text-sm">
                      Make repository private
                    </label>
                  </div>

                  <button
                    onClick={() => setCreateStep('files')}
                    disabled={!newRepoName.trim()}
                    className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue to Files
                  </button>
                </div>
              )}

              {createStep === 'files' && (
                <div className="space-y-4">
                  <div className="bg-nexus-hover rounded-lg p-4">
                    <h4 className="font-medium mb-3">Add Files to Your Project</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-nexus-muted mb-1">File Path</label>
                        <input
                          type="text"
                          value={newFilePath}
                          onChange={(e) => setNewFilePath(e.target.value)}
                          placeholder="src/index.js"
                          className="w-full px-3 py-2 bg-nexus-card border border-nexus-border rounded-lg text-sm"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs text-nexus-muted mb-1">File Content</label>
                        <textarea
                          value={newFileContent}
                          onChange={(e) => setNewFileContent(e.target.value)}
                          placeholder="// Your code here..."
                          rows={6}
                          className="w-full px-3 py-2 bg-nexus-card border border-nexus-border rounded-lg text-sm font-mono"
                        />
                      </div>
                      
                      <button
                        onClick={addFileToProject}
                        disabled={!newFilePath.trim() || !newFileContent.trim()}
                        className="px-4 py-2 bg-nexus-hover border border-nexus-border rounded-lg text-sm hover:bg-nexus-card disabled:opacity-50"
                      >
                        Add File
                      </button>
                    </div>
                  </div>

                  {newRepoFiles.length > 0 && (
                    <div className="bg-nexus-hover/50 rounded-lg p-4">
                      <h4 className="text-sm font-medium mb-2">
                        Files to Create ({newRepoFiles.length})
                      </h4>
                      <div className="space-y-1">
                        {newRepoFiles.map((file, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-2 bg-nexus-card rounded"
                          >
                            <span className="text-sm font-mono">{file.path}</span>
                            <button
                              onClick={() => removeFileFromProject(i)}
                              className="p-1 hover:bg-red-500/20 rounded text-red-400"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setCreateStep('config')}
                      className="flex-1 py-3 bg-nexus-hover border border-nexus-border rounded-lg font-medium hover:bg-nexus-card"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setCreateStep('review')}
                      disabled={newRepoFiles.length === 0}
                      className="flex-1 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
                    >
                      Review Project
                    </button>
                  </div>
                </div>
              )}

              {createStep === 'review' && (
                <div className="space-y-4">
                  {!createResult ? (
                    <>
                      <div className="bg-nexus-hover rounded-lg p-4">
                        <h4 className="font-medium mb-2">Review Your Project</h4>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-nexus-muted">Name:</span>
                            <span className="font-mono">{newRepoName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-nexus-muted">Visibility:</span>
                            <span>{newRepoPrivate ? 'Private' : 'Public'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-nexus-muted">Files:</span>
                            <span>{newRepoFiles.length}</span>
                          </div>
                          {newRepoDesc && (
                            <div>
                              <span className="text-nexus-muted">Description:</span>
                              <p className="mt-1">{newRepoDesc}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-nexus-hover/50 rounded-lg p-4 max-h-48 overflow-y-auto">
                        <h4 className="text-sm font-medium mb-2">Files to Create</h4>
                        <div className="space-y-2">
                          {newRepoFiles.map((file, i) => (
                            <div key={i} className="text-sm font-mono p-2 bg-nexus-card rounded">
                              {file.path}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => setCreateStep('files')}
                          className="flex-1 py-3 bg-nexus-hover border border-nexus-border rounded-lg font-medium hover:bg-nexus-card"
                        >
                          Back to Files
                        </button>
                        <button
                          onClick={handleCreateProject}
                          disabled={creating}
                          className="flex-1 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {creating ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            <>
                              <Code className="w-5 h-5" />
                              Create Project
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      {createResult.success ? (
                        <>
                          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check className="w-8 h-8 text-green-400" />
                          </div>
                          <h3 className="text-xl font-bold mb-2">Project Created!</h3>
                          <p className="text-nexus-muted mb-4">{createResult.message}</p>
                          
                          <a
                            href={createResult.repo?.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-[#24292e] text-white rounded-lg font-medium hover:bg-[#2f363d]"
                          >
                            <Github className="w-5 h-5" />
                            View on GitHub
                          </a>
                          
                          <button
                            onClick={() => {
                              resetCreateModal();
                              // Select the newly created repo
                              if (connection?.repos) {
                                const newRepo = connection.repos.find(
                                  r => r.full_name === createResult.repo?.full_name
                                );
                                if (newRepo) handleSelectRepo(newRepo);
                              }
                            }}
                            className="block w-full mt-4 p-3 bg-primary-600/20 text-primary-400 rounded-lg"
                          >
                            Browse New Project
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <X className="w-8 h-8 text-red-400" />
                          </div>
                          <h3 className="text-xl font-bold mb-2">Creation Failed</h3>
                          <p className="text-nexus-muted mb-4">{createResult.message || 'Unknown error'}</p>
                          <button
                            onClick={() => {
                              setCreateResult(null);
                              setCreateStep('config');
                            }}
                            className="px-6 py-3 bg-nexus-hover border border-nexus-border rounded-lg font-medium"
                          >
                            Try Again
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
