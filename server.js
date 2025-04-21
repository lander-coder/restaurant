const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// --- In-Memory Data Storage ---
let tables = [
  { id: 1, capacity: 4, isReserved: false },
  { id: 2, capacity: 4, isReserved: false },
  { id: 3, capacity: 6, isReserved: false },
  { id: 4, capacity: 2, isReserved: false },
  { id: 5, capacity: 8, isReserved: false },
];

let reservations = [];
let nextReservationId = 1;

// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Log incoming requests (optional for debugging)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// --- Input Validation Middleware ---
const validateReservationInput = (req, res, next) => {
  const { tableId, customerName, guests, time } = req.body;

  if (!tableId || !customerName || !guests || !time) {
    return res.status(400).json({ message: "Missing required reservation details." });
  }

  if (typeof guests !== "number" || guests <= 0) {
    return res.status(400).json({ message: "Guest count must be a positive number." });
  }

  next();
};

// --- API Routes ---

// GET available tables
app.get("/api/tables", (req, res) => {
  const availableTables = tables.filter((t) => !t.isReserved);
  res.json(availableTables);
});

// POST create reservation
app.post("/api/reserve", validateReservationInput, (req, res) => {
  const { tableId, customerName, guests, time } = req.body;
  const table = tables.find((t) => t.id === parseInt(tableId));

  if (!table) {
    return res.status(404).json({ message: `Table ${tableId} not found.` });
  }

  if (table.isReserved) {
    return res.status(400).json({ message: `Table ${table.id} is already reserved.` });
  }

  if (table.capacity < guests) {
    return res.status(400).json({
      message: `Table ${table.id} only has capacity for ${table.capacity} guests. Cannot accommodate ${guests} guests.`,
    });
  }

  table.isReserved = true;
  const newReservation = {
    id: nextReservationId++,
    tableId: table.id,
    customerName,
    guests,
    time,
  };
  reservations.push(newReservation);

  console.log("Reservation successful:", newReservation);
  res.status(201).json({
    message: `Table ${table.id} reserved for ${customerName} (${guests} guests) at ${time}`,
    reservation: newReservation,
  });
});

// GET all reservations
app.get("/api/reservations", (req, res) => {
  res.json(reservations);
});

// PUT update a reservation
app.put("/api/update/:id", (req, res) => {
  const reservationId = parseInt(req.params.id);
  const { customerName, guests, time } = req.body;

  const index = reservations.findIndex((r) => r.id === reservationId);
  if (index === -1) {
    return res.status(404).json({ message: "Reservation not found." });
  }

  const reservation = reservations[index];
  const table = tables.find((t) => t.id === reservation.tableId);

  if (guests !== undefined) {
    if (typeof guests !== "number" || guests <= 0) {
      return res.status(400).json({ message: "Guest count must be a positive number." });
    }

    if (table && guests > table.capacity) {
      return res.status(400).json({
        message: `Table ${table.id} only has capacity for ${table.capacity} guests. Cannot update to ${guests} guests.`,
      });
    }

    reservation.guests = guests;
  }

  if (customerName !== undefined) {
    reservation.customerName = customerName;
  }

  if (time !== undefined) {
    reservation.time = time;
  }

  console.log("Reservation updated:", reservation);
  res.json({
    message: `Reservation ${reservationId} updated successfully.`,
    reservation,
  });
});

// DELETE cancel a reservation
app.delete("/api/cancel/:id", (req, res) => {
  const reservationId = parseInt(req.params.id);
  const index = reservations.findIndex((r) => r.id === reservationId);

  if (index === -1) {
    return res.status(404).json({ message: "Reservation not found." });
  }

  const reservation = reservations[index];
  const table = tables.find((t) => t.id === reservation.tableId);
  if (table) table.isReserved = false;

  reservations.splice(index, 1);
  console.log(`Reservation ${reservationId} canceled.`);
  res.json({ message: `Reservation ${reservationId} canceled successfully.` });
});

// --- Catch-all Route (for client-side routing) ---
// Matches everything except routes starting with /api
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});