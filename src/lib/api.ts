import { supabase } from "./supabase";

/**
 * An error whose message is written for the person using the app.
 * Anything else thrown from this module (Postgres errors, network failures)
 * carries internal wording and should not be surfaced verbatim.
 */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * The messages in supabase/fix6.sql are written for the person using the app
 * and are raised with plpgsql's default code. Everything else that can come
 * back — a constraint name, a permission error, a network failure — carries a
 * code of its own and internal wording, so it is logged rather than shown.
 */
const READABLE_PG_CODE = "P0001";

function asAppError(error: unknown, fallback: string): Error {
  const code = (error as { code?: string } | null)?.code;
  const message = (error as { message?: string } | null)?.message;
  if (code === READABLE_PG_CODE && message) return new AppError(message);
  console.error(fallback, error);
  return error instanceof Error ? error : new Error(fallback);
}

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

/**
 * quiz      2-6 options, one right, scored on speed.
 * truefalse the same, with its two options fixed to True and False.
 * poll      no right answer: recorded and counted, but never scored.
 * text      nothing to pick: the player types, and scores if they spell it
 *           the way the author does.
 */
export type QuestionKind = "quiz" | "truefalse" | "poll" | "text";

export interface Question {
  id: string;
  kind: QuestionKind;
  text: string;
  /** For a typed question these are the spellings the author accepts. */
  options: string[];
  /** Withheld by the server until the room has been shown this question. */
  correct_index: number | null;
  time_limit: number;
  sort_order: number;
  /** Public URL of the question's picture, or null if it has none. */
  image_url: string | null;
}

/** A poll has nothing to reveal and nothing to be right about. */
export const isPoll = (q: { kind?: QuestionKind } | null | undefined) => q?.kind === "poll";

/** A typed question has no options to show: the player writes their answer. */
export const isText = (q: { kind?: QuestionKind } | null | undefined) => q?.kind === "text";

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

/** One thing the room typed, and how many of them typed it. */
export interface TypedAnswer {
  answer: string;
  count: number;
  correct: boolean;
}

/**
 * How a room answered one question.
 *
 * The breakdown is withheld from players until the question is over, so
 * `correctCount`, `optionCounts` and `textAnswers` are null while it is still
 * being answered. `answered` is always there — it is only a head count.
 *
 * A question has one breakdown or the other, never both: `optionCounts` for
 * anything with options to pick between, `textAnswers` for a typed one.
 */
export interface AnswerTally {
  answered: number;
  correctCount: number | null;
  optionCounts: number[] | null;
  textAnswers: TypedAnswer[] | null;
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
  const { data, error } = await supabase.rpc("list_quizzes", { p_author_id: authorId });
  if (error) throw asAppError(error, "Could not list quizzes");
  return (data ?? []) as Quiz[];
}

/**
 * The questions of the quiz a game is playing.
 *
 * Reads go through the game rather than the quiz because the server decides
 * what to show from the game's position: `correct_index` is null until the
 * room has reached that question, so it is never sitting in a response a
 * player could read early. Pass the host id — the host's own player id — to
 * get every answer straight away, which is what the host screen shows.
 */
export async function getGameQuestions(
  gameId: string,
  hostId?: string | null
): Promise<Question[]> {
  const { data, error } = await supabase.rpc("get_game_questions", {
    p_game_id: gameId,
    p_host_id: hostId ?? null,
  });
  if (error) throw asAppError(error, "Could not load the questions");
  return (data ?? []) as Question[];
}

/** What Storage and the database will accept for a question picture. */
export const QUESTION_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const QUESTION_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

/**
 * Puts one picture in the question-media bucket and returns its public URL.
 *
 * The bucket enforces the same type and size limits, so these checks exist to
 * fail early with a sentence worth reading rather than to be the only guard.
 * Names are random: an upload can never land on somebody else's file, and the
 * bucket allows no overwrite or delete for the same reason.
 */
export async function uploadQuestionImage(file: File): Promise<string> {
  if (!QUESTION_IMAGE_TYPES.includes(file.type)) {
    throw new AppError("That needs to be a JPEG, PNG, WebP or GIF image.");
  }
  if (file.size > QUESTION_IMAGE_MAX_BYTES) {
    throw new AppError("That image is over 2 MB. Try a smaller one.");
  }

  const extension = (file.name.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${crypto.randomUUID()}${extension ? "." + extension : ""}`;

  const { error } = await supabase.storage
    .from("question-media")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw asAppError(error, "Could not upload the image");

  return supabase.storage.from("question-media").getPublicUrl(path).data.publicUrl;
}

/**
 * Removes one uploaded picture from the bucket.
 *
 * Only a file no question refers to can go — the bucket policy sees to that —
 * which is exactly the case here: an image replaced or removed while a quiz is
 * still being written was never saved against a question.
 *
 * Tidying up is not worth failing an edit over, so this reports rather than
 * throws. The worst case is a file left behind, which is where we were before.
 */
export async function deleteQuestionImage(url: string | null | undefined): Promise<void> {
  const name = (url ?? "").split("/question-media/")[1];
  if (!name) return;

  const { error } = await supabase.storage.from("question-media").remove([name]);
  if (error) console.error("Could not remove the replaced image", error);
}

export async function createQuiz(
  title: string,
  description: string,
  coverColor: string,
  authorId: string,
  questions: {
    kind?: QuestionKind;
    text: string;
    /** For a typed question, the spellings that score. */
    options: string[];
    correctIndex: number;
    timeLimit: number;
    imageUrl?: string | null;
  }[]
): Promise<string> {
  const { data, error } = await supabase.rpc("create_quiz", {
    p_title: title,
    p_description: description,
    p_cover_color: coverColor,
    p_author_id: authorId,
    p_questions: questions,
  });
  if (error) throw asAppError(error, "Could not save the quiz");
  if (typeof data !== "string") throw new AppError("The quiz could not be saved. Try again.");
  return data;
}

/**
 * Deletes a quiz and everything hanging off it — its questions, its games,
 * and their players and answers.
 *
 * Only the author id the quiz was created under can delete it. That id is a
 * UUID this browser generated, so it works as a key: a quiz cannot be removed
 * by someone who has never held it.
 *
 * The function reports which pictures the delete left with nothing pointing at
 * them, and those are removed here rather than in SQL: deleting the row in
 * storage.objects would drop the metadata and leave the bytes in the bucket,
 * paid for and unreachable. Only the Storage API removes both.
 *
 * A picture another quiz still uses is not in that list, and the bucket policy
 * would refuse it anyway.
 */
export async function deleteQuiz(id: string, authorId: string): Promise<void> {
  const { data, error } = await supabase.rpc("delete_quiz", {
    p_quiz_id: id,
    p_author_id: authorId,
  });
  if (error) throw asAppError(error, "Could not delete the quiz");

  // The quiz is already gone. A picture left behind is untidy, not a failure,
  // so this never turns a successful delete into an error the person sees.
  const orphaned = (Array.isArray(data) ? data : []).filter(
    (name): name is string => typeof name === "string" && name.length > 0
  );
  if (orphaned.length === 0) return;

  const { error: storageError } = await supabase.storage
    .from("question-media")
    .remove(orphaned);
  if (storageError) {
    console.error("Deleted the quiz but could not remove its images", storageError);
  }
}

// ── Game Functions ─────────────────────────────────

/**
 * Opens a game and seats its host.
 *
 * The PIN is drawn by the database against a unique index over live games, so
 * two rooms cannot end up sharing one. The returned player id is also the
 * game's host id: it is what proves, later, that a request to advance the
 * game came from the host.
 */
export async function createGameWithHost(
  quizId: string,
  authorId: string,
  hostName: string
): Promise<{ gameId: string; pin: string; playerId: string }> {
  const { data, error } = await supabase.rpc("create_game_with_host", {
    p_quiz_id: quizId,
    p_author_id: authorId,
    p_host_name: hostName,
  });
  if (error) throw asAppError(error, "Could not start the game");

  const row = (Array.isArray(data) ? data[0] : data) as
    | { game_id: string; pin: string; player_id: string }
    | undefined;
  if (!row) throw new AppError("The game could not be started. Try again.");

  return { gameId: row.game_id, pin: row.pin, playerId: row.player_id };
}

/**
 * Looks up a game by its PIN.
 *
 * Returns null only when no game carries that PIN. A failing request (offline,
 * server error, permission denied) throws, so callers can tell "wrong PIN"
 * apart from "we could not check" and say so.
 *
 * A PIN is unique among games that have not finished, but is free to come
 * round again afterwards, so the newest game wins.
 */
export async function getGameByPin(pin: string): Promise<Game | null> {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("pin", pin)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getGame(id: string): Promise<Game | null> {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Moves a game on.
 *
 * Every one of these used to be an UPDATE sent straight from the browser, on
 * a table anyone could write — so anyone who knew a game's id could drive
 * someone else's room. They go through the database now, which checks the
 * host id first and works out for itself whether a question was the last one.
 */
async function setGameState(
  gameId: string,
  hostId: string | null,
  action: "start" | "show_results" | "next_question" | "end"
): Promise<void> {
  const { error } = await supabase.rpc("host_set_game_state", {
    p_game_id: gameId,
    p_host_id: hostId,
    p_action: action,
  });
  if (error) throw asAppError(error, `Could not ${action.replace("_", " ")}`);
}

export function startGame(gameId: string, hostId: string | null): Promise<void> {
  return setGameState(gameId, hostId, "start");
}

export function showResults(gameId: string, hostId: string | null): Promise<void> {
  return setGameState(gameId, hostId, "show_results");
}

export function nextQuestion(gameId: string, hostId: string | null): Promise<void> {
  return setGameState(gameId, hostId, "next_question");
}

export function endGame(gameId: string, hostId: string | null): Promise<void> {
  return setGameState(gameId, hostId, "end");
}

// ── Player Functions ───────────────────────────────

/**
 * Seats a player in a lobby.
 *
 * "Has it started yet?" and the room's size limit are both checked by the
 * database, holding the game row, rather than being taken on trust from the
 * browser that asked.
 */
export async function joinGame(gameId: string, name: string): Promise<string> {
  const { data, error } = await supabase.rpc("join_game", {
    p_game_id: gameId,
    p_name: name,
  });
  if (error) throw asAppError(error, "Could not join the game");
  if (typeof data !== "string") throw new AppError("You could not be added to that game.");
  return data;
}

export async function getPlayer(id: string): Promise<Player | null> {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return null;
  return data;
}

/**
 * Records an answer and scores it.
 *
 * The whole thing happens inside submit_answer() in one round trip. It used to
 * be six sequential requests from the browser, which meant ~6N of them landing
 * at once when a room answered together, and it computed `correct` and
 * `points` client-side — so a player could post any score they liked. The
 * function decides both, under a lock on the player row, and a unique
 * constraint on (game_id, question_index, player_id) makes a double tap
 * idempotent rather than double-scoring.
 *
 * A typed answer passes `textAnswer` and no option. Whether it is right is
 * settled in SQL against the spellings the author accepts, which never leave
 * the server for a typed question, so the answer cannot be read off the wire
 * before it is given.
 *
 * Requires supabase/fix5.sql to have been applied.
 */
export async function submitAnswer(
  gameId: string,
  playerId: string,
  questionIndex: number,
  selectedOption: number | null,
  timeElapsed: number,
  textAnswer?: string | null
): Promise<{ alreadyAnswered: boolean; points: number; correct: boolean; streak: number }> {
  const { data, error } = await supabase.rpc("submit_answer", {
    p_game_id: gameId,
    p_player_id: playerId,
    p_question_index: questionIndex,
    p_selected_option: selectedOption,
    p_time_elapsed: timeElapsed,
    p_text_answer: textAnswer ?? null,
  });
  if (error) throw asAppError(error, "Could not record the answer");

  // The function returns a single-row table.
  const row = (Array.isArray(data) ? data[0] : data) as
    | { already_answered: boolean; points: number; correct: boolean; streak: number }
    | undefined;
  if (!row) throw new AppError("That answer could not be recorded. Try again.");

  return {
    alreadyAnswered: row.already_answered,
    points: row.points,
    correct: row.correct,
    streak: row.streak,
  };
}

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

/**
 * How the room answered one question.
 *
 * Answer rows carry whether they were right, and the table used to be readable
 * by anyone — so as soon as one person had answered, everybody else could look
 * up which option that was. Only the shape of the vote comes back now, and the
 * breakdown is held until the question is over. The host, who displays it
 * live, passes their host id and sees it throughout.
 */
export async function getAnswerTally(
  gameId: string,
  questionIndex: number,
  hostId?: string | null
): Promise<AnswerTally> {
  const { data, error } = await supabase.rpc("get_answer_tally", {
    p_game_id: gameId,
    p_question_index: questionIndex,
    p_host_id: hostId ?? null,
  });
  if (error) throw asAppError(error, "Could not load the answer tally");

  const row = (Array.isArray(data) ? data[0] : data) as
    | {
        answered: number;
        correct_count: number | null;
        option_counts: number[] | null;
        text_answers: TypedAnswer[] | null;
      }
    | undefined;
  if (!row) return { answered: 0, correctCount: null, optionCounts: null, textAnswers: null };

  return {
    answered: row.answered ?? 0,
    correctCount: row.correct_count,
    optionCounts: row.option_counts,
    textAnswers: row.text_answers ?? null,
  };
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

/**
 * Keeps the host's answer tally current while a question is open.
 *
 * The answers table is no longer readable from the browser, so this listens on
 * players instead — scoring an answer updates the answering player's row, so
 * every answer shows up here. A room answering at once would otherwise mean
 * one re-count per player, so events are coalesced into at most one request
 * every 400ms.
 */
export function subscribeToAnswerTally(
  gameId: string,
  questionIndex: number,
  hostId: string | null,
  callback: (tally: AnswerTally) => void
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const fetchTally = async () => {
    try {
      const tally = await getAnswerTally(gameId, questionIndex, hostId);
      if (!stopped) callback(tally);
    } catch (e) {
      console.error("Could not load the answer tally", e);
    }
  };

  const schedule = () => {
    if (stopped || timer) return;
    timer = setTimeout(() => { timer = null; void fetchTally(); }, 400);
  };

  const channel = supabase
    .channel(`tally:${gameId}:${questionIndex}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "players", filter: `game_id=eq.${gameId}` },
      schedule
    )
    .subscribe();

  void fetchTally();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    void supabase.removeChannel(channel);
  };
}
