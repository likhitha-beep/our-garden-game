const game = document.getElementById("game");
const sun = document.getElementById("sun");
const plants = Array.from(game.querySelectorAll("[data-plant]"));
const bench = document.getElementById("bench");
const picnicTable = document.getElementById("picnicTable");
const message = document.getElementById("message");
const sunCount = document.getElementById("sunCount");
const plantCount = document.getElementById("plantCount");

const actors = [
    {
        element: document.getElementById("likhi"),
        keys: {
            up: ["ArrowUp", "KeyW"],
            down: ["ArrowDown", "KeyS"],
            left: ["ArrowLeft", "KeyA"],
            right: ["ArrowRight", "KeyD"]
        }
    },
    {
        element: document.getElementById("toxii"),
        keys: {
            up: ["KeyI"],
            down: ["KeyK"],
            left: ["KeyJ"],
            right: ["KeyL"]
        }
    },
    {
        element: document.getElementById("snoopi"),
        keys: {
            up: ["KeyT"],
            down: ["KeyG"],
            left: ["KeyF"],
            right: ["KeyH"]
        }
    },
    {
        element: document.getElementById("milky"),
        keys: {
            up: ["Numpad8"],
            down: ["Numpad5"],
            left: ["Numpad4"],
            right: ["Numpad6"]
        }
    }
];

const pressedKeys = new Set();
const obstacles = Array.from(
    game.querySelectorAll(".tree, .pond, .bench, .picnic-table, .plant")
);
const speed = 155;
let selectedActor = 0;
let hasSunlight = false;
let bloomedPlants = 0;
let previousTime = 0;
const actionTimers = new Set();

actors.forEach((actor) => {
    actor.x = actor.element.offsetLeft;
    actor.y = actor.element.offsetTop;
});

function isMovementKey(code) {
    return actors.some((actor) =>
        Object.values(actor.keys).some((codes) => codes.includes(code))
    );
}

document.addEventListener("keydown", (event) => {
    if (isMovementKey(event.code)) {
        event.preventDefault();
        pressedKeys.add(event.code);
    }

    if (event.code === "KeyE") {
        event.preventDefault();
        if (!event.repeat) doAction("interact");
    }

    if (event.code === "KeyQ" || event.code === "KeyC") {
        event.preventDefault();
        if (!event.repeat) doAction(event.code === "KeyQ" ? "hug" : "kiss");
    }
});

const touchKeys = new Map();
const characterButtons = Array.from(document.querySelectorAll("[data-select-actor]"));

document.addEventListener("keyup", (event) => {
    pressedKeys.delete(event.code);
});

function releaseTouchDirection(event) {
    const code = touchKeys.get(event.pointerId);
    if (code) {
        pressedKeys.delete(code);
        touchKeys.delete(event.pointerId);
    }
}

characterButtons.forEach((button) => {
    button.addEventListener("click", () => {
        selectedActor = actors.findIndex(
            (actor) => actor.element.id === button.dataset.selectActor
        );
        characterButtons.forEach((characterButton) => {
            characterButton.setAttribute(
                "aria-pressed",
                String(characterButton === button)
            );
        });
    });
});

document.querySelectorAll("[data-direction]").forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        const code = actors[selectedActor].keys[button.dataset.direction][0];
        touchKeys.set(event.pointerId, code);
        pressedKeys.add(code);
    });
});

document.addEventListener("pointerup", releaseTouchDirection);
document.addEventListener("pointercancel", releaseTouchDirection);
document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => doAction(button.dataset.action));
});

window.addEventListener("blur", () => {
    pressedKeys.clear();
    touchKeys.clear();
});

function isPressed(actor, direction) {
    return actor.keys[direction].some((code) => pressedKeys.has(code));
}

function getActorBox(actor, x = actor.x, y = actor.y) {
    return {
        left: x + 8,
        top: y + 10,
        right: x + 56,
        bottom: y + 74
    };
}

function getObstacleBox(element) {
    const gameRect = game.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    const left = rect.left - gameRect.left - game.clientLeft;
    const top = rect.top - gameRect.top - game.clientTop;
    return {
        left,
        top,
        right: left + rect.width,
        bottom: top + rect.height
    };
}

function overlaps(first, second) {
    return first.left < second.right &&
        first.right > second.left &&
        first.top < second.bottom &&
        first.bottom > second.top;
}

function overlapArea(first, second) {
    const width = Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left));
    const height = Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));
    return width * height;
}

function canMove(actor, x, y) {
    const currentBox = getActorBox(actor);
    const nextBox = getActorBox(actor, x, y);
    return !obstacles.some((obstacle) => {
        const obstacleBox = getObstacleBox(obstacle);
        const currentOverlap = overlapArea(currentBox, obstacleBox);
        const nextOverlap = overlapArea(nextBox, obstacleBox);
        return nextOverlap > 0 && nextOverlap >= currentOverlap;
    });
}

function isNear(actor, target, distance = 28) {
    const actorBox = getActorBox(actor);
    const targetBox = getObstacleBox(target);
    const gapX = Math.max(targetBox.left - actorBox.right, actorBox.left - targetBox.right, 0);
    const gapY = Math.max(targetBox.top - actorBox.bottom, actorBox.top - targetBox.bottom, 0);
    return Math.hypot(gapX, gapY) <= distance;
}

function collectSunlight() {
    if (!hasSunlight && isNear(actors[0], sun, 10)) {
        hasSunlight = true;
        sun.hidden = true;
        sunCount.textContent = "1";
        message.textContent = "You found sunlight! Give it to any little flower bed.";
    }
}

function bloomPlant(plantBed) {
    if (!hasSunlight) {
        message.textContent = "Find the sunlight first, then bring it to a flower bed.";
        return;
    }

    plantBed.textContent = ["🌷", "🌼", "🌸"][bloomedPlants];
    plantBed.classList.add("bloomed");
    plantBed.setAttribute("aria-label", "A blooming flower bed");
    bloomedPlants += 1;
    plantCount.textContent = String(bloomedPlants);
    sunCount.textContent = "0";
    hasSunlight = false;
    sun.hidden = false;
    message.textContent = bloomedPlants === plants.length
        ? "All three flower beds are blooming! Your garden is lovely!"
        : "A new flower bloomed! Collect more sunlight for the next one.";
}

function areLikhiAndToxiiNear(target, distance = 48) {
    return isNear(actors[0], target, distance) &&
        isNear(actors[1], target, distance);
}

function sitTogether() {
    if (!areLikhiAndToxiiNear(bench, 55)) {
        message.textContent = "Walk Likhi and Toxii close to the garden bench first.";
        return;
    }

    const benchBox = getObstacleBox(bench);
    [actors[0], actors[1]].forEach((actor, index) => {
        actor.element.classList.remove("walking");
        actor.element.classList.add("seated");
        actor.x = Math.min(
            benchBox.left + 5 + index * 52,
            game.clientWidth - actor.element.offsetWidth
        );
        actor.y = Math.max(0, benchBox.top - 37);
        actor.element.style.left = `${actor.x}px`;
        actor.element.style.top = `${actor.y}px`;
    });
    message.textContent = "Likhi and Toxii are sitting together on the bench.";
}

function eatTogether() {
    if (!areLikhiAndToxiiNear(picnicTable, 55)) {
        message.textContent = "Bring both Likhi and Toxii over to the picnic table.";
        return;
    }

    actors.slice(0, 2).forEach((actor) => {
        actor.element.classList.remove("seated");
        actor.element.classList.add("eating");
    });
    message.textContent = "They are sharing strawberries and cake at the picnic!";
    clearActionAfter(1400, "eating");
}

function shareAffection(action) {
    const likhi = actors[0];
    const toxii = actors[1];
    const distance = Math.hypot(
        likhi.x - toxii.x,
        likhi.y - toxii.y
    );

    if (distance > 92) {
        message.textContent = `Move Likhi and Toxii closer for a ${action}.`;
        return;
    }

    const className = action === "hug" ? "hugging" : "kissing";
    actors.slice(0, 2).forEach((actor) => {
        actor.element.classList.remove("seated");
        actor.element.classList.add(className);
    });
    message.textContent = action === "hug"
        ? "Likhi and Toxii share a warm hug. 💗"
        : "Likhi and Toxii share a sweet kiss. 💕";
    clearActionAfter(1400, className);
}

function clearActionAfter(duration, className) {
    const timer = window.setTimeout(() => {
        actors.slice(0, 2).forEach((actor) => {
            actor.element.classList.remove(className);
        });
        actionTimers.delete(timer);
    }, duration);
    actionTimers.add(timer);
}

function doAction(action) {
    if (action === "hug" || action === "kiss") {
        shareAffection(action);
        return;
    }

    if (action === "sit") {
        sitTogether();
        return;
    }

    if (action === "eat") {
        eatTogether();
        return;
    }

    const nearbyPlant = plants.find(
        (plantBed) => !plantBed.classList.contains("bloomed") &&
            isNear(actors[0], plantBed, 34)
    );

    if (nearbyPlant) {
        bloomPlant(nearbyPlant);
    } else if (isNear(actors[0], picnicTable, 40)) {
        eatTogether();
    } else if (isNear(actors[0], bench, 40)) {
        sitTogether();
    } else {
        message.textContent = hasSunlight
            ? "Take the sunlight to one of the three flower beds."
            : "Explore the garden and collect the sunlight!";
    }
}

function moveActor(actor, deltaTime) {
    let horizontal = Number(isPressed(actor, "right")) - Number(isPressed(actor, "left"));
    let vertical = Number(isPressed(actor, "down")) - Number(isPressed(actor, "up"));

    if (horizontal && vertical) {
        horizontal *= Math.SQRT1_2;
        vertical *= Math.SQRT1_2;
    }

    const distance = speed * deltaTime;
    const maxX = Math.max(0, game.clientWidth - actor.element.offsetWidth);
    const maxY = Math.max(0, game.clientHeight - actor.element.offsetHeight);
    const nextX = Math.max(0, Math.min(actor.x + horizontal * distance, maxX));
    const nextY = Math.max(0, Math.min(actor.y + vertical * distance, maxY));
    let moved = false;

    if (horizontal || vertical) {
        actor.element.classList.remove("seated");
    }

    if (nextX !== actor.x && canMove(actor, nextX, actor.y)) {
        actor.x = nextX;
        moved = true;
    }

    if (nextY !== actor.y && canMove(actor, actor.x, nextY)) {
        actor.y = nextY;
        moved = true;
    }

    actor.element.style.left = `${actor.x}px`;
    actor.element.style.top = `${actor.y}px`;
    actor.element.classList.toggle(
        "walking",
        moved && (horizontal !== 0 || vertical !== 0)
    );
}

function animate(time) {
    const deltaTime = previousTime
        ? Math.min((time - previousTime) / 1000, 0.05)
        : 0;
    previousTime = time;

    actors.forEach((actor) => moveActor(actor, deltaTime));
    collectSunlight();
    requestAnimationFrame(animate);
}

window.addEventListener("resize", () => {
    actors.forEach((actor) => {
        actor.x = Math.min(actor.x, Math.max(0, game.clientWidth - actor.element.offsetWidth));
        actor.y = Math.min(actor.y, Math.max(0, game.clientHeight - actor.element.offsetHeight));
        actor.element.style.left = `${actor.x}px`;
        actor.element.style.top = `${actor.y}px`;
    });
});

requestAnimationFrame(animate);
