const game = document.getElementById("game");
const sun = document.getElementById("sun");
const plant = document.getElementById("plant");
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
const obstacles = Array.from(game.querySelectorAll(".tree, .pond, .bench, #plant"));
const speed = 155;
let selectedActor = 0;
let hasSunlight = false;
let plantBloomed = false;
let previousTime = 0;

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
        if (!event.repeat) giveSunlight();
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
document.getElementById("giveSunlightButton").addEventListener("click", giveSunlight);

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
        message.textContent = "You collected sunlight! Find your plant.";
    }
}

function giveSunlight() {
    if (plantBloomed) {
        message.textContent = "Your flower is already blooming!";
        return;
    }

    if (!hasSunlight) {
        message.textContent = "Find the sun first!";
        return;
    }

    if (!isNear(actors[0], plant, 35)) {
        message.textContent = "Walk Likhi closer to your plant!";
        return;
    }

    plant.textContent = "🌻";
    plant.setAttribute("aria-label", "A blooming sunflower");
    plantBloomed = true;
    plantCount.textContent = "1";
    sunCount.textContent = "0";
    hasSunlight = false;
    message.textContent = "You helped your little plant bloom!";
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
