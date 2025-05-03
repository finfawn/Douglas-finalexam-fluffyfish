// Flappy Fish Game Logic
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Images
const fishImg = new Image();
fishImg.src = 'fish.png';
fishImg.setAttribute('crossOrigin', 'anonymous');
const fishDeadImg = new Image();
fishDeadImg.src = 'fish-dead.png';
fishDeadImg.setAttribute('crossOrigin', 'anonymous');

// Sounds
const bgMusic = document.getElementById('bg-music');
const jumpSound = document.getElementById('jump-sound');
const gameoverSound = document.getElementById('gameover-sound');
const zapSound = document.getElementById('zap-sound');
const blingSound = document.getElementById('bling-sound');

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

// Add electric effect variables
let electricEffects = [];
const ELECTRIC_COLORS = ['#00ffff', '#ffffff', '#4df7ff'];

// Add bottom electric effect variables
let bottomElectricEffects = [];

function createElectricEffect(x, y) {
  for (let i = 0; i < 12; i++) {
    electricEffects.push({
      startX: x + fish.w / 2,
      startY: y + fish.h / 2,
      angle: (Math.PI * 2 * i) / 12,
      length: Math.random() * 30 + 20,
      segments: [],
      alpha: 1,
      width: Math.random() * 2 + 2,
      color: ELECTRIC_COLORS[Math.floor(Math.random() * ELECTRIC_COLORS.length)]
    });
  }
}

function updateElectricEffects(timeScale) {
  electricEffects = electricEffects.filter(e => e.alpha > 0);
  electricEffects.forEach(effect => {
    effect.alpha -= 0.03 * timeScale;
    effect.segments = [];
    let x = effect.startX;
    let y = effect.startY;
    let angle = effect.angle;
    
    for (let i = 0; i < 5; i++) {
      const length = effect.length / 5;
      angle += (Math.random() - 0.5) * 0.5;
      const endX = x + Math.cos(angle) * length;
      const endY = y + Math.sin(angle) * length;
      effect.segments.push({ x1: x, y1: y, x2: endX, y2: endY });
      x = endX;
      y = endY;
    }
  });
}

function drawElectricEffects() {
  electricEffects.forEach(effect => {
    effect.segments.forEach(segment => {
      ctx.beginPath();
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = effect.width;
      ctx.globalAlpha = effect.alpha;
      ctx.shadowColor = effect.color;
      ctx.shadowBlur = 15;
      ctx.moveTo(segment.x1, segment.y1);
      ctx.lineTo(segment.x2, segment.y2);
      ctx.stroke();
    });
  });
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function createBottomElectricEffect() {
  const numEffects = 8;
  const spacing = canvas.width / numEffects;
  
  for (let i = 0; i < numEffects; i++) {
    bottomElectricEffects.push({
      x: i * spacing + Math.random() * 20,
      y: canvas.height,
      height: 20 + Math.random() * 15,
      alpha: 0.7 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2
    });
  }
}

function updateBottomElectricEffects(timeScale) {
  bottomElectricEffects.forEach(effect => {
    effect.phase += 0.1 * timeScale;
    effect.height = 20 + Math.sin(effect.phase) * 10;
    effect.alpha = 0.7 + Math.sin(effect.phase) * 0.3;
  });
}

function drawBottomElectricEffects() {
  ctx.save();
  bottomElectricEffects.forEach(effect => {
    const gradient = ctx.createLinearGradient(effect.x, canvas.height, effect.x, canvas.height - effect.height);
    gradient.addColorStop(0, `rgba(0, 255, 255, ${effect.alpha})`);
    gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(effect.x - 5, canvas.height);
    ctx.lineTo(effect.x + 5, canvas.height);
    ctx.lineTo(effect.x + Math.sin(effect.phase) * 3, canvas.height - effect.height);
    ctx.lineTo(effect.x - Math.sin(effect.phase) * 3, canvas.height - effect.height);
    ctx.closePath();
    ctx.fill();
    
    // Add glow effect
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 15;
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
  ctx.restore();
}

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
    p.vy += 0.1; // Add gravity
    p.vx *= 0.99; // Add air resistance
    p.alpha -= 0.02;
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
  // Reset score display
  document.querySelector('.score-value').textContent = '0';
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
  
  // Apply image smoothing settings for better quality
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  ctx.shadowColor = '#00e6ff';
  ctx.shadowBlur = 16;
  
  // Fish bobbing and rotation
  let bob = Math.sin(frame / 8) * 2;
  let angle = Math.max(Math.min(fish.vy * 0.08, 0.5), -0.5);
  let waggle = fish.alive ? (1 + Math.sin(frame / 3) * 0.06) : 1;
  
  // When dead, add a slight downward tilt
  if (!fish.alive) {
    angle = Math.min(angle + 0.3, Math.PI / 4);
  }
  
  ctx.translate(fish.x + fish.w / 2, fish.y + fish.h / 2 + (fish.alive ? bob : 0));
  ctx.rotate(angle);
  ctx.scale(waggle, 1);
  
  // Draw the appropriate fish image
  const currentFishImg = fish.alive ? fishImg : fishDeadImg;
  ctx.drawImage(currentFishImg, -fish.w / 2, -fish.h / 2, fish.w, fish.h);
  
  ctx.restore();
  
  // Draw electric effects if fish is zapped
  if (!fish.alive && fishZapped) {
    drawElectricEffects();
  }
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
  ctx.font = 'bold 24px "Baloo 2", Arial, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#00e6ff';
  ctx.lineWidth = 4;
  ctx.textAlign = 'left';
  ctx.shadowColor = '#00e6ff';
  ctx.shadowBlur = 8;
  ctx.strokeText(score.toString(), 20, 40);
  ctx.fillText(score.toString(), 20, 40);
  ctx.restore();
}

function updateGameLogic(deltaTime) {
  const timeScale = deltaTime / (1000/60);

  // Update electric effects
  if (gameState === 'gameover' && fishZapped) {
    updateElectricEffects(timeScale);
  }
  
  // Update bottom electric effects
  updateBottomElectricEffects(timeScale);

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
      // Play bling sound
      blingSound.currentTime = 0;
      blingSound.play();
      // Update score display
      document.querySelector('.score-value').textContent = score;
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
  drawBottomElectricEffects();
  
  if (gameState === 'playing') {
    drawPipes();
  }
  
  drawFish();
  if (gameState === 'playing') {
    drawScore();
  }
  drawCaustics();
  
  if (gameState === 'playing') {
    if (checkCollision()) {
      fish.alive = false;
      createElectricEffect(fish.x, fish.y);
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
    drawBottomElectricEffects();
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
  fadeIn(document.querySelector('.score-container'));
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
  fadeOut(document.querySelector('.score-container'));
  
  // Create a burst of particles
  createGameOverBurst();
  
  // Play sound effects
  bgMusic.pause();
  zapSound.currentTime = 0;
  zapSound.play();
  
  setTimeout(() => {
    fishZapped = false;
    gameoverSound.currentTime = 0;
    gameoverSound.play();
    document.getElementById('final-score').textContent = score;
    fadeIn(gameoverScreen);
  }, 600);
}

function createGameOverBurst() {
  // Create particles in a circular burst
  for (let i = 0; i < 20; i++) {
    const angle = (Math.PI * 2 * i) / 20;
    const speed = 5 + Math.random() * 3;
    particles.push({
      x: fish.x + fish.w / 2,
      y: fish.y + fish.h / 2,
      r: Math.random() * 4 + 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 1,
      color: `hsl(${Math.random() * 60 + 180}, 80%, 70%)`
    });
  }
  
  // Create some larger, slower particles
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 2;
    particles.push({
      x: fish.x + fish.w / 2,
      y: fish.y + fish.h / 2,
      r: Math.random() * 6 + 4,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 1,
      color: '#ff4757'
    });
  }
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
  installBtn.textContent = 'Install';
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
  const isOnline = navigator.onLine;
  const offlineBanner = document.getElementById('offline-banner');
  
  if (!isOnline) {
    offlineBanner.textContent = '📡 Offline Mode';
    fadeIn(offlineBanner);
  } else {
    offlineBanner.textContent = '🌐 Online';
    setTimeout(() => fadeOut(offlineBanner), 2000); // Hide after 2 seconds when online
  }
}

// Load images with error handling
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn(`Failed to load image: ${src}`);
      resolve(img); // Resolve anyway to continue game
    };
    img.src = src;
  });
}

// Initialize game assets
async function initializeGame() {
  try {
    // Load images
    const [fishNormal, fishDead] = await Promise.all([
      loadImage('fish.png'),
      loadImage('fish-dead.png')
    ]);
    
    // Update global image references
    fishImg.src = fishNormal.src;
    fishDeadImg.src = fishDead.src;
    
    // Start the game
    showStartScreen();
  } catch (error) {
    console.warn('Some assets failed to load, but game will continue');
    showStartScreen();
  }
}

// Call initialize when the page loads
window.addEventListener('load', () => {
  initGame();
  initializeGame();
});

// Update online status events
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

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

// Update collision detection to be more forgiving
function checkCollision() {
  const collisionMargin = 8; // Reduced collision margin for more precise detection
  const fishHitbox = {
    x: fish.x + collisionMargin,
    y: fish.y + collisionMargin,
    w: fish.w - collisionMargin * 2,
    h: fish.h - collisionMargin * 2
  };
  
  for (let pipe of pipes) {
    if (fishHitbox.x + fishHitbox.w < pipe.x || fishHitbox.x > pipe.x + pipeWidth) continue;
    
    if (fishHitbox.y < pipe.top || fishHitbox.y + fishHitbox.h > pipe.top + pipeGap) {
      return true;
    }
  }
  
  // Check for bottom collision with electric effect
  if (fish.y + fish.h >= canvas.height - 10) {
    createElectricEffect(fish.x, canvas.height - fish.h);
    return true;
  }
  
  return false;
}

// Initialize bottom electric effects
function initGame() {
  createBottomElectricEffect();
  // ... any other initialization code ...
} 