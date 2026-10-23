// Fetch Pokemon data from the PokeAPI
async function fetchData(url) {
    const response = await fetch(url);
    if (!response.ok) {
        if (response.status === 404) {
            throw new Error("Pokemon not found. Check the spelling and try again.");
        }
        throw new Error(`Pokemon lookup failed (HTTP ${response.status}).`);
    }
    return response.json();
}

function showMessage(element, message) {
    element.textContent = message;
}

// Keep API data with each card.
const pokemonDetails = new WeakMap();

// Logout functionality
const logoutButton = document.getElementById("logout");
logoutButton?.addEventListener("click", () => {
    window.location.href = "/logout";
});

// Display Pokemon data in the specified container

async function displayPokemon(data, container) {
    const nameElements = container.querySelectorAll(".pokemon-name");
    const idElements = container.querySelectorAll(".pokemon-id");
    const typeElements = container.querySelectorAll(".pokemon-types");
    const imageElements = container.querySelectorAll(".pokemon-image");

    const response = await fetch(
        `/get_winsandlosses?pokemon_name=${encodeURIComponent(data.name)}`
    );
    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }

    const { wins, losses } = await response.json();
    const games = wins + losses;
    const winRate = games === 0 ? 0 : (wins / games) * 100;
    container.querySelector(".Strengths").textContent = `${winRate.toFixed(1)}%`;
    container.querySelector(".Weaknesses").textContent = games;

    nameElements.forEach((element) => {
        element.textContent = data.name.toUpperCase();
    });
    idElements.forEach((element) => {
        element.textContent = data.id;
    });
    typeElements.forEach((element) => {
        element.textContent = data.types
            .map(({ type }) => type.name)
            .join(", ");
    });

    imageElements.forEach((element) => {
        if (data.sprites.front_default) {
            element.src = data.sprites.front_default;
        }
        element.alt = data.name;
    });

    const statElements = {
        hp: ".health",
        attack: ".attack",
        defense: ".defence",
        "special-attack": ".spec-atk",
        "special-defense": ".spec-def",
        speed: ".speed",
    };

    for (const stat of data.stats) {
        const selector = statElements[stat.stat.name];
        if (selector) {
            container.querySelectorAll(selector).forEach((element) => {
                element.textContent = stat.base_stat;
            });
        }
    }

    pokemonDetails.set(container, data);
}

// Load Pokemon data and handle errors

async function loadPokemon(url, container, message) {
    showMessage(message, "Loading...");

    try {
        await displayPokemon(await fetchData(url), container);
        showMessage(message, "");
    } catch (error) {
        showMessage(message, error.message);
    }
}

// Comparison functionality

const originalBox = document.getElementById("compare-box");
const comparisonBox = document.getElementById("comparison-box");
const leftSearch = document.getElementById("left-search");
const rightSearch = document.getElementById("right-search");
const compareButton = document.getElementById("compare-button");

compareButton?.addEventListener("click", () => {
    if (!originalBox || !comparisonBox || !leftSearch || !rightSearch) {
        return;
    }
    originalBox.classList.toggle("moved");
    comparisonBox.classList.toggle("is-visible");
    comparisonBox.classList.toggle("moved-right");
    leftSearch.classList.toggle("moved-left");
    rightSearch.classList.toggle("is-visible");
    rightSearch.classList.toggle("moved-right");
});

// Search functionality

function registerSearch(formId, inputId, messageId, container) {
    const form = document.getElementById(formId);
    const input = document.getElementById(inputId);
    const message = document.getElementById(messageId);

    form?.addEventListener("submit", (event) => {
        event.preventDefault();
        const pokemonName = input.value.trim().toLowerCase();
        if (!pokemonName) {
            showMessage(message, "Enter a Pokemon name to search.");
            return;
        }

        loadPokemon(
            `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(pokemonName)}`,
            container,
            message
        );
    });
}

// Register search forms for both original and comparison boxes
 
registerSearch(
    "pokemon-search-form-left",
    "pokemon-search-left",
    "search-message-left",
    originalBox
);
registerSearch(
    "pokemon-search-form-right",
    "pokemon-search-right",
    "search-message-right",
    comparisonBox
);


// Randomize functionality

const leftRandomizeButton = document.getElementById("randomize-button-left");
leftRandomizeButton?.addEventListener("click", () => {
    const randomId = Math.floor(Math.random() * 898) + 1;
    loadPokemon(
        `https://pokeapi.co/api/v2/pokemon/${randomId}`,
        originalBox,
        document.getElementById("search-message-left")
    );
});

const rightRandomizeButton = document.getElementById("randomize-button");
rightRandomizeButton?.addEventListener("click", () => {
    const randomId = Math.floor(Math.random() * 898) + 1;
    loadPokemon(
        `https://pokeapi.co/api/v2/pokemon/${randomId}`,
        comparisonBox,
        document.getElementById("search-message-right")
    );
});



const battleButton = document.getElementById("battle-button");
battleButton?.addEventListener("click", async () => {
    const leftPokemonName = document.querySelector("#compare-box .pokemon-name")?.textContent.trim().toLowerCase();
    const rightPokemonName = document.querySelector("#comparison-box .pokemon-name")?.textContent.trim().toLowerCase();

    if (!leftPokemonName || !rightPokemonName
        || leftPokemonName === "pokemon name" || rightPokemonName === "pokemon name") {
        alert("Please select two Pokemon to battle.");
        return;
    }

    const leftPokemonUrl = `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(leftPokemonName)}`;
    const rightPokemonUrl = `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(rightPokemonName)}`;

    const leftpokemonimage = document.getElementById("left-pokemon-image");
    const rightpokemonimage = document.getElementById("right-pokemon-image");
    const explosionContainer = document.getElementById("explosion-container");
    if (!leftpokemonimage || !rightpokemonimage || !explosionContainer) {
        alert("Error: Pokemon images not found.");
        return;
    }
    
    //moving images
    leftpokemonimage.classList.toggle("battle-move-left");
    rightpokemonimage.classList.toggle("battle-move-right");

    // explosion effect  
    explosionContainer.classList.add("create-explosion");

    // check who wins and show the user, maybe make it add to database to show winrates later on
    try {
        const [leftData, rightData] = await Promise.all([
            fetchData(leftPokemonUrl),
            fetchData(rightPokemonUrl),
        ]);
        const leftTotalStats = leftData.stats.reduce((sum, stat) => sum + stat.base_stat, 0);
        const rightTotalStats = rightData.stats.reduce((sum, stat) => sum + stat.base_stat, 0);

        let resultMessage;
        let winnerName;
        let loserName;
        if (leftTotalStats > rightTotalStats) {
            resultMessage = `${leftData.name.toUpperCase()} wins!`;
            winnerName = leftPokemonName;
            loserName = rightPokemonName;
        } else if (leftTotalStats < rightTotalStats) {
            resultMessage = `${rightData.name.toUpperCase()} wins!`;
            winnerName = rightPokemonName;
            loserName = leftPokemonName;
        } else {
            resultMessage = "It's a tie!";
        }

        if (winnerName && loserName) {
            const responses = await Promise.all([
                fetch("/add_win", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ pokemon_name: winnerName }),
                }),
                fetch("/add_loss", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ pokemon_name: loserName }),
                }),
            ]);
            if (responses.some((response) => !response.ok)) {
                throw new Error("Could not save the battle result.");
            }

            await Promise.all([
                displayPokemon(leftData, originalBox),
                displayPokemon(rightData, comparisonBox),
            ]);
        }

        //move boxes back and remove explosion
        leftpokemonimage.classList.toggle("battle-move-left");
        rightpokemonimage.classList.toggle("battle-move-right");
        explosionContainer.classList.remove("create-explosion");



        alert(resultMessage);
    } catch (error) {
        alert(`Battle failed: ${error.message}`);
    }
});

// Team builder selection

document.querySelectorAll(".team-pokemon-search").forEach((form) => {
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const input = form.querySelector("input");
        const slot = form.closest(".team-slot");
        const message = slot.querySelector(".team-search-message");
        const pokemonName = input.value.trim().toLowerCase();

        if (!pokemonName) {
            showMessage(message, "Enter a Pokemon name to search.");
            return;
        }

        showMessage(message, "Searching...");
        try {
            const data = await fetchData(
                `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(pokemonName)}`
            );
            const image = slot.querySelector(".team-pokemon-image");
            const name = slot.querySelector(".pokemon-name");
            const artwork = data.sprites.other?.["official-artwork"]?.front_default
                || data.sprites.front_default;

            name.textContent = data.name.toUpperCase();
            if (artwork) {
                image.src = artwork;
            }
            image.alt = data.name;
            showMessage(message, "");
        } catch (error) {
            showMessage(message, error.message);
        }
    });
});


const saveTeamButton = document.getElementById("finalize-team-button");
saveTeamButton?.addEventListener("click", async () => {
    const teamData = { pokemon: [] };
    document.querySelectorAll(".team-slot").forEach((slot) => {
        const name = slot.querySelector(".pokemon-name").textContent.trim().toLowerCase();
        if (name && name !== "—") {
            teamData.pokemon.push(name);
        }
    });

    if (teamData.pokemon.length !== 6) {
        alert("Please select 6 Pokemon for your team.");
        return;
    };

    if (teamData.pokemon.length !== new Set(teamData.pokemon).size) {
        alert("Duplicate Pokemon are not allowed in the team.");
        return;
    }

    //Save the pokemon

    try {
        const response = await fetch("/save_team", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(teamData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Failed to save team.");
        }

        alert("Team saved successfully!");
    } catch (error) {
        alert(`Error saving team: ${error.message}`);
    }
});


// Load a saved team when the button is pressed.
const loadTeamButton = document.getElementById("load_team_button");
loadTeamButton?.addEventListener("click", () => {
    loadTeam();
});

async function loadTeam() {
    try {
        // Fetch the saved team data from the server
        const response = await fetch("/load_team", {
            method: "GET",
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Failed to load team.");
        }

        const teamData = await response.json();
        if (!teamData || !Array.isArray(teamData.pokemon)) {
            throw new Error("The server returned an invalid team.");
        }

        const slots = document.querySelectorAll(".team-slot");

        teamData.pokemon.forEach((pokemonName, index) => {
            if (index < slots.length) {
                const slot = slots[index];
                const image = slot.querySelector(".team-pokemon-image");
                const name = slot.querySelector(".pokemon-name");
                if (!image || !name) {
                    console.error(`Team slot ${index + 1} is missing its image or name element.`);
                    return;
                }
                const pokemonUrl = `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(pokemonName)}`;

                fetchData(pokemonUrl)
                    .then((data) => {
                        const artwork = data.sprites.other?.["official-artwork"]?.front_default
                            || data.sprites.front_default;
                        name.textContent = data.name.toUpperCase();
                        if (artwork) {
                            image.src = artwork;
                        }
                        image.alt = data.name;
                    })
                    .catch((error) => {
                        console.error(`Error loading Pokemon ${pokemonName}: ${error.message}`);
                    });
            }
        });
    } catch (error) {
        console.error(`Error loading team: ${error.message}`);
        alert(`Error loading team: ${error.message}`);
    }
}


const pokemonModal = document.getElementById("pokemon-modal");
const pokemonModalTitle = document.getElementById("pokemon-modal-title");
const pokemonModalAbilities = document.getElementById("pokemon-modal-abilities");
const pokemonModalMoves = document.getElementById("pokemon-modal-moves");

// Add detail items to the pop up thing.
function populateDetailsList(list, items, remainingCount = 0) {
    list.replaceChildren();
    items.forEach((item) => {
        const entry = document.createElement("li");
        entry.textContent = item;
        list.append(entry);
    });

    if (remainingCount > 0) {
        const entry = document.createElement("li");
        entry.textContent = `And ${remainingCount} more`;
        entry.className = "pokemon-modal-more";
        list.append(entry);
    }
}

document.querySelectorAll(".pokemon-details-button").forEach((button) => {
    button.addEventListener("click", () => {
        const container = button.closest(".pokemon-container");
        const data = container && pokemonDetails.get(container);
        if (!pokemonModal || !pokemonModalTitle || !pokemonModalAbilities || !pokemonModalMoves) {
            return;
        }
        if (!data) {
            alert("Search for a Pokémon first to see its details.");
            return;
        }
        // i love ai 
        pokemonModalTitle.textContent = `${data.name.toUpperCase()} details`;
        populateDetailsList(
            pokemonModalAbilities,
            data.abilities.map(({ ability }) => ability.name.replaceAll("-", " ")),
        );
        populateDetailsList(
            pokemonModalMoves,
            data.moves.slice(0, 12).map(({ move }) => move.name.replaceAll("-", " ")),
            Math.max(0, data.moves.length - 12),
        );
        pokemonModal.showModal();
    });
});

pokemonModal?.querySelector(".pokemon-modal-close")?.addEventListener("click", () => {
    pokemonModal.close();
});

pokemonModal?.addEventListener("click", (event) => {
    if (event.target === pokemonModal) {
        pokemonModal.close();
    }
});