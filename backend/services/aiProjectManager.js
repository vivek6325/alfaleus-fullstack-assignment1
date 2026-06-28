import Board from '../models/Board.js';
import Card from '../models/Card.js';

// Keyword patterns for complexity score inference
const COMPLEXITY_KEYWORDS = [
  {
    score: 5,
    keywords: ['auth', 'security', 'login', 'oauth', 'jwt', 'integrate', 'integration', 'migration', 'migrate', 'optimize', 'optimization', 'performance', 'database', 'schema', 'deploy', 'deployment', 'docker', 'kubernetes', 'setup', 'real-time', 'websocket', 'socket', 'algorithm', 'concurrency', 'multithreading', 'sync']
  },
  {
    score: 3,
    keywords: ['ui', 'style', 'css', 'bootstrap', 'component', 'components', 'page', 'view', 'layout', 'test', 'testing', 'jest', 'handle', 'handler', 'logic', 'form', 'validation']
  },
  {
    score: 1,
    keywords: ['fix', 'typo', 'doc', 'docs', 'documentation', 'text', 'label', 'button', 'color', 'minor', 'simple', 'easy', 'readme']
  }
];

/**
 * Infer complexity score (1-5) based on card description keywords
 * @param {string} description 
 * @returns {{ score: number, matchedKeywords: string[] }}
 */
function inferComplexity(description) {
  if (!description || !description.trim()) {
    return { score: 2, matchedKeywords: [] }; // default to low-medium if empty
  }

  const text = description.toLowerCase();
  let maxScore = 1;
  const matchedKeywords = [];

  for (const group of COMPLEXITY_KEYWORDS) {
    for (const kw of group.keywords) {
      if (text.includes(kw)) {
        matchedKeywords.push(kw);
        if (group.score > maxScore) {
          maxScore = group.score;
        }
      }
    }
  }

  // If no keywords matched, default to 2
  const finalScore = matchedKeywords.length > 0 ? maxScore : 2;
  return { score: finalScore, matchedKeywords };
}

/**
 * Perform AI Project Management Analysis
 * @param {string} boardId 
 * @param {object} io Socket.IO instance for streaming progress
 * @returns {Promise<object>} The fully compiled insights JSON
 */
export async function runAIAnalysis(boardId, io = null) {
  const emitProgress = (step, percent, message) => {
    if (io) {
      io.to(boardId.toString()).emit('ai-progress', { step, percent, message });
    }
    console.log(`[AI Analysis - Board ${boardId}] ${step} (${percent}%): ${message}`);
  };

  try {
    // Step 1: Loading board data
    emitProgress('loading', 10, 'Initializing AI engine and loading workspace data...');
    const board = await Board.findById(boardId);
    if (!board) {
      throw new Error('Board workspace not found');
    }

    const cards = await Card.find({ boardId });
    emitProgress('loading', 25, `Loaded board "${board.name}" with ${cards.length} cards.`);

    // Wait a brief moment to simulate step-by-step processing
    await new Promise(r => setTimeout(r, 600));

    // Step 2: Bottleneck Detection
    emitProgress('bottlenecks', 40, 'Analyzing column capacity thresholds...');
    const columnsCount = { Todo: 0, 'In Progress': 0, Done: 0 };
    cards.forEach(c => {
      if (columnsCount[c.status] !== undefined) {
        columnsCount[c.status]++;
      }
    });

    const bottlenecks = [];
    const totalCards = cards.length;

    // Warning if 'In Progress' has > 3 tasks
    if (columnsCount['In Progress'] > 3) {
      bottlenecks.push({
        columnId: 'In Progress',
        cardCount: columnsCount['In Progress'],
        severity: 'high',
        message: `Column "In Progress" has ${columnsCount['In Progress']} active cards. This exceeds the target limit of 3. Team is spread too thin.`
      });
    }

    // Warning if 'Todo' is piled up (> 60% of cards are in Todo and total > 5)
    if (totalCards > 5 && (columnsCount['Todo'] / totalCards) > 0.6) {
      bottlenecks.push({
        columnId: 'Todo',
        cardCount: columnsCount['Todo'],
        severity: 'medium',
        message: `Column "To Do" is holding ${Math.round((columnsCount['Todo'] / totalCards) * 100)}% of all tasks (${columnsCount['Todo']} cards). Backlog grooming recommended.`
      });
    }

    await new Promise(r => setTimeout(r, 600));

    // Step 3: Sprint completion risk analysis
    emitProgress('sprint', 70, 'Running sprint timeline and velocity simulation...');
    const completedCards = cards.filter(c => c.status === 'Done');
    const remainingCards = cards.filter(c => c.status !== 'Done');
    
    // Calculate velocity (cards completed per day)
    const daysElapsed = Math.max(1, (Date.now() - new Date(board.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    let velocity = completedCards.length / daysElapsed;
    if (velocity === 0) velocity = 1.0; // fallback velocity: 1 card per day

    let remainingDays = 0;
    if (board.sprintEndDate) {
      remainingDays = Math.max(0, (new Date(board.sprintEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    } else {
      remainingDays = 7.0; // default to 1 week if not specified
    }

    const daysRequired = remainingCards.length / velocity;
    
    let riskLevel = 'Low';
    let riskReason = 'Tasks completed align well with the remaining timeline.';

    if (remainingCards.length > 0 && remainingDays <= 0) {
      riskLevel = 'Critical';
      riskReason = `Sprint deadline has passed, but ${remainingCards.length} tasks remain uncompleted.`;
    } else if (daysRequired > remainingDays * 1.5) {
      riskLevel = 'Critical';
      riskReason = `Completion velocity requires ~${daysRequired.toFixed(1)} days to finish remaining tasks, but only ${remainingDays.toFixed(1)} days remain in the sprint.`;
    } else if (daysRequired > remainingDays) {
      riskLevel = 'High';
      riskReason = `Velocity indicates completion will require ${daysRequired.toFixed(1)} days, slightly exceeding the remaining sprint duration of ${remainingDays.toFixed(1)} days.`;
    } else if (daysRequired > remainingDays * 0.75) {
      riskLevel = 'Medium';
      riskReason = `Sprint schedule is tight. Estimated remaining days required (${daysRequired.toFixed(1)} days) is close to the sprint end date.`;
    }

    await new Promise(r => setTimeout(r, 600));

    // Step 4: Complexity Inference and discrepancy detection
    emitProgress('complexity', 90, 'Scanning task descriptions for complexity tags...');
    const complexityInferences = [];
    const complexityDiscrepancies = [];

    cards.forEach(card => {
      if (card.status !== 'Done') {
        const { score, matchedKeywords } = inferComplexity(card.description);
        
        complexityInferences.push({
          cardId: card._id,
          title: card.title,
          currentComplexity: card.complexityScore || 0,
          inferredComplexity: score,
          matchedKeywords
        });

        // Discrepancy if difference is >= 2 (and card has user-defined complexity > 0)
        if (card.complexityScore > 0 && Math.abs(card.complexityScore - score) >= 2) {
          complexityDiscrepancies.push({
            cardId: card._id,
            title: card.title,
            currentComplexity: card.complexityScore,
            inferredComplexity: score,
            matchedKeywords,
            reason: `Task description references high-intensity keywords (${matchedKeywords.join(', ')}) but complexity is set to ${card.complexityScore}.`
          });
        }
      }
    });

    await new Promise(r => setTimeout(r, 400));

    // Compile complete insights payload
    const insights = {
      boardId,
      analyzedAt: new Date(),
      totalCards,
      columnsCount,
      bottlenecks,
      sprintRisk: {
        remainingCardsCount: remainingCards.length,
        completedCardsCount: completedCards.length,
        daysElapsed: Number(daysElapsed.toFixed(2)),
        velocity: Number(velocity.toFixed(2)),
        remainingDays: Number(remainingDays.toFixed(2)),
        daysRequired: Number(daysRequired.toFixed(2)),
        riskLevel,
        reason: riskReason
      },
      complexityInferences,
      complexityDiscrepancies
    };

    emitProgress('complete', 100, 'AI Project Manager analysis complete.');
    
    // Broadcast full insights to the board room
    if (io) {
      io.to(boardId.toString()).emit('ai-insights', insights);
    }

    return insights;
  } catch (error) {
    console.error('Error running AI Project Manager analysis:', error);
    if (io) {
      io.to(boardId.toString()).emit('ai-progress', { step: 'error', percent: 100, message: `Analysis failed: ${error.message}` });
    }
    throw error;
  }
}
