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

// Display Pokemon data in the specified container

function displayPokemon(data, container) {
    const nameElements = container.querySelectorAll(".pokemon-name");
    const idElements = container.querySelectorAll(".pokemon-id");
    const typeElements = container.querySelectorAll(".pokemon-types");
    const imageElements = container.querySelectorAll(".pokemon-image");

    const mariadb = require('./db.js');

    //get winrate and games played from the database
    mariadb.pool.getConnection().then((conn) => {
        conn.query("SELECT winrate, games FROM pokemon_stats WHERE name = ?", [data.name.toLowerCase()]).then((rows) => {
            if (rows.length > 0) {
                const { winrate, games } = rows[0];
                const winrateElements = container.querySelectorAll(".Strengths");
                const gamesElements = container.querySelectorAll(".Weaknesses");

                winrateElements.forEach((element) => {
                    element.textContent = winrate;
                });
                gamesElements.forEach((element) => {
                    element.textContent = games;
                });
            }
        });
        conn.release();
    });

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
}

// Load Pokemon data and handle errors

async function loadPokemon(url, container, message) {
    showMessage(message, "Loading...");

    try {
        displayPokemon(await fetchData(url), container);
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

compareButton.addEventListener("click", () => {
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
battleButton?.addEventListener("click", () => {
    const leftPokemonName = document.querySelector("#compare-box .pokemon-name").textContent.toLowerCase();
    const rightPokemonName = document.querySelector("#comparison-box .pokemon-name").textContent.toLowerCase();

    if (!leftPokemonName || !rightPokemonName) {
        alert("Please select two Pokemon to battle.");
        return;
    }

    const leftPokemonUrl = `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(leftPokemonName)}`;
    const rightPokemonUrl = `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(rightPokemonName)}`;

    const leftpokemonimage = document.getElementById("left-pokemon-image");
    const rightpokemonimage = document.getElementById("right-pokemon-image");
    const explosionContainer = document.getElementById("explosion-container");
    if (!leftpokemonimage || !rightpokemonimage) {
        alert("Error: Pokemon images not found.");
        return;
    }
    
    //moving images
    leftpokemonimage.classList.toggle("battle-move-left");
    rightpokemonimage.classList.toggle("battle-move-right");

    // explosion effect  
    explosionContainer.classList.add("create-explosion");

    // check who wins and show the user, maybe make it add to database to show winrates later on
    Promise.all([fetchData(leftPokemonUrl), fetchData(rightPokemonUrl)])
        .then(([leftData, rightData]) => {
            const leftTotalStats = leftData.stats.reduce((sum, stat) => sum + stat.base_stat, 0);
            const rightTotalStats = rightData.stats.reduce((sum, stat) => sum + stat.base_stat, 0);

            let resultMessage;
            if (leftTotalStats > rightTotalStats) {
                resultMessage = `${leftData.name.toUpperCase()} wins!`;
            } else if (leftTotalStats < rightTotalStats) {
                resultMessage = `${rightData.name.toUpperCase()} wins!`;
            } else {
                resultMessage = "It's a tie!";
            }

            alert(resultMessage);
        })
        .catch((error) => {
            alert(`Error fetching Pokemon data: ${error.message}`);
        });




    
});