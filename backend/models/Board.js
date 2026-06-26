import mongoose from 'mongoose';

const BoardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  sprintEndDate: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Board = mongoose.model('Board', BoardSchema);

export default Board;
