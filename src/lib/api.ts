import { supabase } from "./supabase";

// ── Types ──────────────────────────────────────────
export interface Quiz {
  id: string;
  title: string;
  description: string;
  cover_color: string;
  author_id: string;
  question_count: number;
  created_at: string;
}

export interface Question {
  id: string;
  quiz_id: string;
  text: string;
  options: string[];
  correct_index: number;
  time_limit: number;
  sort_order: number;
}

export interface Game {
  id: string;
  quiz_id: string;
  pin: string;
  host_id: string;
  player_count: number;
  status: "lobby" | "question" | "showingResults" | "finished";
  current_question_index: number;
  show_leaderboard: boolean;
  start_time: string | null;
  end_time: string | null;
  question_start_time: string | null;
}

export interface Player {
  id: string;
  game_id: string;
  name: string;
  score: number;
  streak: number;
  correct_count: number;
  total_answered: number;
  is_host: boolean;
}

export interface Answer {
  id: string;
  game_id: string;
  question_index: number;
  player_id: string;
  selected_option: number;
  correct: boolean;
  answer_time: number;
  points: number;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  correctCount: number;
  totalAnswered: number;
}

// ── Quiz Functions ─────────────────────────────────

export async function listQuizzes(authorId: string): Promise<Quiz[]> {
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("author_id", authorId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getQuiz(id: string): Promise<Quiz | null> {
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function getQuestions(quizId: string): Promise<Question[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function createQuiz(
  title: string,
  description: string,
  coverColor: string,
  authorId: string,
  questions: { text: string; options: string[]; correctIndex: number; timeLimit: number }[]
): Promise<string> {
  const { data: quiz, error: quizErr } = await supabase
    .from("quizzes")
    .insert({
      title,
      description,
      cover_color: coverColor,
      author_id: authorId,
      question_count: questions.length,
    })
    .select()
    .single();
  if (quizErr) throw quizErr;

  const questionRows = questions.map((q, i) => ({
    quiz_id: quiz.id,
    text: q.text,
    options: q.options,
    correct_index: q.correctIndex,
    time_limit: q.timeLimit,
    sort_order: i,
  }));
  const { error: qErr } = await supabase.from("questions").insert(questionRows);
  if (qErr) throw qErr;

  return quiz.id;
}

export async function deleteQuiz(id: string): Promise<void> {
  // Questions cascade-delete via FK
  const { error } = await supabase.from("quizzes").delete().eq("id", id);
  if (error) throw error;
}

// ── Game Functions ─────────────────────────────────

function generatePin(): string {
  const min = 100000;
  const max = 999999;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

export async function createGameWithHost(
  quizId: string,
  hostName: string
): Promise<{ gameId: string; pin: string; playerId: string }> {
  const pin = generatePin();

  // Create game
  const { data: game, error: gameErr } = await supabase
    .from("games")
    .insert({
      quiz_id: quizId,
      pin,
      host_id: "",
      player_count: 1,
      status: "lobby",
      current_question_index: -1,
    })
    .select()
    .single();
  if (gameErr) throw gameErr;

  // Create host player
  const { data: player, error: playerErr } = await supabase
    .from("players")
    .insert({
      game_id: game.id,
      name: hostName,
      is_host: true,
    })
    .select()
    .single();
  if (playerErr) throw playerErr;

  // Update game with host ID
  const { error: updateErr } = await supabase
    .from("games")
    .update({ host_id: player.id })
    .eq("id", game.id);
  if (updateErr) throw updateErr;

  return { gameId: game.id, pin, playerId: player.id };
}

export async function getGameByPin(pin: string): Promise<Game | null> {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("pin", pin)
    .single();
  if (error) return null;
  return data;
}

export async function getGame(id: string): Promise<Game | null> {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function startGame(gameId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("games")
    .update({
      status: "question",
      current_question_index: 0,
      start_time: now,
      question_start_time: now,
    })
    .eq("id", gameId);
  if (error) throw error;
}

export async function showResults(gameId: string): Promise<void> {
  // Get game to check if last question
  const game = await getGame(gameId);
  if (!game) throw new Error("Game not found");
  const questions = await getQuestions(game.quiz_id);
  const isLast = game.current_question_index >= questions.length - 1;

  const { error } = await supabase
    .from("games")
    .update({
      status: isLast ? "finished" : "showingResults",
      show_leaderboard: true,
    })
    .eq("id", gameId);
  if (error) throw error;
}

export async function nextQuestion(gameId: string): Promise<void> {
  const game = await getGame(gameId);
  if (!game) throw new Error("Game not found");
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("games")
    .update({
      status: "question",
      current_question_index: game.current_question_index + 1,
      show_leaderboard: false,
      question_start_time: now,
    })
    .eq("id", gameId);
  if (error) throw error;
}

export async function endGame(gameId: string): Promise<void> {
  const { error } = await supabase
    .from("games")
    .update({
      status: "finished",
      end_time: new Date().toISOString(),
    })
    .eq("id", gameId);
  if (error) throw error;
}

// ── Player Functions ───────────────────────────────

export async function joinGame(
  gameId: string,
  name: string,
  isHost: boolean
): Promise<string> {
  const game = await getGame(gameId);
  if (!game) throw new Error("Game not found");
  if (game.status !== "lobby") throw new Error("Game already started");

  const { data: player, error } = await supabase
    .from("players")
    .insert({
      game_id: gameId,
      name,
      is_host: isHost,
    })
    .select()
    .single();
  if (error) throw error;

  // Increment player count
  await supabase
    .from("games")
    .update({ player_count: game.player_count + 1 })
    .eq("id", gameId);

  return player.id;
}

export async function getPlayer(id: string): Promise<Player | null> {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

export async function submitAnswer(
  gameId: string,
  playerId: string,
  questionIndex: number,
  selectedOption: number,
  timeElapsed: number
): Promise<{ alreadyAnswered: boolean; points: number; correct: boolean; streak: number }> {
  // Check if already answered
  const { data: existing } = await supabase
    .from("answers")
    .select("*")
    .eq("game_id", gameId)
    .eq("question_index", questionIndex)
    .eq("player_id", playerId)
    .single();

  if (existing) {
    return {
      alreadyAnswered: true,
      points: existing.points,
      correct: existing.correct,
      streak: 0,
    };
  }

  // Get game and question
  const game = await getGame(gameId);
  if (!game) throw new Error("Game not found");
  const questions = await getQuestions(game.quiz_id);
  const question = questions[questionIndex];
  if (!question) throw new Error("Question not found");

  const correct = selectedOption === question.correct_index;

  // Calculate points
  let points = 0;
  if (correct) {
    const timeFraction = Math.max(0, 1 - timeElapsed / question.time_limit);
    points = Math.round(100 + timeFraction * 900);
  }

  // Get player for streak
  const player = await getPlayer(playerId);
  if (!player) throw new Error("Player not found");

  const newStreak = correct ? player.streak + 1 : 0;
  const streakBonus = correct && newStreak >= 3 ? 100 : 0;
  points += streakBonus;

  // Insert answer
  const { error: answerErr } = await supabase.from("answers").insert({
    game_id: gameId,
    question_index: questionIndex,
    player_id: playerId,
    selected_option: selectedOption,
    correct,
    answer_time: timeElapsed,
    points,
  });
  if (answerErr) throw answerErr;

  // Update player score
  const { error: playerErr } = await supabase
    .from("players")
    .update({
      score: player.score + points,
      streak: newStreak,
      correct_count: player.correct_count + (correct ? 1 : 0),
      total_answered: player.total_answered + 1,
    })
    .eq("id", playerId);
  if (playerErr) throw playerErr;

  return { alreadyAnswered: false, points, correct, streak: newStreak };
}

// ── Query Functions ────────────────────────────────

export async function getPlayers(gameId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("game_id", gameId);
  if (error) throw error;
  return data ?? [];
}

export async function getNonHostPlayers(gameId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("game_id", gameId)
    .eq("is_host", false);
  if (error) throw error;
  return data ?? [];
}

export async function getLeaderboard(gameId: string): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("game_id", gameId)
    .eq("is_host", false)
    .order("score", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((p, i) => ({
    rank: i + 1,
    name: p.name,
    score: p.score,
    correctCount: p.correct_count,
    totalAnswered: p.total_answered,
  }));
}

export async function getQuestionAnswers(
  gameId: string,
  questionIndex: number
): Promise<Answer[]> {
  const { data, error } = await supabase
    .from("answers")
    .select("*")
    .eq("game_id", gameId)
    .eq("question_index", questionIndex);
  if (error) throw error;
  return data ?? [];
}

// ── Real-time Subscriptions ────────────────────────

export function subscribeToGame(
  gameId: string,
  callback: (game: Game) => void
): () => void {
  const channel = supabase
    .channel(`game:${gameId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` },
      (payload) => callback(payload.new as Game)
    )
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}

export function subscribeToPlayers(
  gameId: string,
  callback: (players: Player[]) => void
): () => void {
  const fetchPlayers = async () => {
    const players = await getPlayers(gameId);
    callback(players);
  };

  const channel = supabase
    .channel(`players:${gameId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "players", filter: `game_id=eq.${gameId}` },
      () => { void fetchPlayers(); }
    )
    .subscribe();

  void fetchPlayers();

  return () => { void supabase.removeChannel(channel); };
}

export function subscribeToAnswers(
  gameId: string,
  questionIndex: number,
  callback: (answers: Answer[]) => void
): () => void {
  const fetchAnswers = async () => {
    const answers = await getQuestionAnswers(gameId, questionIndex);
    callback(answers);
  };

  const channel = supabase
    .channel(`answers:${gameId}:${questionIndex}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "answers", filter: `game_id=eq.${gameId}` },
      () => { void fetchAnswers(); }
    )
    .subscribe();

  void fetchAnswers();

  return () => { void supabase.removeChannel(channel); };
}
