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

