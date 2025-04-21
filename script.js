document.addEventListener("DOMContentLoaded", () => {
    const availableTablesList = document.querySelector("#available-tables ul");
    const currentReservationsList = document.querySelector("#current-reservations ul");
    const reservationForm = document.getElementById("reservation-form");
    const tableSelect = document.getElementById("tableSelect");
    const messageDiv = document.getElementById("message");

    const API_BASE_URL = "/api"; // Use relative path

    // --- Helper Functions ---
    const showMessage = (msg, isError = false) => {
        messageDiv.textContent = msg;
        messageDiv.className = isError ? "error" : "success"; // Apply CSS class
        // Clear message after some time
        setTimeout(() => {
            messageDiv.textContent = "";
            messageDiv.className = "";
        }, 5000); // Clear after 5 seconds
    };

    // --- Fetch and Display Functions ---

    // Fetch and display available tables
    const fetchAndDisplayTables = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/tables`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const tables = await response.json();

            availableTablesList.innerHTML = ""; // Clear existing list
            tableSelect.innerHTML = '<option value="">-- Select a Table --</option>'; // Clear and add default option

            if (tables.length === 0) {
                availableTablesList.innerHTML = "<li>No tables available currently.</li>";
            } else {
                tables.forEach((table) => {
                    // Add to the list display
                    const listItem = document.createElement("li");
                    listItem.textContent = `Table ${table.id} (Capacity: ${table.capacity})`;
                    availableTablesList.appendChild(listItem);

                    // Add to the select dropdown
                    const option = document.createElement("option");
                    option.value = table.id;
                    option.textContent = `Table ${table.id} (Capacity: ${table.capacity})`;
                    tableSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error("Error fetching available tables:", error);
            availableTablesList.innerHTML = "<li>Error loading tables. Please try again later.</li>";
            showMessage("Could not load available tables.", true);
        }
    };

    // Fetch and display current reservations
    const fetchAndDisplayReservations = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/reservations`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const reservations = await response.json();

            currentReservationsList.innerHTML = ""; // Clear existing list

            if (reservations.length === 0) {
                currentReservationsList.innerHTML = "<li>No reservations yet.</li>";
            } else {
                reservations.forEach((res) => {
                    const listItem = document.createElement("li");
                    listItem.innerHTML = `
                        <span>
                            Table ${res.tableId}: ${res.customerName} (${res.guests} guests) at ${res.time} (ID: ${res.id})
                        </span>
                        <button class="cancel-btn" data-id="${res.id}">Cancel</button>
                    `;
                    currentReservationsList.appendChild(listItem);
                });
            }
        } catch (error) {
            console.error("Error fetching reservations:", error);
            currentReservationsList.innerHTML = "<li>Error loading reservations. Please try again later.</li>";
            showMessage("Could not load reservations.", true);
        }
    };

    // --- Event Handlers ---

    // Handle reservation form submission
    reservationForm.addEventListener("submit", async (event) => {
        event.preventDefault(); // Prevent default form submission

        const customerName = document.getElementById("customerName").value;
        const guests = parseInt(document.getElementById("guestCount").value);
        const time = document.getElementById("reservationTime").value;
        const tableId = tableSelect.value;

        // Basic frontend validation
        if (!customerName || !guests || !time || !tableId) {
            showMessage("Please fill in all fields and select a table.", true);
            return;
        }

        const reservationData = {
            customerName,
            guests,
            time,
            tableId: parseInt(tableId),
        };

        try {
            const response = await fetch(`${API_BASE_URL}/reserve`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(reservationData),
            });

            const result = await response.json(); // Always try to parse JSON

            if (!response.ok) {
                // Use message from backend if available, otherwise generic error
                const errorMessage = result.message || `Error: ${response.statusText}`;
                // Specific error message check based on prompt examples
                if (errorMessage.includes("capacity") || errorMessage.includes("accommodate")) {
                    showMessage(`No available tables for ${guests} guests.`, true);
                } else if (errorMessage.includes("required")) {
                    showMessage("Name and guest count required.", true);
                } else {
                    showMessage(errorMessage, true);
                }
                throw new Error(errorMessage); // Throw error to stop further processing
            }

            // Success
            showMessage(result.message || "Reservation successful!"); // Use backend success message
            reservationForm.reset(); // Clear the form
            // Refresh both lists
            fetchAndDisplayTables();
            fetchAndDisplayReservations();
        } catch (error) {
            console.error("Error making reservation:", error);
            if (!messageDiv.textContent) {
                showMessage("Failed to make reservation. Please try again.", true);
            }
        }
    });

    // Handle cancellation button clicks (using event delegation)
    currentReservationsList.addEventListener("click", async (event) => {
        if (event.target.classList.contains("cancel-btn")) {
            const reservationId = event.target.getAttribute("data-id");
            if (!reservationId) return;

            // Optional: Confirm before deleting
            if (!confirm(`Are you sure you want to cancel reservation ${reservationId}?`)) {
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/cancel/${reservationId}`, {
                    method: "DELETE",
                });

                const result = await response.json(); // Get response message

                if (!response.ok) {
                    throw new Error(result.message || `HTTP error! status: ${response.status}`);
                }

                showMessage(result.message || "Reservation canceled successfully!");
                // Refresh both lists
                fetchAndDisplayTables();
                fetchAndDisplayReservations();
            } catch (error) {
                console.error("Error canceling reservation:", error);
                showMessage(`Failed to cancel reservation: ${error.message}`, true);
            }
        }
    });

    // --- Initial Load ---
    fetchAndDisplayTables();
    fetchAndDisplayReservations();
});