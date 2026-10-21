import { Route, Routes } from "react-router-dom";
import Layout from "./Layout.jsx";
import Dashboard from "./Dashboard.jsx";
import PetsPage from "./PetsPage.jsx";
import PetPage from "./PetPage.jsx";
import FeedingPage from "./FeedingPage.jsx";
import NotFound from "./NotFound.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="pets" element={<PetsPage />} />
        <Route path="pets/:id" element={<PetPage />} />
        <Route path="feeding" element={<FeedingPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
