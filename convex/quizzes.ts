import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: { authorId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("quizzes")
      .withIndex("by_author", (q) => q.eq("authorId", args.authorId))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("quizzes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getQuestions = query({
  args: { quizId: v.id("quizzes") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("questions")
      .withIndex("by_quiz", (q) => q.eq("quizId", args.quizId))
      .collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    coverColor: v.string(),
    authorId: v.string(),
    questions: v.array(
      v.object({
        text: v.string(),
        options: v.array(v.string()),
        correctIndex: v.number(),
        timeLimit: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    if (args.questions.length === 0) {
      throw new Error("Quiz must have at least one question");
    }
    for (const q of args.questions) {
      if (q.options.length !== 4) {
        throw new Error("Each question must have exactly 4 options");
      }
    }
    const quizId = await ctx.db.insert("quizzes", {
      title: args.title,
      description: args.description,
      coverColor: args.coverColor,
      authorId: args.authorId,
      questionCount: args.questions.length,
    });
    for (let i = 0; i < args.questions.length; i++) {
      await ctx.db.insert("questions", {
        quizId,
        text: args.questions[i].text,
        options: args.questions[i].options,
        correctIndex: args.questions[i].correctIndex,
        timeLimit: args.questions[i].timeLimit,
        order: i,
      });
    }
    return quizId;
  },
});

export const remove = mutation({
  args: { id: v.id("quizzes") },
  handler: async (ctx, args) => {
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_quiz", (q) => q.eq("quizId", args.id))
      .collect();
    for (const q of questions) {
      await ctx.db.delete(q._id);
    }
    await ctx.db.delete(args.id);
  },
});
