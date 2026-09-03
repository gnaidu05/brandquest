import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

function generatePin(): string {
  const min = 100000;
  const max = 999999;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

export const createWithHost = mutation({
  args: {
    quizId: v.id("quizzes"),
    hostName: v.string(),
  },
  handler: async (ctx, args) => {
    const pin = generatePin();

    // Create the game first with a dummy hostId
    const gameId = await ctx.db.insert("games", {
      quizId: args.quizId,
      pin,
      hostId: "" as any, // Will be updated
      playerCount: 1,
      status: "lobby",
      currentQuestionIndex: -1,
      showLeaderboard: false,
    });

    // Create host player
    const playerId = await ctx.db.insert("players", {
      gameId,
      name: args.hostName,
      score: 0,
      streak: 0,
      correctCount: 0,
      totalAnswered: 0,
      isHost: true,
    });

    // Update game with real hostId
    await ctx.db.patch(gameId, { hostId: playerId });

    return { gameId, pin, playerId };
  },
});

export const getByPin = query({
  args: { pin: v.string() },
  handler: async (ctx, args) => {
    const games = await ctx.db
      .query("games")
      .withIndex("by_pin", (q) => q.eq("pin", args.pin))
      .collect();
    if (games.length === 0) return null;
    return games[0];
  },
});

export const get = query({
  args: { id: v.id("games") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const startGame = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.gameId, {
      status: "question",
      currentQuestionIndex: 0,
      startTime: Date.now(),
    });
  },
});

export const showResults = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_quiz", (q) => q.eq("quizId", game.quizId))
      .collect();
    const isLastQuestion =
      game.currentQuestionIndex >= questions.length - 1;
    await ctx.db.patch(args.gameId, {
      status: isLastQuestion ? "finished" : "showingResults",
      showLeaderboard: true,
    });
  },
});

export const nextQuestion = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");
    await ctx.db.patch(args.gameId, {
      status: "question",
      currentQuestionIndex: game.currentQuestionIndex + 1,
      showLeaderboard: false,
    });
  },
});

export const endGame = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.gameId, {
      status: "finished",
      endTime: Date.now(),
    });
  },
});

export const getPlayers = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();
  },
});

export const getLeaderboard = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();
    return players
      .sort((a, b) => b.score - a.score)
      .map((p, i) => ({
        rank: i + 1,
        name: p.name,
        score: p.score,
        correctCount: p.correctCount,
        totalAnswered: p.totalAnswered,
      }));
  },
});

export const getQuestionAnswers = query({
  args: { gameId: v.id("games"), questionIndex: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("answers")
      .withIndex("by_game_question", (q) =>
        q.eq("gameId", args.gameId).eq("questionIndex", args.questionIndex)
      )
      .collect();
  },
});
