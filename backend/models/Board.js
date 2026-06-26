import mongoose from 'mongoose';

const CardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  columnId: {
    type: String,
    required: true // references the id of the column in columns array (e.g., 'todo', 'in-progress')
  },
  order: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  assignedTo: {
    type: String,
    default: '',
    trim: true
  },
  dueDate: {
    type: Date
  },
  aiRiskAnalysis: {
    status: {
      type: String,
      enum: ['normal', 'warning', 'critical'],
      default: 'normal'
    },
    message: {
      type: String,
      default: ''
    }
  }
}, { timestamps: true });

const BoardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  columns: [{
    id: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  cards: [CardSchema]
}, { timestamps: true });

const Board = mongoose.model('Board', BoardSchema);

export default Board;
