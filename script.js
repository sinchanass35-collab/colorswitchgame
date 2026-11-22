
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreText = document.getElementById("score");
const bestText = document.getElementById("best");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const playButton = document.getElementById("playButton");

const colors = [
    "#ff267e",
    "#ffe600",
    "#00eaff",
    "#a000ff"
];

let width, height;
let ball, gates, pickups;
let cameraY = 0;
let score = 0;
let best = Number(localStorage.getItem("colorSwitchBest")) || 0;
let playing = false;
let animationId = null;
let lastTime = 0;

const gravity = 0.00028;
const jumpPower = 0.42;
const ringRadius = 65;
const ballRadius = 10;

function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    width = rect.width;
    height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", resize);
resize();

bestText.textContent = "Best: " + best;

function newGame() {
    score = 0;
    cameraY = 0;

    ball = {
        x: width / 2,
        y: 0,
        velocity: 0,
        color: colors[0]
    };

    gates = [];
    pickups = [];

    for (let i = 1; i <= 30; i++) {
        const gateY = i * 300;

        gates.push({
            y: gateY,
            rotation: Math.random() * Math.PI * 2,
            speed: (Math.random() > 0.5 ? 1 : -1) * 0.0015,
            checked: false,
            passed: false
        });

        pickups.push({
            y: gateY + 145,
            collected: false,
            color: colors[(i) % colors.length]
        });
    }

    scoreText.textContent = "Score: 0";
}

function startGame() {
    cancelAnimationFrame(animationId);

    resize();
    newGame();

    playing = true;
    overlay.style.display = "none";

    lastTime = performance.now();
    animationId = requestAnimationFrame(gameLoop);
}

function jump() {
    if (!playing) return;

    ball.velocity = jumpPower;
}

function getGateColor(gate) {
    const angle = Math.PI / 2;
    let relative = (angle - gate.rotation) % (Math.PI * 2);

    if (relative < 0) {
        relative += Math.PI * 2;
    }

    const index = Math.floor(relative / (Math.PI / 2));

    return colors[index];
}

function drawBackground() {
    ctx.fillStyle = "#090b24";
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 35; i++) {
        const x = (i * 97) % width;
        const y = (i * 139 + cameraY * 0.15) % height;

        ctx.fillStyle = "#ffffff55";
        ctx.beginPath();
        ctx.arc(x, y, 1.3, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawGate(gate) {
    const screenY = height - (gate.y - cameraY);

    if (screenY < -100 || screenY > height + 100) return;

    const segment = Math.PI / 2;

    for (let i = 0; i < 4; i++) {
        ctx.beginPath();

        ctx.arc(
            width / 2,
            screenY,
            ringRadius,
            gate.rotation + i * segment,
            gate.rotation + (i + 1) * segment
        );

        ctx.strokeStyle = colors[i];
        ctx.lineWidth = 13;
        ctx.lineCap = "butt";
        ctx.stroke();
    }
}

function drawBall() {
    const screenY = height - (ball.y - cameraY);

    ctx.shadowBlur = 22;
    ctx.shadowColor = ball.color;

    ctx.beginPath();
    ctx.arc(width / 2, screenY, ballRadius, 0, Math.PI * 2);

    ctx.fillStyle = ball.color;
    ctx.fill();

    ctx.shadowBlur = 0;
}

function drawPickups() {
    pickups.forEach(pickup => {
        if (pickup.collected) return;

        const y = height - (pickup.y - cameraY);

        if (y < -30 || y > height + 30) return;

        ctx.shadowBlur = 15;
        ctx.shadowColor = pickup.color;

        ctx.beginPath();
        ctx.arc(width / 2, y, 12, 0, Math.PI * 2);

        ctx.fillStyle = pickup.color;
        ctx.fill();

        ctx.shadowBlur = 0;
    });
}

function checkCollisions(previousY) {
    for (const gate of gates) {
        const entryY = gate.y - ringRadius;

        if (
            !gate.checked &&
            previousY < entryY &&
            ball.y >= entryY
        ) {
            gate.checked = true;

            if (ball.color !== getGateColor(gate)) {
                endGame();
                return;
            }
        }

        if (
            !gate.passed &&
            previousY < gate.y &&
            ball.y >= gate.y
        ) {
            gate.passed = true;
            score++;

            scoreText.textContent = "Score: " + score;
        }
    }

    pickups.forEach(pickup => {
        if (
            !pickup.collected &&
            previousY < pickup.y &&
            ball.y >= pickup.y
        ) {
            pickup.collected = true;
            ball.color = pickup.color;
        }
    });
}

function endGame() {
    playing = false;
    cancelAnimationFrame(animationId);

    if (score > best) {
        best = score;
        localStorage.setItem("colorSwitchBest", best);
    }

    bestText.textContent = "Best: " + best;

    overlay.style.display = "flex";
    overlayTitle.textContent = "GAME OVER!";
    overlayText.textContent =
        "Your score: " + score + " | Best: " + best;

    playButton.textContent = "PLAY AGAIN";
}

function gameLoop(time) {
    if (!playing) return;

    const dt = Math.min(time - lastTime, 32);
    lastTime = time;

    const previousY = ball.y;

    ball.velocity -= gravity * dt;
    ball.y += ball.velocity * dt;

    cameraY = Math.max(cameraY, ball.y - 210);

    gates.forEach(gate => {
        gate.rotation += gate.speed * dt;
    });

    checkCollisions(previousY);

    if (!playing) return;

    if (ball.y < cameraY - 80) {
        endGame();
        return;
    }

    drawBackground();

    gates.forEach(drawGate);
    drawPickups();
    drawBall();

    animationId = requestAnimationFrame(gameLoop);
}

playButton.addEventListener("click", startGame);

canvas.addEventListener("pointerdown", jump);

document.addEventListener("keydown", event => {
    if (
        event.code === "Space" ||
        event.code === "ArrowUp"
    ) {
        event.preventDefault();
        jump();
    }
});

// Initial screen
drawBackground();
