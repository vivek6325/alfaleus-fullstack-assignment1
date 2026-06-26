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
  status: {
    type: String,
    enum: ['Todo', 'In Progress', 'Done'],
    default: 'Todo'
  },
  assignee: {
    type: String,
    default: '',
    trim: true
  },
  labels: [{
    type: String,
    trim: true
  }],
  complexityScore: {
    type: Number,
    default: 0
  },
  boardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: true
  },
  version: {
    type: Number,
    default: 1
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware to update version and updatedAt timestamp on document update
CardSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  if (this.isModified()) {
    this.version = (this.version || 0) + 1;
  }
  next();
});

const Card = mongoose.model('Card', CardSchema);

export default Card;
