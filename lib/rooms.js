const KEY = "foreman-rooms";

/**
 * Room Shape:
 * {
 *   id: "room-uuid",                // unique identifier
 *   floorId: "f1",                  // floor this room belongs to
 *   label: "Kitchen",               // editable room name
 *   type: "room" | "utility" | "outdoor",  // room type
 *   points: [[x1, y1], [x2, y2], ...],    // polygon vertices (snap to 0.5-unit grid)
 *   itemIds: ["hvac::Furnace", ...]       // items placed in this room
 * }
 */

export function loadRooms() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return raw;
  } catch {
    return {};
  }
}

export function saveRooms(rooms) {
  localStorage.setItem(KEY, JSON.stringify(rooms));
}

/**
 * Get rooms for a specific floor
 */
export function getRoomsForFloor(floorId) {
  const rooms = loadRooms();
  return Object.values(rooms).filter((r) => r.floorId === floorId);
}

/**
 * Create a new room
 */
export function createRoom(floorId, label, type = "room", points = []) {
  const rooms = loadRooms();
  const id = `room-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  rooms[id] = {
    id,
    floorId,
    label,
    type,
    points: points || [],
    itemIds: [],
  };

  saveRooms(rooms);
  return rooms[id];
}

/**
 * Update a room
 */
export function updateRoom(roomId, updates) {
  const rooms = loadRooms();

  if (!rooms[roomId]) {
    throw new Error(`Room ${roomId} not found`);
  }

  rooms[roomId] = {
    ...rooms[roomId],
    ...updates,
    id: roomId,  // never allow id to change
  };

  saveRooms(rooms);
  return rooms[roomId];
}

/**
 * Delete a room
 */
export function deleteRoom(roomId) {
  const rooms = loadRooms();
  delete rooms[roomId];
  saveRooms(rooms);
}

/**
 * Add item to a room
 */
export function addItemToRoom(roomId, itemId) {
  const rooms = loadRooms();

  if (!rooms[roomId]) {
    throw new Error(`Room ${roomId} not found`);
  }

  if (!rooms[roomId].itemIds.includes(itemId)) {
    rooms[roomId].itemIds.push(itemId);
  }

  saveRooms(rooms);
}

/**
 * Remove item from a room
 */
export function removeItemFromRoom(roomId, itemId) {
  const rooms = loadRooms();

  if (!rooms[roomId]) {
    throw new Error(`Room ${roomId} not found`);
  }

  rooms[roomId].itemIds = rooms[roomId].itemIds.filter((id) => id !== itemId);
  saveRooms(rooms);
}

/**
 * Find which room an item is in (one-place-per-item invariant)
 */
export function findRoomForItem(itemId) {
  const rooms = loadRooms();
  return Object.values(rooms).find((r) => r.itemIds.includes(itemId)) || null;
}

/**
 * Check if an item is already placed somewhere
 */
export function isItemPlaced(itemId) {
  return findRoomForItem(itemId) !== null;
}
