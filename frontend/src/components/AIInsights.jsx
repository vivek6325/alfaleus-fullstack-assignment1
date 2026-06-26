import React from 'react';
import { Cpu, AlertTriangle, AlertOctagon, TrendingUp, Sparkles, CheckCircle2 } from 'lucide-react';

export default function AIInsights({ board }) {
  if (!board || !board.cards) return null;

  const totalCards = board.cards.length;
  const criticalCards = board.cards.filter(c => c.aiRiskAnalysis?.status === 'critical');
  const warningCards = board.cards.filter(c => c.aiRiskAnalysis?.status === 'warning');

  // Compute workload density
  const workload = {};
  board.cards.forEach(card => {
    if (card.assignedTo && card.columnId !== 'done') {
      workload[card.assignedTo] = (workload[card.assignedTo] || 0) + 1;
    }
  });

  // Spot column bottleneck
  const columnsCount = {};
  board.cards.forEach(card => {
    columnsCount[card.columnId] = (columnsCount[card.columnId] || 0) + 1;
  });

  // Generate recommendation notes
  const recommendations = [];

  // 1. Check bottleneck column
  board.columns.forEach(col => {
    const count = columnsCount[col.id] || 0;
    if (count > 3 && col.id !== 'todo' && col.id !== 'done') {
      recommendations.push({
        type: 'danger',
        message: `Column "${col.title}" is congested with ${count} tasks. Restrict pull rate to avoid project stagnation.`
      });
    }
  });

  // 2. Workload optimization suggestions
  Object.keys(workload).forEach(member => {
    if (workload[member] > 3) {
      // Find under-allocated members
      const helpers = Object.keys(workload).filter(h => workload[h] < 2 && h !== member);
      const helperMsg = helpers.length > 0 ? ` Consider distributing to ${helpers.join(' or ')}.` : '';
      recommendations.push({
        type: 'warning',
        message: `${member} is overloaded with ${workload[member]} concurrent tasks.${helperMsg}`
      });
    }
  });

  // 3. Overdue highlights
  if (criticalCards.length > 0) {
    recommendations.push({
      type: 'danger',
      message: `${criticalCards.length} tasks are currently overdue. Ensure blocker resolution ASAP.`
    });
  }

  // 4. Default positive vibe if board is balanced
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'success',
      message: 'Workspace flow is optimal. No active bottlenecks or resource constraints detected!'
    });
  }

  return (
    <div className="glass-panel p-4 mb-4">
      <div className="d-flex align-items-center justify-content-between mb-3 border-bottom border-secondary border-opacity-25 pb-2">
        <div className="d-flex align-items-center gap-2">
          <Cpu className="text-info animate-pulse" size={20} />
          <h5 className="mb-0 text-white fw-bold d-flex align-items-center gap-2">
            AI Assistant Insights 
            <span className="badge bg-info bg-opacity-10 text-info font-monospace small px-2 py-1" style={{ fontSize: '0.65rem' }}>Active</span>
          </h5>
        </div>
        <Sparkles size={16} className="text-warning" />
      </div>

      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="p-3 bg-dark bg-opacity-40 rounded border border-secondary border-opacity-25 text-center">
            <div className="text-secondary small">Total Tasks</div>
            <div className="fs-3 fw-bold text-white mt-1">{totalCards}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="p-3 bg-dark bg-opacity-40 rounded border border-secondary border-opacity-25 text-center">
            <div className="text-secondary small">Critical Risk</div>
            <div className="fs-3 fw-bold text-danger mt-1">{criticalCards.length}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="p-3 bg-dark bg-opacity-40 rounded border border-secondary border-opacity-25 text-center">
            <div className="text-secondary small">Warning Risk</div>
            <div className="fs-3 fw-bold text-warning mt-1">{warningCards.length}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="p-3 bg-dark bg-opacity-40 rounded border border-secondary border-opacity-25 text-center">
            <div className="text-secondary small">Healthy Tasks</div>
            <div className="fs-3 fw-bold text-success mt-1">{totalCards - (criticalCards.length + warningCards.length)}</div>
          </div>
        </div>
      </div>

      <div className="d-flex flex-column gap-2">
        <h6 className="text-secondary small text-uppercase mb-2 fw-semibold">Flow Analysis & Action Items</h6>
        {recommendations.map((rec, idx) => (
          <div 
            key={idx} 
            className={`p-3 rounded border d-flex gap-3 align-items-start ${
              rec.type === 'danger' ? 'bg-danger bg-opacity-10 border-danger text-danger' : 
              rec.type === 'warning' ? 'bg-warning bg-opacity-10 border-warning text-warning' : 
              'bg-success bg-opacity-10 border-success text-success'
            }`}
          >
            {rec.type === 'danger' ? (
              <AlertOctagon size={18} className="flex-shrink-0 mt-0.5" />
            ) : rec.type === 'warning' ? (
              <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
            )}
            <div className="small">{rec.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
