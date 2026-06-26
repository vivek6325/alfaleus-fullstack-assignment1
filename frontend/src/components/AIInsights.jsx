import React from 'react';
import { Cpu, AlertTriangle, AlertOctagon, Sparkles, CheckCircle2, Award } from 'lucide-react';

export default function AIInsights({ board }) {
  if (!board || !board.cards) return null;

  const totalCards = board.cards.length;
  
  // Calculate total story points (complexity score)
  const totalComplexity = board.cards.reduce((sum, c) => sum + (c.complexityScore || 0), 0);

  // Compute workload density (story points and card count per assignee)
  const assigneeLoad = {};
  board.cards.forEach(card => {
    if (card.assignee && card.status !== 'Done') {
      if (!assigneeLoad[card.assignee]) {
        assigneeLoad[card.assignee] = { count: 0, points: 0 };
      }
      assigneeLoad[card.assignee].count += 1;
      assigneeLoad[card.assignee].points += (card.complexityScore || 0);
    }
  });

  // Spot column bottlenecks
  const columnsCount = {};
  board.cards.forEach(card => {
    columnsCount[card.status] = (columnsCount[card.status] || 0) + 1;
  });

  const recommendations = [];

  // 1. Analyze Column Bottlenecks (more than 3 cards in In Progress)
  const inProgressCount = columnsCount['In Progress'] || 0;
  if (inProgressCount > 3) {
    recommendations.push({
      type: 'danger',
      message: `Congestion warning: "In Progress" column has ${inProgressCount} active tasks. Recommend completing existing tasks before pulling more.`
    });
  }

  // 2. High Complexity Alerts
  const complexCards = board.cards.filter(c => (c.complexityScore || 0) >= 8 && c.status !== 'Done');
  if (complexCards.length > 0) {
    recommendations.push({
      type: 'warning',
      message: `${complexCards.length} high-complexity tasks (SP >= 8) are active. Consider decomposing these into smaller, manageable subtasks.`
    });
  }

  // 3. Workload Optimization Suggestions (Assignee Story Points > 10)
  Object.keys(assigneeLoad).forEach(member => {
    const load = assigneeLoad[member];
    if (load.points > 10) {
      // Find team members with lighter load
      const helpers = Object.keys(assigneeLoad).filter(h => assigneeLoad[h].points < 5 && h !== member);
      const helperMsg = helpers.length > 0 ? ` Consider offloading tasks to ${helpers.join(' or ')}.` : '';
      recommendations.push({
        type: 'warning',
        message: `${member} has a high workload of ${load.points} Story Points (${load.count} tasks).${helperMsg}`
      });
    }
  });

  // 4. Default Success Insight
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'success',
      message: 'Workspace load is well-balanced. Columns and story-point allocations are within target thresholds!'
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
            <div className="text-secondary small">Total Story Points</div>
            <div className="fs-3 fw-bold text-info mt-1 d-flex align-items-center justify-content-center gap-1">
              <Award size={20} />
              {totalComplexity}
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="p-3 bg-dark bg-opacity-40 rounded border border-secondary border-opacity-25 text-center">
            <div className="text-secondary small">In Progress Points</div>
            <div className="fs-3 fw-bold text-warning mt-1">
              {board.cards.filter(c => c.status === 'In Progress').reduce((sum, c) => sum + (c.complexityScore || 0), 0)}
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="p-3 bg-dark bg-opacity-40 rounded border border-secondary border-opacity-25 text-center">
            <div className="text-secondary small">Done Points</div>
            <div className="fs-3 fw-bold text-success mt-1">
              {board.cards.filter(c => c.status === 'Done').reduce((sum, c) => sum + (c.complexityScore || 0), 0)}
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex flex-column gap-2">
        <h6 className="text-secondary small text-uppercase mb-2 fw-semibold">Workspace Flow Analytics</h6>
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
