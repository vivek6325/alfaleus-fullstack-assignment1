import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Github, ChevronLeft, ChevronRight, AlertCircle, CheckCircle, Loader2, Sparkles } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function GitHubImporterModal({ isOpen, onClose, boardId, onImportSuccess }) {
  const [repoUrl, setRepoUrl] = useState('');
  const [issues, setIssues] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Reset modal state when opened/closed
  useEffect(() => {
    if (!isOpen) {
      setIssues([]);
      setPage(1);
      setHasMore(false);
      setSelectedIds(new Set());
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Fetch issues
  const fetchIssues = async (targetPage = 1) => {
    if (!repoUrl.trim()) {
      setError('Please enter a GitHub repository URL or owner/repo path');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await axios.get(
        `${BACKEND_URL}/boards/${boardId}/github/fetch-issues`,
        { params: { repoUrl, page: targetPage } }
      );
      setIssues(response.data.issues);
      setPage(response.data.page);
      setHasMore(response.data.hasMore);
      setSelectedIds(new Set()); // reset selection on page change
    } catch (err) {
      console.error('Error fetching issues:', err);
      setError(err.response?.data?.message || 'Failed to fetch issues. Verify the repository is public.');
      setIssues([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle selection for a single issue
  const toggleSelect = (issueId) => {
    const updated = new Set(selectedIds);
    if (updated.has(issueId)) {
      updated.delete(issueId);
    } else {
      updated.add(issueId);
    }
    setSelectedIds(updated);
  };

  // Toggle select all un-imported issues on the current page
  const toggleSelectAll = () => {
    const importableIssues = issues.filter(i => !i.alreadyImported);
    const allSelected = importableIssues.every(i => selectedIds.has(i.githubIssueId));

    const updated = new Set(selectedIds);
    if (allSelected) {
      importableIssues.forEach(i => updated.delete(i.githubIssueId));
    } else {
      importableIssues.forEach(i => updated.add(i.githubIssueId));
    }
    setSelectedIds(updated);
  };

  // Handle Import
  const handleImport = async () => {
    if (selectedIds.size === 0) return;
    setIsImporting(true);
    setError(null);
    setSuccessMessage(null);

    const issuesToImport = issues.filter(i => selectedIds.has(i.githubIssueId));

    try {
      const response = await axios.post(
        `${BACKEND_URL}/boards/${boardId}/github/import-issues`,
        { issues: issuesToImport }
      );
      setSuccessMessage(response.data.message);
      setSelectedIds(new Set());
      
      // Silent refresh of list in preview modal to mark them as alreadyImported
      const updatedIssues = issues.map(i => 
        selectedIds.has(i.githubIssueId) ? { ...i, alreadyImported: true } : i
      );
      setIssues(updatedIssues);

      // Trigger board update in parent
      if (onImportSuccess) {
        onImportSuccess();
      }
    } catch (err) {
      console.error('Error importing issues:', err);
      setError(err.response?.data?.message || 'Import failed. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const importableIssues = issues.filter(i => !i.alreadyImported);
  const isAllSelected = importableIssues.length > 0 && importableIssues.every(i => selectedIds.has(i.githubIssueId));

  return (
    <div className="modal-backdrop-custom d-flex align-items-center justify-content-center">
      <div className="modal-content-glass p-4 rounded-4 position-relative border border-secondary border-opacity-25" style={{ width: '750px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Close Button */}
        <button className="btn-close-custom position-absolute top-3 right-3 text-secondary hover-text-white bg-transparent border-0" onClick={onClose}>
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom border-secondary border-opacity-10">
          <Github className="text-white" size={24} />
          <h4 className="text-white fw-bold mb-0">Import GitHub Issues</h4>
        </div>

        {/* Search form */}
        <div className="d-flex gap-2 mb-3">
          <div className="flex-grow-1 position-relative">
            <input 
              type="text" 
              className="form-control bg-dark bg-opacity-50 text-white border-secondary border-opacity-25 ps-3" 
              placeholder="e.g. facebook/react or https://github.com/facebook/react" 
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchIssues(1)}
              style={{ borderRadius: '8px' }}
            />
          </div>
          <button 
            className="btn btn-info px-4 fw-bold" 
            disabled={isLoading || isImporting}
            onClick={() => fetchIssues(1)}
            style={{ borderRadius: '8px', background: 'linear-gradient(90deg, var(--neon-cyan) 0%, var(--neon-purple) 100%)', border: 'none', color: 'var(--bg-dark)' }}
          >
            {isLoading ? <Loader2 className="animate-spin" size={16} /> : 'Fetch Issues'}
          </button>
        </div>

        {/* Error/Success Feedbacks */}
        {error && (
          <div className="alert alert-danger bg-danger bg-opacity-10 border-danger border-opacity-20 text-danger p-2.5 rounded-3 small d-flex align-items-center gap-2 mb-3">
            <AlertCircle size={16} />
            <div className="font-monospace small">{error}</div>
          </div>
        )}

        {successMessage && (
          <div className="alert alert-success bg-success bg-opacity-10 border-success border-opacity-20 text-success p-2.5 rounded-3 small d-flex align-items-center gap-2 mb-3">
            <CheckCircle size={16} />
            <div className="font-monospace small">{successMessage}</div>
          </div>
        )}

        {/* Preview List container */}
        <div className="flex-grow-1 overflow-y-auto mb-3" style={{ minHeight: '200px' }}>
          {issues.length > 0 ? (
            <div className="d-flex flex-column gap-2">
              {/* Select All Row */}
              {importableIssues.length > 0 && (
                <div className="d-flex align-items-center gap-3 p-2 bg-dark bg-opacity-20 rounded border border-secondary border-opacity-10">
                  <input 
                    type="checkbox" 
                    className="form-check-input bg-transparent border-secondary"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    id="select-all-checkbox"
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="select-all-checkbox" className="text-secondary small mb-0 fw-semibold cursor-pointer">
                    Select All Open Issues ({importableIssues.length})
                  </label>
                </div>
              )}

              {/* Individual Issues */}
              {issues.map((issue) => (
                <div 
                  key={issue.githubIssueId} 
                  className={`d-flex gap-3 p-3 rounded border text-start align-items-start transition-all ${
                    issue.alreadyImported 
                      ? 'bg-dark bg-opacity-10 border-secondary border-opacity-5 opacity-60' 
                      : 'bg-dark bg-opacity-40 border-secondary border-opacity-15 hover-border-glass'
                  }`}
                >
                  <input 
                    type="checkbox" 
                    className="form-check-input bg-transparent border-secondary mt-1" 
                    checked={selectedIds.has(issue.githubIssueId)}
                    disabled={issue.alreadyImported}
                    onChange={() => toggleSelect(issue.githubIssueId)}
                    style={{ width: '16px', height: '16px', cursor: issue.alreadyImported ? 'not-allowed' : 'pointer' }}
                  />
                  <div className="flex-grow-1 min-w-0">
                    <div className="d-flex align-items-start justify-content-between gap-2 mb-1">
                      <span className="text-white small fw-bold font-monospace text-truncate">
                        #{issue.number} {issue.title}
                      </span>
                      {issue.alreadyImported ? (
                        <span className="badge bg-success bg-opacity-15 border border-success border-opacity-20 text-success text-uppercase font-monospace" style={{ fontSize: '0.6rem' }}>
                          Imported
                        </span>
                      ) : null}
                    </div>

                    {/* Issue body snippet */}
                    {issue.body && (
                      <p className="text-secondary text-truncate small mb-2" style={{ fontSize: '0.75rem', maxWidth: '580px' }}>
                        {issue.body}
                      </p>
                    )}

                    {/* Metadata tags */}
                    <div className="d-flex flex-wrap align-items-center gap-1.5 mt-1.5">
                      {issue.milestone && (
                        <span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-10 rounded-pill font-monospace" style={{ fontSize: '0.65rem' }}>
                          Milestone: {issue.milestone}
                        </span>
                      )}
                      {issue.assignees && issue.assignees.map((assignee) => (
                        <span key={assignee} className="badge bg-secondary bg-opacity-15 text-white border border-secondary border-opacity-10 rounded-pill font-monospace" style={{ fontSize: '0.65rem' }}>
                          @{assignee}
                        </span>
                      ))}
                      {issue.labels && issue.labels.map((label) => (
                        <span key={label} className="badge bg-light bg-opacity-5 text-secondary border border-secondary border-opacity-10 rounded font-monospace" style={{ fontSize: '0.65rem' }}>
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="d-flex flex-column align-items-center justify-content-center text-center py-5 text-secondary border border-dashed border-secondary border-opacity-25 rounded-3 bg-dark bg-opacity-20">
              <Github size={40} className="mb-2 text-secondary opacity-30" />
              <span className="small">No issues loaded yet.</span>
              <span className="small mt-1 text-muted">Input a public repo owner/repo string and click "Fetch Issues"</span>
            </div>
          )}
        </div>

        {/* Footer controls & action buttons */}
        <div className="d-flex align-items-center justify-content-between pt-2 border-top border-secondary border-opacity-10">
          {/* Pagination controls */}
          <div>
            {issues.length > 0 && (
              <div className="d-flex align-items-center gap-2">
                <button 
                  className="btn btn-outline-secondary btn-sm p-1 text-white border-secondary border-opacity-25" 
                  disabled={page === 1 || isLoading}
                  onClick={() => fetchIssues(page - 1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-secondary small font-monospace">Page {page}</span>
                <button 
                  className="btn btn-outline-secondary btn-sm p-1 text-white border-secondary border-opacity-25" 
                  disabled={!hasMore || isLoading}
                  onClick={() => fetchIssues(page + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="d-flex gap-2">
            <button 
              className="btn btn-outline-secondary px-3 text-white border-secondary border-opacity-25"
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              className="btn btn-info px-4 fw-bold d-flex align-items-center gap-2"
              disabled={isImporting || selectedIds.size === 0}
              onClick={handleImport}
              style={{ background: 'linear-gradient(90deg, var(--neon-cyan) 0%, var(--neon-purple) 100%)', border: 'none', color: 'var(--bg-dark)' }}
            >
              {isImporting ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={14} />}
              <span>Import Selected ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
