import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const joinGame = mutation({
  args: {
    gameId: v.id("games"),
    name: v.string(),
    isHost: v.boolean(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");
    if (game.status !== "lobby") throw new Error("Game already started");

    const playerId = await ctx.db.insert("players", {
      gameId: args.gameId,
      name: args.name,
      score: 0,
      streak: 0,
      correctCount: 0,
      totalAnswered: 0,
      isHost: args.isHost,
    });

    await ctx.db.patch(args.gameId, {
      playerCount: game.playerCount + 1,
      hostId: args.isHost ? playerId : game.hostId,
    });

    return playerId;
  },
});

export const submitAnswer = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
    questionIndex: v.number(),
    selectedOption: v.number(),
    timeElapsed: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if already answered
    const existing = await ctx.db
      .query("answers")
      .withIndex("by_game_question", (q) =>
        q
          .eq("gameId", args.gameId)
          .eq("questionIndex", args.questionIndex)
      )
      .collect();
    const alreadyAnswered = existing.find(
      (a) => a.playerId === args.playerId
    );
    if (alreadyAnswered) {
      return { alreadyAnswered: true, points: alreadyAnswered.points };
    }

    // Get the game and question
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");

    const questions = await ctx.db
      .query("questions")
      .withIndex("by_quiz", (q) => q.eq("quizId", game.quizId))
      .collect();
    const question = questions[args.questionIndex];
    if (!question) throw new Error("Question not found");

    const correct = args.selectedOption === question.correctIndex;
    const timeLimit = question.timeLimit;

    // Calculate points: max 1000 for instant, minimum 100 for answering at deadline
    let points = 0;
    if (correct) {
      const timeFraction = Math.max(0, 1 - args.timeElapsed / timeLimit);
      points = Math.round(100 + timeFraction * 900);
    }

    // Get player for streak
    const player = await ctx.db.get(args.playerId);
    if (!player) throw new Error("Player not found");

    const newStreak = correct ? player.streak + 1 : 0;
    const streakBonus = correct && newStreak >= 3 ? 100 : 0;
    points += streakBonus;

    await ctx.db.insert("answers", {
      gameId: args.gameId,
      questionIndex: args.questionIndex,
      playerId: args.playerId,
      selectedOption: args.selectedOption,
      correct,
      answerTime: args.timeElapsed,
      points,
    });

    await ctx.db.patch(args.playerId, {
      score: player.score + points,
      streak: newStreak,
      correctCount: player.correctCount + (correct ? 1 : 0),
      totalAnswered: player.totalAnswered + 1,
    });

    return { alreadyAnswered: false, points, correct, streak: newStreak };
  },
});

export const get = query({
  args: { id: v.id("players") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
