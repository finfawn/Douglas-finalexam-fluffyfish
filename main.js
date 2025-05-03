// Flappy Fish Game Logic
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Images
const fishImg = new Image();
fishImg.src = 'fish.png';
const fishDeadImg = new Image();
fishDeadImg.src = 'fish-dead.png';

// Sounds
const bgMusic = document.getElementById('bg-music');
const jumpSound = document.getElementById('jump-sound');
const gameoverSound = document.getElementById('gameover-sound');
const zapSound = document.getElementById('zap-sound');

// Game Variables
let fish = { x: 80, y: 320, w: 60, h: 48, vy: 0, gravity: 0.36, jump: -7.5, alive: true };
let pipes = [];
let score = 0;
let highScore = 0;
let gameState = 'start'; // start, tutorial, playing, gameover
let pipeGap = 200;
let pipeWidth = 70;
let pipeSpeed = 2.1;
let frame = 0;
let lastTime = 0;
let deltaTime = 0;

// Pre-calculate some values
const PIPE_SPAWN_INTERVAL = 120;
const BUBBLE_SPAWN_INTERVAL = 20;
const FISH_BOB_FREQUENCY = 1/30;

// Handle canvas sizing
function resizeCanvas() {
  const container = canvas.parentElement;
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  
  canvas.width = containerWidth;
  canvas.height = containerHeight;
  
  // Adjust game parameters based on screen size
  pipeGap = Math.min(containerHeight * 0.28, 200);
  pipeWidth = Math.min(containerWidth * 0.15, 70);
  fish.w = Math.min(containerWidth * 0.125, 60);
  fish.h = Math.min(containerHeight * 0.067, 48);
  fish.x = containerWidth * 0.167;
  
  // Adjust physics for screen size
  fish.gravity = containerHeight * 0.0005;
  fish.jump = -containerHeight * 0.0104;
  pipeSpeed = containerWidth * 0.004;
}

// Call resize handler on load and window resize
window.addEventListener('load', resizeCanvas);
window.addEventListener('resize', resizeCanvas);

// Bubble Variables
let bubbles = [];
function spawnBubble(x, y) {
  const count = Math.floor(Math.random() * 2) + 3;
  for (let i = 0; i < count; i++) {
    const radius = Math.random() * 8 + 5;
    bubbles.push({
      x: x + 20 + Math.random() * 20,
      y: y + 20 + Math.random() * 10,
      r: radius,
      speed: Math.random() * 1.5 + 1.2,
      alpha: Math.random() * 0.4 + 0.5,
      vx: (Math.random() - 0.5) * 0.7
    });
  }
}
function updateBubbles() {
  bubbles.forEach(b => {
    b.y -= b.speed;
    b.x += b.vx;
    b.alpha -= 0.008;
  });
  bubbles = bubbles.filter(b => b.y + b.r > 0 && b.alpha > 0);
}
function drawBubbles() {
  bubbles.forEach(b => {
    ctx.save();
    ctx.globalAlpha = b.alpha;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.shadowColor = '#b3e5fc';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
  });
}

// Splash Effect
let splashes = [];
function spawnSplash(x, y) {
  for (let i = 0; i < 8; i++) {
    splashes.push({
      x: x + 30,
      y: y + 30,
      r: Math.random() * 2 + 2,
      vx: Math.cos((i / 8) * 2 * Math.PI) * (Math.random() * 2 + 1),
      vy: Math.sin((i / 8) * 2 * Math.PI) * (Math.random() * 2 + 1),
      alpha: 1
    });
  }
}
function updateSplashes() {
  splashes.forEach(s => {
    s.x += s.vx;
    s.y += s.vy;
    s.alpha -= 0.04;
  });
  splashes = splashes.filter(s => s.alpha > 0);
}
function drawSplashes() {
  splashes.forEach(s => {
    ctx.save();
    ctx.globalAlpha = s.alpha;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, 2 * Math.PI);
    ctx.fillStyle = '#b3e5fc';
    ctx.fill();
    ctx.restore();
  });
}

// Particle Burst on Game Over
let particles = [];
function spawnParticles(x, y) {
  for (let i = 0; i < 18; i++) {
    particles.push({
      x: x + 30,
      y: y + 30,
      r: Math.random() * 3 + 2,
      vx: Math.cos((i / 18) * 2 * Math.PI) * (Math.random() * 3 + 2),
      vy: Math.sin((i / 18) * 2 * Math.PI) * (Math.random() * 3 + 2),
      alpha: 1,
      color: `hsl(${Math.random() * 60 + 180}, 80%, 70%)`
    });
  }
}
function updateParticles() {
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= 0.025;
  });
  particles = particles.filter(p => p.alpha > 0);
}
function drawParticles() {
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.restore();
  });
}

// Water Caustic Overlay
function drawCaustics() {
  ctx.save();
  ctx.globalAlpha = 0.10;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    let y = 80 + Math.sin(frame / 40 + i) * 18 + i * 120;
    for (let x = 0; x <= canvas.width; x += 24) {
      ctx.lineTo(x, y + Math.sin(frame / 20 + x / 60 + i) * 12);
    }
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#b3e5fc';
    ctx.shadowBlur = 12;
    ctx.stroke();
  }
  ctx.restore();
}

// DOM Elements
const startScreen = document.getElementById('start-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const finalScore = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const offlineBanner = document.getElementById('offline-banner');
const installBtn = document.getElementById('install-btn');

// Game Functions
function resetGame() {
  fish.y = 320;
  fish.vy = 0;
  fish.alive = true;
  pipes = [];
  score = 0;
  frame = 0;
  bubbles = [];
}

let fishZapped = false;
let fishZapFrame = 0;

function drawFishZapEffect() {
  if (!fishZapped) return;
  ctx.save();
  ctx.translate(fish.x + fish.w / 2, fish.y + fish.h / 2);
  for (let i = 0; i < 2; i++) {
    ctx.save();
    ctx.rotate(i * Math.PI / 2);
    ctx.beginPath();
    let zapLen = fish.w * 0.9;
    let zapSeg = 7;
    let startX = -zapLen / 2;
    let startY = 0;
    ctx.moveTo(startX, startY);
    for (let j = 1; j <= zapSeg; j++) {
      let t = j / zapSeg;
      let x = startX + t * zapLen;
      let y = Math.sin(fishZapFrame / 2 + j * 1.5) * 7 * (1 - Math.abs(t - 0.5) * 2);
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(0,255,255,0.85)';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#00e6ff';
    ctx.shadowBlur = 16;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawFish() {
  ctx.save();
  ctx.shadowColor = '#00e6ff';
  ctx.shadowBlur = 16;
  // Fish bobbing and rotation
  let bob = Math.sin(frame / 8) * 2;
  let angle = Math.max(Math.min(fish.vy * 0.08, 0.5), -0.5); // rotate based on velocity
  let waggle = 1 + Math.sin(frame / 3) * 0.06; // tail waggle effect
  ctx.translate(fish.x + fish.w / 2, fish.y + fish.h / 2 + bob);
  ctx.rotate(angle);
  ctx.scale(waggle, 1);
  ctx.drawImage(fish.alive ? fishImg : fishDeadImg, -fish.w / 2, -fish.h / 2, fish.w, fish.h);
  ctx.restore();
  drawFishZapEffect();
}

// Draw electric zap effect on the surface of the pipes
function drawZapOnPipe(pipe) {
  const zapColor = 'rgba(0,255,255,0.85)';
  const zapWidth = 3;
  const zapSegments = 7;
  // Top pipe
  for (let side = 0; side <= 1; side++) { // left and right edge
    let x = pipe.x + (side === 0 ? 0 : pipeWidth);
    let y1 = 0;
    let y2 = pipe.top;
    let prevX = x, prevY = y1;
    ctx.save();
    ctx.strokeStyle = zapColor;
    ctx.lineWidth = zapWidth;
    ctx.shadowColor = '#00e6ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(x, y1);
    for (let i = 1; i < zapSegments; i++) {
      let t = i / zapSegments;
      let zapY = y1 + t * (y2 - y1);
      let zapX = x + Math.sin(frame / 4 + i * 1.5 + pipe.x / 40 + side * 2) * 6;
      ctx.lineTo(zapX, zapY);
      prevX = zapX; prevY = zapY;
    }
    ctx.lineTo(x, y2);
    ctx.stroke();
    ctx.restore();
  }
  // Bottom pipe
  for (let side = 0; side <= 1; side++) {
    let x = pipe.x + (side === 0 ? 0 : pipeWidth);
    let y1 = pipe.top + pipeGap;
    let y2 = canvas.height;
    let prevX = x, prevY = y1;
    ctx.save();
    ctx.strokeStyle = zapColor;
    ctx.lineWidth = zapWidth;
    ctx.shadowColor = '#00e6ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(x, y1);
    for (let i = 1; i < zapSegments; i++) {
      let t = i / zapSegments;
      let zapY = y1 + t * (y2 - y1);
      let zapX = x + Math.sin(frame / 4 + i * 1.5 + pipe.x / 40 + side * 2) * 6;
      ctx.lineTo(zapX, zapY);
      prevX = zapX; prevY = zapY;
    }
    ctx.lineTo(x, y2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawPipes() {
  pipes.forEach(pipe => {
    // Pipe gradient (dark blue tones)
    let grad = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipeWidth, 0);
    grad.addColorStop(0, '#0a2342');
    grad.addColorStop(1, '#274690');
    ctx.fillStyle = grad;
    ctx.shadowColor = '#274690';
    ctx.shadowBlur = 8;
    ctx.fillRect(pipe.x, 0, pipeWidth, pipe.top);
    ctx.fillRect(pipe.x, pipe.top + pipeGap, pipeWidth, canvas.height - pipe.top - pipeGap);
    ctx.shadowBlur = 0;
    // Draw zap effect on the pipes
    drawZapOnPipe(pipe);
  });
}

function drawScore() {
  ctx.save();
  ctx.font = 'bold 36px "Baloo 2", Arial, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#00e6ff';
  ctx.lineWidth = 6;
  ctx.textAlign = 'center';
  ctx.shadowColor = '#00e6ff';
  ctx.shadowBlur = 16;
  ctx.strokeText('Score: ' + score, canvas.width/2, 60);
  ctx.fillText('Score: ' + score, canvas.width/2, 60);
  ctx.restore();
}

function updateGameLogic(deltaTime) {
  // Scale movements by deltaTime to make them frame-rate independent
  const timeScale = deltaTime / (1000/60); // normalize to 60 FPS

  if (gameState === 'playing') {
    // Update pipes
    pipes.forEach(pipe => pipe.x -= pipeSpeed * timeScale);
    if (pipes.length && pipes[0].x + pipeWidth < 0) pipes.shift();
    
    // Spawn new pipes
    if (frame % PIPE_SPAWN_INTERVAL === 0) {
      let top = Math.random() * (canvas.height - pipeGap - 100) + 40;
      pipes.push({ x: canvas.width, top });
    }
    
    // Update score
    updateScore();
  }

  // Update fish position
  if (gameState === 'tutorial') {
    fish.y = canvas.height / 2 + Math.sin(frame * FISH_BOB_FREQUENCY) * 10;
  } else if (gameState === 'playing') {
    fish.vy += fish.gravity * timeScale;
    fish.y += fish.vy * timeScale;
    
    if (fish.y + fish.h > canvas.height) {
      fish.y = canvas.height - fish.h;
      fish.alive = false;
    }
    if (fish.y < 0) fish.y = 0;
  }

  // Update effects with deltaTime
  updateEffects(timeScale);
}

function updateEffects(timeScale) {
  // Update bubbles with time scaling
  bubbles.forEach(b => {
    b.y -= b.speed * timeScale;
    b.x += b.vx * timeScale;
    b.alpha -= 0.008 * timeScale;
  });
  bubbles = bubbles.filter(b => b.y + b.r > 0 && b.alpha > 0);

  // Update splashes with time scaling
  splashes.forEach(s => {
    s.x += s.vx * timeScale;
    s.y += s.vy * timeScale;
    s.alpha -= 0.04 * timeScale;
  });
  splashes = splashes.filter(s => s.alpha > 0);

  // Update particles with time scaling
  particles.forEach(p => {
    p.x += p.vx * timeScale;
    p.y += p.vy * timeScale;
    p.alpha -= 0.025 * timeScale;
  });
  particles = particles.filter(p => p.alpha > 0);
}

function updateScore() {
  pipes.forEach(pipe => {
    if (!pipe.passed && pipe.x + pipeWidth < fish.x) {
      score++;
      pipe.passed = true;
    }
  });
}

function gameLoop(currentTime) {
  if (!lastTime) lastTime = currentTime;
  deltaTime = currentTime - lastTime;
  lastTime = currentTime;

  // Limit delta time to prevent huge jumps
  if (deltaTime > 100) deltaTime = 100;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Update game logic with delta time
  updateGameLogic(deltaTime);
  
  // Draw everything
  drawBubbles();
  drawSplashes();
  drawParticles();
  
  if (gameState === 'playing') {
    drawPipes();
  }
  
  drawFish();
  if (gameState === 'playing') {
    drawScore();
  }
  drawCaustics();
  
  if (gameState === 'playing') {
    if (checkCollision() || fish.y + fish.h >= canvas.height) {
      spawnParticles(fish.x, fish.y);
      gameOver();
    }
  }
  
  frame++;
  if (gameState !== 'gameover') {
    requestAnimationFrame(gameLoop);
  } else {
    drawSplashes();
    drawParticles();
    if (fishZapped) fishZapFrame++;
  }
}

function fadeIn(el) {
  el.style.opacity = 0;
  el.style.display = 'flex';
  setTimeout(() => { el.style.opacity = 1; }, 10);
}
function fadeOut(el) {
  el.style.opacity = 0;
  setTimeout(() => { el.style.display = 'none'; }, 300);
}

function startGame() {
  resetGame();
  fadeOut(startScreen);
  fadeOut(gameoverScreen);
  gameState = 'tutorial';
  fish.y = canvas.height / 2;
  fish.vy = 0;
  bgMusic.currentTime = 0;
  bgMusic.play();
  lastTime = 0; // Reset time tracking
  requestAnimationFrame(gameLoop);
}

function startActualGame() {
  gameState = 'playing';
  fish.vy = fish.jump; // Give initial jump
  spawnBubble(fish.x, fish.y);
  spawnSplash(fish.x, fish.y);
}

function gameOver() {
  gameState = 'gameover';
  fish.alive = false;
  fishZapped = true;
  fishZapFrame = 0;
  bgMusic.pause();
  zapSound.currentTime = 0;
  zapSound.play();
  setTimeout(() => {
    fishZapped = false;
    gameoverSound.currentTime = 0;
    gameoverSound.play();
  }, 600); // Play game over music after zap
  finalScore.textContent = `Your Score: ${score}`;
  fadeIn(gameoverScreen);
}

function jump() {
  if (gameState === 'tutorial') {
    startActualGame();
    return;
  }
  if (gameState !== 'playing') return;
  
  fish.vy = fish.jump;
  jumpSound.currentTime = 0;
  jumpSound.play();
  spawnBubble(fish.x, fish.y);
  spawnSplash(fish.x, fish.y);
}

// Event Listeners
startBtn.onclick = startGame;
restartBtn.onclick = startGame;
window.addEventListener('keydown', e => {
  if (e.code === 'Space') jump();
});
canvas.addEventListener('pointerdown', jump);

// Show overlays
function showStartScreen() {
  fadeIn(startScreen);
  fadeOut(gameoverScreen);
  startScreenBubbles();
}
showStartScreen();

// PWA Install
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = 'block';
});
installBtn.addEventListener('click', () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      installBtn.style.display = 'none';
      deferredPrompt = null;
    });
  }
});

// Offline Detection
function updateOnlineStatus() {
  if (!navigator.onLine) {
    fadeIn(offlineBanner);
  } else {
    fadeOut(offlineBanner);
  }
}
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js');
  });
}

// Animated bubbles for start screen
function startScreenBubbles() {
  const container = document.getElementById('start-bubbles');
  if (!container) return;
  container.innerHTML = '';
  let bubbleInterval = setInterval(() => {
    if (document.getElementById('start-screen').style.display === 'none') {
      clearInterval(bubbleInterval);
      return;
    }
    const bubble = document.createElement('div');
    bubble.className = 'start-bubble';
    const size = Math.random() * 18 + 12;
    bubble.style.width = size + 'px';
    bubble.style.height = size + 'px';
    bubble.style.left = (Math.random() * 90 + 5) + '%';
    bubble.style.bottom = '0px';
    container.appendChild(bubble);
    setTimeout(() => {
      if (bubble.parentNode) bubble.parentNode.removeChild(bubble);
    }, 2800);
  }, 420);
}

// Optimize collision detection
function checkCollision() {
  const fishRight = fish.x + fish.w;
  const fishBottom = fish.y + fish.h;
  
  for (let pipe of pipes) {
    if (fishRight < pipe.x || fish.x > pipe.x + pipeWidth) continue;
    
    if (fish.y < pipe.top || fishBottom > pipe.top + pipeGap) {
      return true;
    }
  }
  return false;
} 