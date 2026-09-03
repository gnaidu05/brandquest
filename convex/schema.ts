import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  quizzes: defineTable({
    title: v.string(),
    description: v.string(),
    coverColor: v.string(),
    authorId: v.string(),
    questionCount: v.number(),
  }).index("by_author", ["authorId"]),

  questions: defineTable({
    quizId: v.id("quizzes"),
    text: v.string(),
    options: v.array(v.string()),
    correctIndex: v.number(),
    timeLimit: v.number(),
    order: v.number(),
  }).index("by_quiz", ["quizId", "order"]),

  games: defineTable({
    quizId: v.id("quizzes"),
    pin: v.string(),
    hostId: v.id("players"),
    playerCount: v.number(),
    status: v.union(
      v.literal("lobby"),
      v.literal("question"),
      v.literal("showingResults"),
      v.literal("finished")
    ),
    currentQuestionIndex: v.number(),
    showLeaderboard: v.boolean(),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
  }).index("by_pin", ["pin"]),

  players: defineTable({
    gameId: v.id("games"),
    name: v.string(),
    score: v.number(),
    streak: v.number(),
    correctCount: v.number(),
    totalAnswered: v.number(),
    isHost: v.boolean(),
  }).index("by_game", ["gameId"])
    .index("by_game_score", ["gameId", "score"]),

  answers: defineTable({
    gameId: v.id("games"),
    questionIndex: v.number(),
    playerId: v.id("players"),
    selectedOption: v.number(),
    correct: v.boolean(),
    answerTime: v.number(),
    points: v.number(),
  }).index("by_game_question", ["gameId", "questionIndex"])
    .index("by_player_game", ["playerId", "gameId"]),
});
