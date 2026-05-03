import { useState } from "react";
import HomeMaintenanceTable from "../home-maintenance.jsx";
import InventoryPage from "../inventory-page.jsx";
import BoardPage from "../board-page.jsx";
import ProjectsPage from "../projects-page.jsx";
import { loadInventory, saveInventory } from "../lib/inventory.js";

export default function App() {
  const [page, setPage] = useState("maintenance");
  const [inventory, setInventory] = useState(loadInventory);

  function handleInventoryChange(next) {
    setInventory(next);
    saveInventory(next);
  }

  const navigate = (p) => setPage(p);

  if (page === "inventory") {
    return (
      <InventoryPage
        inventory={inventory}
        onInventoryChange={handleInventoryChange}
        navigate={navigate}
      />
    );
  }

  if (page === "board") {
    return <BoardPage navigate={navigate} />;
  }

  if (page === "projects") {
    return <ProjectsPage navigate={navigate} />;
  }

  return (
    <HomeMaintenanceTable
      inventory={inventory}
      onInventoryChange={handleInventoryChange}
      navigate={navigate}
    />
  );
}
