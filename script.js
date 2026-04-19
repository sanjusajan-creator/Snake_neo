// Game Constants
const GRID_SIZE = 20;
const INITIAL_SPEED = 18; // Faster base speed
const SPEED_INCREMENT = 0.5;
const MAX_SPEED = 35;

// Game State
let snake = [{ x: 10, y: 10, px: 10, py: 10 }];
let food = { x: 5, y: 5 };
let direction = { x: 1, y: 0 };
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameSpeed = INITIAL_SPEED;
let gameActive = false;
let isPaused = false;
let isGameOver = false;

// Input Queue (for snappy turns)
let inputQueue = [];

// Timing
let lastUpdateTime = 0;
let moveProgress = 0;

// DOM
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('high-score');
const overlay = document.getElementById('overlay');
const messageDisplay = document.getElementById('message');
const subMessageDisplay = document.querySelector('.sub-message');
const playPauseBtn = document.getElementById('play-pause-btn');
const resetBtn = document.getElementById('reset-btn');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    if (type === 'eat') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, now);
        oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.1);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        oscillator.start(now); oscillator.stop(now + 0.1);
    } else if (type === 'die') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(110, now);
        oscillator.frequency.exponentialRampToValueAtTime(20, now + 0.4);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        oscillator.start(now); oscillator.stop(now + 0.4);
    }
}

function init() {
    canvas.width = 400;
    canvas.height = 400;
    highScoreDisplay.innerText = highScore;
    requestAnimationFrame(gameLoop);
}

function togglePlayPause() {
    if (isGameOver) {
        resetGame();
        start();
    } else if (!gameActive) {
        start();
    } else {
        isPaused = !isPaused;
        updateUI();
    }
}

function start() {
    if (isGameOver) resetGame();
    gameActive = true;
    isPaused = false;
    isGameOver = false;
    overlay.classList.add('hidden');
    lastUpdateTime = performance.now();
    updateUI();
}

function resetGame() {
    snake = [{ x: 10, y: 10, px: 10, py: 10 }, { x: 9, y: 10, px: 9, py: 10 }];
    direction = { x: 1, y: 0 };
    inputQueue = [];
    score = 0;
    gameSpeed = INITIAL_SPEED;
    moveProgress = 0;
    gameActive = false;
    isPaused = false;
    isGameOver = false;
    scoreDisplay.innerText = score;
    overlay.classList.remove('hidden');
    messageDisplay.innerText = 'SNAKE NEO';
    subMessageDisplay.innerText = 'Press Play to Start';
    spawnFood();
    updateUI();
}

function updateUI() {
    if (isPaused || !gameActive) {
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
        if (isPaused) {
            overlay.classList.remove('hidden');
            messageDisplay.innerText = 'PAUSED';
            subMessageDisplay.innerText = 'Press Play to Resume';
        }
    } else {
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
        overlay.classList.add('hidden');
    }
}

function gameLoop(timestamp) {
    const deltaTime = (timestamp - lastUpdateTime) / 1000;
    lastUpdateTime = timestamp;

    if (gameActive && !isPaused) {
        moveProgress += deltaTime * gameSpeed;
        if (moveProgress >= 1) {
            moveProgress = 0;
            updateGrid();
        }
    }

    draw();
    requestAnimationFrame(gameLoop);
}

function updateGrid() {
    if (inputQueue.length > 0) {
        const nextMove = inputQueue.shift();
        if (nextMove.x !== -direction.x || nextMove.y !== -direction.y) {
            direction = nextMove;
        }
    }

    snake.forEach(segment => { segment.px = segment.x; segment.py = segment.y; });

    const head = { 
        x: (snake[0].x + direction.x + GRID_SIZE) % GRID_SIZE,
        y: (snake[0].y + direction.y + GRID_SIZE) % GRID_SIZE,
        px: snake[0].x, py: snake[0].y
    };

    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        gameOver();
        return;
    }

    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreDisplay.innerText = score;
        if (score > highScore) {
            highScore = score;
            highScoreDisplay.innerText = highScore;
            localStorage.setItem('snakeHighScore', highScore);
        }
        playSound('eat');
        gameSpeed = Math.min(MAX_SPEED, INITIAL_SPEED + (score / 50) * SPEED_INCREMENT);
        spawnFood();
    } else {
        snake.pop();
    }
}

function spawnFood() {
    while (true) {
        food = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
        if (!snake.some(s => s.x === food.x && s.y === food.y)) break;
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cellSize = canvas.width / GRID_SIZE;

    // Food
    ctx.shadowBlur = 15; ctx.shadowColor = '#ff00d4'; ctx.fillStyle = '#ff00d4';
    ctx.beginPath(); ctx.arc(food.x * cellSize + cellSize / 2, food.y * cellSize + cellSize / 2, cellSize / 3, 0, Math.PI * 2); ctx.fill();

    // Snake
    ctx.shadowBlur = 10; ctx.shadowColor = '#00f2ff';
    snake.forEach((segment, index) => {
        let dx = segment.x - segment.px;
        let dy = segment.y - segment.py;
        if (Math.abs(dx) > 1) dx = dx > 0 ? -1 : 1;
        if (Math.abs(dy) > 1) dy = dy > 0 ? -1 : 1;

        const renderX = segment.px + dx * moveProgress;
        const renderY = segment.py + dy * moveProgress;

        ctx.fillStyle = index === 0 ? '#00f2ff' : 'rgba(0, 242, 255, 0.6)';
        const size = index === 0 ? cellSize - 2 : cellSize - 6;
        const offset = (cellSize - size) / 2;
        drawSegmentWithWraps(renderX, renderY, size, offset);
    });
}

function drawSegmentWithWraps(rx, ry, size, offset) {
    const cellSize = canvas.width / GRID_SIZE;
    drawRoundedRect(ctx, rx * cellSize + offset, ry * cellSize + offset, size, size, 8);
    if (rx < 0) drawRoundedRect(ctx, (rx + GRID_SIZE) * cellSize + offset, ry * cellSize + offset, size, size, 8);
    if (rx > GRID_SIZE - 1) drawRoundedRect(ctx, (rx - GRID_SIZE) * cellSize + offset, ry * cellSize + offset, size, size, 8);
    if (ry < 0) drawRoundedRect(ctx, rx * cellSize + offset, (ry + GRID_SIZE) * cellSize + offset, size, size, 8);
    if (ry > GRID_SIZE - 1) drawRoundedRect(ctx, rx * cellSize + offset, (ry - GRID_SIZE) * cellSize + offset, size, size, 8);
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath(); ctx.moveTo(x + radius, y); ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius); ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height); ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius); ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y); ctx.closePath(); ctx.fill();
}

function gameOver() {
    gameActive = false;
    isGameOver = true;
    inputQueue = [];
    playSound('die');
    messageDisplay.innerText = 'GAME OVER';
    subMessageDisplay.innerText = 'Press Play to Restart';
    updateUI();
}

const setDir = (x, y) => { 
    if (isPaused || !gameActive) return;
    const lastDir = inputQueue.length > 0 ? inputQueue[inputQueue.length - 1] : direction;
    if (x !== -direction.x || y !== -direction.y) {
        if (x !== lastDir.x || y !== lastDir.y) {
            if (inputQueue.length < 3) inputQueue.push({ x, y });
        }
    }
};

window.addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'Enter') togglePlayPause();
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') setDir(0, -1);
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') setDir(0, 1);
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') setDir(-1, 0);
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') setDir(1, 0);
});

document.getElementById('up-btn').addEventListener('click', () => setDir(0, -1));
document.getElementById('down-btn').addEventListener('click', () => setDir(0, 1));
document.getElementById('left-btn').addEventListener('click', () => setDir(-1, 0));
document.getElementById('right-btn').addEventListener('click', () => setDir(1, 0));

playPauseBtn.addEventListener('click', togglePlayPause);
resetBtn.addEventListener('click', resetGame);

let touchStartX = 0, touchStartY = 0;
window.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY; }, { passive: true });
window.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy)) { if (Math.abs(dx) > 15) setDir(dx > 0 ? 1 : -1, 0); }
    else { if (Math.abs(dy) > 15) setDir(0, dy > 0 ? 1 : -1); }
}, { passive: true });

init();
resetGame();
