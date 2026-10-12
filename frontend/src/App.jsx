import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./Layout.jsx";
import PetsPage from "./PetsPage.jsx";
import FeedingPage from "./FeedingPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<PetsPage />} />
        <Route path="feeding" element={<FeedingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
