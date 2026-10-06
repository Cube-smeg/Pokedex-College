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

function showMessage(message) {
    document.getElementById("search-message").textContent = message;
}

function displayPokemon(data) {
    document.querySelector(".pokemon-name").textContent = data.name.toUpperCase();
    document.querySelector(".pokemon-id").textContent = data.id;
    document.querySelector(".pokemon-types").textContent = data.types
        .map(({ type }) => type.name)
        .join(", ");

    if (data.sprites.front_default) {
        document.querySelector(".pokemon-image").src = data.sprites.front_default;
    }
    document.querySelector(".pokemon-image").alt = data.name;

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
            document.querySelector(selector).textContent = stat.base_stat;
        }
    }
}

async function loadPokemon(url) {
    showMessage("Loading...");
    try {
        displayPokemon(await fetchData(url));
        showMessage("");
    } catch (error) {
        showMessage(error.message);
    }
}

document.getElementById("pokemon-search-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const pokemonName = document.getElementById("pokemon-search").value.trim().toLowerCase();
    if (!pokemonName) {
        showMessage("Enter a Pokemon name to search.");
        return;
    }
    loadPokemon(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(pokemonName)}`);
});

document.getElementById("randomize-button")?.addEventListener("click", () => {
    const randomId = Math.floor(Math.random() * 898) + 1;
    loadPokemon(`https://pokeapi.co/api/v2/pokemon/${randomId}`);
});
