import { useState } from "react";
import HomeMaintenanceTable from "../home-maintenance.jsx";
import InventoryPage from "../inventory-page.jsx";
import BoardPage from "../board-page.jsx";
import ProjectsPage from "../projects-page.jsx";
import DashboardPage from "../dashboard-page.jsx";
import GuidePage from "../guide-page.jsx";
import ChoresPage from "../chores-page.jsx";
export default function App() {
  const [page, setPage] = useState("dashboard");

  const navigate = (p) => setPage(p);

  if (page === "inventory") {
    return (
      <InventoryPage
        navigate={navigate}
      />
    );
  }

  if (page === "dashboard") {
    return <DashboardPage navigate={navigate} />;
  }

  if (page === "board") {
    return <BoardPage navigate={navigate} />;
  }

  if (page === "projects") {
    return <ProjectsPage navigate={navigate} />;
  }

  if (page === "guide") {
    return <GuidePage navigate={navigate} />;
  }

  if (page === "chores") {
    return <ChoresPage navigate={navigate} />;
  }

  return <HomeMaintenanceTable navigate={navigate} />;
}
