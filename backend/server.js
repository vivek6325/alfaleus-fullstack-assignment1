async function startServer() {
  let uri = MONGODB_URI;

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('Successfully connected to MongoDB Atlas.');
  } catch (err) {
    console.error("ACTUAL MONGODB ERROR:");
    console.error(err);

    // Removed mongodb-memory-server fallback for Railway deployment
    process.exit(1);
  }

  httpServer.listen(PORT, () => {
    console.log(`Kanban Backend Server running on port ${PORT}`);

    setTimeout(async () => {
      console.log('Running startup automated AI Project Manager analysis for all boards...');
      try {
        const boards = await Board.find();
        for (const board of boards) {
          await runAIAnalysis(board._id, io);
        }
      } catch (err) {
        console.error('Error running startup automated AI analysis:', err);
      }
    }, 5000);

    setInterval(async () => {
      console.log('Running automated 6-hourly AI Project Manager analysis for all boards...');
      try {
        const boards = await Board.find();
        for (const board of boards) {
          await runAIAnalysis(board._id, io);
        }
      } catch (err) {
        console.error('Error running automated AI analysis:', err);
      }
    }, 6 * 60 * 60 * 1000);
  });
}