import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Cpu, AlertTriangle, AlertOctagon, Sparkles, CheckCircle2, Award, ArrowRight, Gauge, RefreshCw } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : window.location.origin);

export default function AIInsightsSidebar({ isOpen, onClose, boardId, socket, initialInsights }) {
  const [insights, setInsights] = useState(initialInsights || null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(null);

  // Sync state if initial insights changes
  useEffect(() => {
    if (initialInsights) {
      setInsights(initialInsights);
    }
  }, [initialInsights]);

  // Hook up WebSocket progress listener
  useEffect(() => {
    if (!socket) return;

    const handleProgress = (data) => {
      setProgress(data);
      if (data.step === 'complete' && data.insights) {
        setInsights(data.insights);
        setIsAnalyzing(false);
      }
    };

    const handleInsights = (data) => {
      setInsights(data);
      setIsAnalyzing(false);
      setProgress(null);
    };

    socket.on('ai-progress', handleProgress);
    socket.on('ai-insights', handleInsights);

    return () => {
      socket.off('ai-progress', handleProgress);
      socket.off('ai-insights', handleInsights);
    };
  }, [socket]);

  // Handle Manual Trigger
  const triggerAnalysis = async () => {
    setIsAnalyzing(true);
    setProgress({ step: 'init', percent: 5, message: 'Contacting AI Project Manager services...' });
    try {
      const res = await axios.post(`${BACKEND_URL}/boards/${boardId}/ai-analyse`);
      setInsights(res.data);
    } catch (err) {
      console.error('Error triggering AI analysis:', err);
      setProgress({ step: 'error', percent: 100, message: 'AI Analysis failed. Please check server logs.' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskBadgeClass = (level) => {
    switch (level) {
      case 'Critical': return 'bg-danger bg-opacity-25 text-danger border-danger border-opacity-25 risk-critical-badge';
      case 'High': return 'bg-danger bg-opacity-15 text-danger border-danger border-opacity-20';
      case 'Medium': return 'bg-warning bg-opacity-15 text-warning border-warning border-opacity-20';
      case 'Low': return 'bg-success bg-opacity-15 text-success border-success border-opacity-20';
      default: return 'bg-secondary bg-opacity-15 text-secondary border-secondary border-opacity-20';
    }
  };

  return (
    <div className={`ai-sidebar ${isOpen ? 'open' : ''}`}>
      {/* Sidebar Header */}
      <div className="p-4 border-bottom border-secondary border-opacity-25 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-2">
          <Cpu className="text-info" size={22} style={{ filter: 'drop-shadow(0 0 6px rgba(0, 242, 254, 0.4))' }} />
          <h5 className="mb-0 text-white fw-bold">AI Project Manager</h5>
        </div>
        <button className="btn btn-link p-0 text-secondary hover-text-white" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      {/* Sidebar Content */}
      <div className="flex-grow-1 overflow-y-auto p-4 d-flex flex-column gap-4">
        {/* Trigger Button */}
        <div>
          <button 
            className="btn btn-info w-100 text-dark fw-bold d-flex align-items-center justify-content-center gap-2"
            disabled={isAnalyzing}
            onClick={triggerAnalysis}
            style={{ background: 'linear-gradient(90deg, var(--neon-cyan) 0%, var(--neon-purple) 100%)', border: 'none' }}
          >
            <RefreshCw size={16} className={isAnalyzing ? 'animate-spin' : ''} />
            <span>{isAnalyzing ? 'Running AI Analysis...' : 'Run Manual AI Scan'}</span>
          </button>
        </div>

        {/* Progress Overlay / State */}
        {progress && (
          <div className="p-3 bg-dark bg-opacity-50 rounded border border-info border-opacity-20">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-info small fw-bold">AI Streaming Analysis</span>
              <span className="text-secondary small font-monospace">{progress.percent}%</span>
            </div>
            <div className="progress mb-2" style={{ height: '6px', background: 'rgba(255, 255, 255, 0.05)' }}>
              <div 
                className="progress-bar bg-info" 
                role="progressbar" 
                style={{ width: `${progress.percent}%`, transition: 'width 0.4s ease', background: 'linear-gradient(90deg, var(--neon-cyan) 0%, var(--neon-purple) 100%)' }}
              ></div>
            </div>
            <div className="text-secondary small font-monospace typing-indicator">{progress.message}</div>
          </div>
        )}

        {insights ? (
          <>
            {/* 1. Sprint Risk Module */}
            <div className="p-3 bg-dark bg-opacity-40 rounded border border-secondary border-opacity-25">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h6 className="text-white fw-bold mb-0 d-flex align-items-center gap-2">
                  <Gauge size={16} className="text-info" />
                  Sprint Timeline Risk
                </h6>
                <span className={`badge border rounded-pill px-2.5 py-1 text-uppercase font-monospace ${getRiskBadgeClass(insights.sprintRisk.riskLevel)}`}>
                  {insights.sprintRisk.riskLevel} Risk
                </span>
              </div>

              {/* Risk metrics */}
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <div className="p-2 bg-dark bg-opacity-50 rounded text-center border border-secondary border-opacity-10">
                    <div className="text-secondary small" style={{ fontSize: '0.7rem' }}>Velocity (Tasks/Day)</div>
                    <div className="fw-bold text-white mt-0.5">{insights.sprintRisk.velocity}</div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="p-2 bg-dark bg-opacity-50 rounded text-center border border-secondary border-opacity-10">
                    <div className="text-secondary small" style={{ fontSize: '0.7rem' }}>Days Left</div>
                    <div className="fw-bold text-white mt-0.5">{insights.sprintRisk.remainingDays}</div>
                  </div>
                </div>
              </div>

              <p className="text-secondary small mb-0 font-monospace" style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>
                {insights.sprintRisk.reason}
              </p>
            </div>

            {/* 2. Bottleneck Detection */}
            <div className="p-3 bg-dark bg-opacity-40 rounded border border-secondary border-opacity-25">
              <h6 className="text-white fw-bold mb-3 d-flex align-items-center gap-2">
                <AlertTriangle size={16} className="text-warning" />
                Workload Bottlenecks
              </h6>

              {insights.bottlenecks && insights.bottlenecks.length > 0 ? (
                <div className="d-flex flex-column gap-2">
                  {insights.bottlenecks.map((bot, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded border text-start small d-flex gap-2.5 ${
                        bot.severity === 'high' ? 'bg-danger bg-opacity-10 border-danger border-opacity-20 text-danger' : 
                        'bg-warning bg-opacity-10 border-warning border-opacity-20 text-warning'
                      }`}
                    >
                      <AlertOctagon size={16} className="flex-shrink-0 mt-0.5" />
                      <div>{bot.message}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-success bg-opacity-5 rounded border border-success border-opacity-15 text-success small d-flex gap-2">
                  <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
                  <div>No capacity bottlenecks detected. Column loads are well within bounds.</div>
                </div>
              )}
            </div>

            {/* 3. Complexity Score Discrepancies */}
            <div className="p-3 bg-dark bg-opacity-40 rounded border border-secondary border-opacity-25">
              <h6 className="text-white fw-bold mb-3 d-flex align-items-center gap-2">
                <Award size={16} className="text-purple-neon" />
                Complexity Inferences
              </h6>

              {insights.complexityDiscrepancies && insights.complexityDiscrepancies.length > 0 ? (
                <div className="d-flex flex-column gap-2.5">
                  <div className="text-secondary small mb-1" style={{ fontSize: '0.75rem' }}>
                    The following tasks have complexity values that conflict with description cues:
                  </div>
                  {insights.complexityDiscrepancies.map((disc, idx) => (
                    <div key={idx} className="p-2.5 bg-dark bg-opacity-65 rounded border border-secondary border-opacity-15 text-start">
                      <div className="text-white small fw-bold text-truncate mb-1">{disc.title}</div>
                      <div className="d-flex align-items-center gap-2 mb-2" style={{ fontSize: '0.7rem' }}>
                        <span className="text-secondary">Assigned: <strong className="text-info">{disc.currentComplexity} SP</strong></span>
                        <ArrowRight size={10} className="text-secondary" />
                        <span className="text-secondary">AI Inferred: <strong className="text-warning">{disc.inferredComplexity} SP</strong></span>
                      </div>
                      <div className="text-secondary small p-1.5 bg-black bg-opacity-40 rounded border-left border-warning" style={{ fontSize: '0.7rem' }}>
                        Keywords: <code className="text-warning">{disc.matchedKeywords.join(', ')}</code>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-success bg-opacity-5 rounded border border-success border-opacity-15 text-success small d-flex gap-2">
                  <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
                  <div>Task complexity estimates align perfectly with description keywords!</div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center py-5 text-secondary">
            <Sparkles size={36} className="mb-2 text-info opacity-50" />
            <span className="small">No AI scan data loaded yet.</span>
            <span className="small mt-1 text-muted">Click the button above to run analysis.</span>
          </div>
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 border-top border-secondary border-opacity-10 text-center bg-black bg-opacity-20">
        <span className="text-secondary small" style={{ fontSize: '0.65rem' }}>
          AI analysis runs automatically every 6 hours
        </span>
      </div>
    </div>
  );
}
