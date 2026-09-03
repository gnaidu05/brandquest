import { Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import Landing from "./pages/Landing";
import CreateQuiz from "./pages/CreateQuiz";
import AdminDashboard from "./pages/AdminDashboard";
import JoinGame from "./pages/JoinGame";
import Lobby from "./pages/Lobby";
import PlayGame from "./pages/PlayGame";
import AdminGame from "./pages/AdminGame";
import Results from "./pages/Results";

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/create" element={<CreateQuiz />} />
        <Route path="/join" element={<JoinGame />} />
        <Route path="/game/:gameId" element={<Lobby />} />
        <Route path="/game/:gameId/play" element={<PlayGame />} />
        <Route path="/game/:gameId/host" element={<AdminGame />} />
        <Route path="/game/:gameId/results" element={<Results />} />
      </Routes>
    </ErrorBoundary>
  );
}
