import { useState } from "react";
import HomeMaintenanceTable from "../home-maintenance.jsx";
import InventoryPage from "../inventory-page.jsx";
import { loadInventory, saveInventory } from "../lib/inventory.js";

export default function App() {
  const [page, setPage] = useState("registry");
  const [inventory, setInventory] = useState(loadInventory);

  function handleInventoryChange(next) {
    setInventory(next);
    saveInventory(next);
  }

  if (page === "inventory") {
    return (
      <InventoryPage
        inventory={inventory}
        onInventoryChange={handleInventoryChange}
        onNavigate={() => setPage("registry")}
      />
    );
  }

  return (
    <HomeMaintenanceTable
      inventory={inventory}
      onInventoryChange={handleInventoryChange}
      onNavigate={() => setPage("inventory")}
    />
  );
}
