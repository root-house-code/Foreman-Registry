import { useState } from "react";
import HomeMaintenanceTable from "../home-maintenance.jsx";
import InventoryPage from "../inventory-page.jsx";
import BoardPage from "../board-page.jsx";
import ProjectsPage from "../projects-page.jsx";
import DashboardPage from "../dashboard-page.jsx";
import GuidePage from "../guide-page.jsx";
import ChoresPage from "../chores-page.jsx";
import CalendarPage from "../calendar-page.jsx";
import PreferencesPage from "../preferences-page.jsx";
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [navState, setNavState] = useState(null);

  const navigate = (p, state = null) => { setPage(p); setNavState(state); };

  if (page === "inventory") return <InventoryPage navigate={navigate} navState={navState} />;
  if (page === "dashboard") return <DashboardPage navigate={navigate} />;
  if (page === "board")     return <BoardPage navigate={navigate} />;
  if (page === "projects")  return <ProjectsPage navigate={navigate} />;
  if (page === "guide")     return <GuidePage navigate={navigate} />;
  if (page === "chores")    return <ChoresPage navigate={navigate} navState={navState} />;
  if (page === "calendar")  return <CalendarPage navigate={navigate} />;
  if (page === "preferences") return <PreferencesPage navigate={navigate} />;
  return <HomeMaintenanceTable navigate={navigate} navState={navState} />;
}
