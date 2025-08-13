const config = {
    paddle: {
        height: 12,
        width: 100,
        speed: 8,
        color: '#667eea'
    },
    ball: {
        radius: 8,
        defaultSpeed: 5,
        maxSpeed: 12,
        color: '#ffffff',
        glowColor: '#ffffff'
    },
    block: {
        height: 24,
        padding: 8,
        margin: 4,
        baseRows: 3,
        columns: 8,
        indestructibleColor: '#555555'
    },
    powerup: {
        size: 12,
        speed: 2,
        types: ['multi', 'fire', 'extra']
    },
    levels: {
        max: 30,
        challengeSpeedMultiplier: 1.5,
        challengeDropInterval: 10000,
        arcadeSpeedIncrease: 0.2,
        arcadeDropInterval: 15000
    },
    blockColors: [
        '#FF5252',
        '#448AFF',
        '#4CAF50'
    ]
};

let state = {
    score: 0,
    level: 1,
    isGameOver: false,
    isGameWon: false,
    isPaused: false,
    activePowerups: [],
    activeBalls: [],
    fallingPowerups: [],
    gameRunning: false,
    gameMode: 'arcade',
    challengeMode: false,
    blocksToClear: 0,
    highestLevel: 1,
    lastDropTime: 0,
    arcadeSpeed: 0,
    previousScreen: 'menu',
    gameStateBeforePause: null
};

const loadingScreen = document.getElementById('loadingScreen');
const menuScreen = document.getElementById('menuScreen');
const levelSelectScreen = document.getElementById('levelSelectScreen');
const infoScreen = document.getElementById('infoScreen');
const settingsScreen = document.getElementById('settingsScreen');
const highScoreScreen = document.getElementById('highScoreScreen');
const gameContainer = document.getElementById('gameContainer');
const gameOverlay = document.getElementById('gameOverlay');
const overlayContent = document.getElementById('overlayContent');
const overlayTitle = document.getElementById('overlayTitle');
const overlaySubtitle = document.getElementById('overlaySubtitle');
const overlayButtons = document.getElementById('overlayButtons');
const nameInputContainer = document.getElementById('nameInputContainer');
const playerNameInput = document.getElementById('playerNameInput');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const scoreContainer = document.getElementById('scoreContainer');
const levelElement = document.getElementById('level');
const levelsContainer = document.getElementById('levelsContainer');
const scoresList = document.getElementById('scoresList');
const scoreTabs = document.querySelectorAll('.score-tab');
const arcadeModeBtn = document.getElementById('arcadeModeBtn');
const levelSelectBtn = document.getElementById('levelSelectBtn');
const infoBtn = document.getElementById('infoBtn');
const highScoreBtn = document.getElementById('highScoreBtn');
const settingsBtn = document.getElementById('settingsBtn');
const backFromLevelSelect = document.getElementById('backFromLevelSelect');
const backFromInfo = document.getElementById('backFromInfo');
const backFromSettings = document.getElementById('backFromSettings');
const backFromHighScore = document.getElementById('backFromHighScore');
const menuBtn = document.getElementById('menuBtn');
const continueBtn = document.getElementById('continueBtn');
const restartBtn = document.getElementById('restartBtn');
const menuFromOverlayBtn = document.getElementById('menuFromOverlayBtn');
const themeToggle = document.getElementById('themeToggle');
const soundToggle = document.getElementById('soundToggle');
const vibrationToggle = document.getElementById('vibrationToggle');
const touchControl = document.getElementById('touchControl');
let paddle = {};
let ball = {};
let blocks = [];
let particles = [];
let animationId = null;
const keys = {
    right: false,
    left: false,
    space: false
};
let touchStartX = 0;

function initApp() {
    // Show loading screen first
    loadingScreen.style.display = 'flex';
    menuScreen.style.display = 'none';
    
    // Simulate loading
    setTimeout(() => {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            menuScreen.style.display = 'flex';
            loadSettings();
            loadProgress();
            updateHighScores('arcade');
            setupEventListeners();
            renderLevelSelect();
        }, 500);
    }, 1500);
}

function setupEventListeners() {
    arcadeModeBtn.addEventListener('click', () => {
        state.gameMode = 'arcade';
        state.challengeMode = false;
        state.previousScreen = 'menu';
        startGame();
    });
    
    levelSelectBtn.addEventListener('click', () => {
        state.previousScreen = 'menu';
        showLevelSelect();
    });
    
    infoBtn.addEventListener('click', () => {
        state.previousScreen = 'menu';
        showInfoScreen();
    });
    
    highScoreBtn.addEventListener('click', () => {
        state.previousScreen = 'menu';
        showHighScores();
    });
    
    settingsBtn.addEventListener('click', () => {
        state.previousScreen = 'menu';
        showSettings();
    });
    
    backFromLevelSelect.addEventListener('click', showMenu);
    backFromInfo.addEventListener('click', showMenu);
    backFromSettings.addEventListener('click', showMenu);
    backFromHighScore.addEventListener('click', showMenu);
    
    menuBtn.addEventListener('click', pauseGame);
    
    // Event listeners for touch controls
    touchControl.addEventListener('touchstart', handleTouchStart, { passive: false });
    touchControl.addEventListener('touchmove', handleTouchMove, { passive: false });
    touchControl.addEventListener('touchend', handleTouchEnd);
    
    // Event delegation for overlay buttons
    overlayButtons.addEventListener('click', function(e) {
        if (e.target.id === 'continueBtn') {
            continueGame();
        } else if (e.target.id === 'restartBtn') {
            restartGame();
        } else if (e.target.id === 'menuFromOverlayBtn') {
            returnToMenu();
        } else if (e.target.id === 'saveScoreBtn') {
            saveHighScore();
            showMenu();
        } else if (e.target.id === 'nextLevelBtn') {
            startGame(state.level + 1);
        } else if (e.target.id === 'levelSelectFromOverlayBtn') {
            showLevelSelect();
        }
    });
    
    themeToggle.addEventListener('change', updateTheme);
    soundToggle.addEventListener('change', saveSettings);
    vibrationToggle.addEventListener('change', saveSettings);
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    scoreTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            scoreTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            updateHighScores(tab.dataset.mode);
        });
    });
    
    // Handle back button
    window.addEventListener('popstate', () => {
        if (state.gameRunning && !state.isPaused) {
            pauseGame();
        } else {
            showMenu();
        }
    });
}

function handleKeyDown(e) {
    if (e.key === 'ArrowRight') keys.right = true;
    if (e.key === 'ArrowLeft') keys.left = true;
    if (e.key === ' ' || e.key === 'Spacebar') keys.space = true;
    if (e.key === 'Escape' && state.gameRunning) {
        if (state.isPaused) {
            continueGame();
        } else {
            pauseGame();
        }
    }
}

function handleKeyUp(e) {
    if (e.key === 'ArrowRight') keys.right = false;
    if (e.key === 'ArrowLeft') keys.left = false;
    if (e.key === ' ' || e.key === 'Spacebar') keys.space = false;
}

function handleTouchStart(e) {
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!state.gameRunning || state.isPaused) return;
    
    const currentX = e.touches[0].clientX;
    const rect = gameContainer.getBoundingClientRect();
    const diffX = currentX - touchStartX;
    touchStartX = currentX;
    
    paddle.x += diffX;
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;
}

function handleTouchEnd(e) {
    e.preventDefault();
    touchStartX = 0;
}

function showMenu() {
    hideAllScreens();
    menuScreen.style.display = 'flex';
    state.previousScreen = 'menu';
}

function showLevelSelect() {
    hideAllScreens();
    levelSelectScreen.style.display = 'flex';
    state.previousScreen = 'levelSelect';
}

function showInfoScreen() {
    hideAllScreens();
    infoScreen.style.display = 'flex';
    state.previousScreen = 'info';
}

function showSettings() {
    hideAllScreens();
    settingsScreen.style.display = 'flex';
    state.previousScreen = 'settings';
}

function showHighScores() {
    hideAllScreens();
    highScoreScreen.style.display = 'flex';
    state.previousScreen = 'highScores';
}

function hideAllScreens() {
    menuScreen.style.display = 'none';
    levelSelectScreen.style.display = 'none';
    infoScreen.style.display = 'none';
    settingsScreen.style.display = 'none';
    highScoreScreen.style.display = 'none';
    gameContainer.style.display = 'none';
    hideOverlay();
}

function startGame(level = 1) {
    hideAllScreens();
    gameContainer.style.display = 'flex';
    state.level = level;
    state.score = 0;
    state.isGameOver = false;
    state.isGameWon = false;
    state.isPaused = false;
    state.activePowerups = [];
    state.fallingPowerups = [];
    state.activeBalls = [];
    particles = [];
    state.arcadeSpeed = 0;
    initGameObjects();
    updateUIMode();
    updateUI();
    state.gameRunning = true;
    state.previousScreen = 'game';
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    gameLoop();
}

function updateUIMode() {
    const uiHeader = document.getElementById('uiHeader');
    if (state.gameMode === 'arcade') {
        uiHeader.classList.remove('level-mode');
        uiHeader.classList.add('arcade-mode');
        levelElement.style.display = 'none';
        scoreElement.style.display = 'inline';
        scoreContainer.style.display = 'block';
    } else {
        uiHeader.classList.remove('arcade-mode');
        uiHeader.classList.add('level-mode');
        scoreElement.style.display = 'none';
        levelElement.style.display = 'inline';
        scoreContainer.style.display = 'none';
    }
}

function initGameObjects() {
    paddle = {
        x: canvas.width / 2 - config.paddle.width / 2,
        y: canvas.height - 30,
        width: config.paddle.width,
        height: config.paddle.height
    };
    
    ball = {
        x: canvas.width / 2,
        y: canvas.height - 50,
        dx: 4,
        dy: -4,
        radius: config.ball.radius,
        isFiring: false,
        trail: [],
        speed: config.ball.defaultSpeed
    };
    
    state.activeBalls = [ball];
    createBlocks();
    state.lastDropTime = Date.now();
}

function createBlocks() {
    blocks = [];
    state.blocksToClear = 0;
    
    const blockWidth = (canvas.width - (config.block.padding * 2) - 
                     (config.block.columns - 1) * config.block.margin) / config.block.columns;
    const blockHeight = config.block.height;
    
    let rows = config.block.baseRows;
    if (state.gameMode === 'arcade') {
        rows += Math.floor(state.level / 3);
    } else {
        rows += Math.floor(state.level / 2);
    }
    rows = Math.min(rows, 8);
    
    const indestructibleChance = state.gameMode === 'arcade' ? 0 : Math.min(0.1 + (state.level * 0.005), 0.3);
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < config.block.columns; c++) {
            if (state.gameMode === 'arcade' && Math.random() < 0.2) continue;
            
            const isIndestructible = Math.random() < indestructibleChance;
            const hitPoints = isIndestructible ? 0 : (3 - (r % 3)); // 3, 2, atau 1 hit points
            
            if (!isIndestructible) {
                state.blocksToClear++;
            }
            
            const colorIndex = hitPoints - 1;
            const color = isIndestructible ? config.block.indestructibleColor : config.blockColors[colorIndex];
            
            blocks.push({
                x: c * (blockWidth + config.block.margin) + config.block.padding,
                y: r * (blockHeight + config.block.margin) + 60,
                width: blockWidth,
                height: blockHeight,
                color: color,
                originalColor: color,
                hitPoints: hitPoints,
                points: 10 * (r + 1) * (state.level > 10 ? 2 : 1),
                indestructible: isIndestructible
            });
        }
    }
}

function createParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            dx: (Math.random() - 0.5) * 8,
            dy: (Math.random() - 0.5) * 8,
            radius: Math.random() * 3 + 2,
            color: color,
            life: 30,
            maxLife: 30
        });
    }
}

function createPowerup(x, y) {
    if (Math.random() < 0.15) {
        const type = config.powerup.types[Math.floor(Math.random() * config.powerup.types.length)];
        state.fallingPowerups.push({
            x: x,
            y: y,
            dx: 0,
            dy: config.powerup.speed,
            type: type,
            width: config.powerup.size,
            height: config.powerup.size
        });
    }
}

function applyPowerup(type) {
    const now = Date.now();
    const existing = state.activePowerups.find(p => p.type === type && p.expires > now);
    
    if (existing) {
        existing.expires += 10000;
    } else {
        state.activePowerups.push({
            type: type,
            activated: now,
            expires: now + 10000
        });
        
        switch (type) {
            case 'multi':
                // Tambahkan 1 bola baru untuk setiap bola yang aktif
                const newBalls = [];
                state.activeBalls.forEach(ball => {
                    const newBall = {
                        ...ball,
                        x: ball.x,
                        y: ball.y,
                        dx: (Math.random() - 0.5) * 6,
                        dy: -Math.abs(ball.dy),
                        isFiring: false,
                        trail: [],
                        speed: ball.speed
                    };
                    newBalls.push(newBall);
                });
                state.activeBalls = state.activeBalls.concat(newBalls);
                break;
                
            case 'fire':
                state.activeBalls.forEach(b => b.isFiring = true);
                break;
                
            case 'extra':
                const newBall = {
                    ...ball,
                    x: paddle.x + paddle.width / 2,
                    y: paddle.y - 30,
                    dx: (Math.random() - 0.5) * 6,
                    dy: -5,
                    isFiring: false,
                    trail: [],
                    speed: ball.speed
                };
                state.activeBalls.push(newBall);
                break;
        }
    }
    vibrate(100);
}

function checkCollisions() {
    const now = Date.now();
    
    // Hapus powerup yang sudah kadaluarsa
    state.activePowerups = state.activePowerups.filter(p => {
        if (p.expires <= now) {
            if (p.type === 'fire') {
                state.activeBalls.forEach(b => b.isFiring = false);
            }
            return false;
        }
        return true;
    });
    
    // Periksa tabrakan bola dengan dinding dan paddle
    state.activeBalls.forEach(ball => {
        if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
            ball.dx = -ball.dx;
            playSound('bounce');
            createParticles(ball.x, ball.y, '#ffffff', 4);
        }
        
        if (ball.y - ball.radius < 0) {
            ball.dy = -ball.dy;
            playSound('bounce');
            createParticles(ball.x, ball.y, '#ffffff', 4);
        }
        
        if (ball.y + ball.radius > canvas.height) {
            if (state.activeBalls.length > 1) {
                state.activeBalls = state.activeBalls.filter(b => b !== ball);
            } else {
                state.isGameOver = true;
                playSound('lose');
            }
        }
        
        if (ball.y + ball.radius > paddle.y && 
            ball.y - ball.radius < paddle.y + paddle.height &&
            ball.x > paddle.x && 
            ball.x < paddle.x + paddle.width) {
            const hitPos = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
            const angle = hitPos * (Math.PI / 3);
            ball.dx = ball.speed * Math.sin(angle);
            ball.dy = -ball.speed * Math.cos(angle);
            if (Math.abs(ball.dx) < 1) {
                ball.dx = ball.dx > 0 ? 1 : -1;
            }
            playSound('paddle');
            createParticles(ball.x, ball.y, paddle.color, 6);
            vibrate(50);
        }
    });
    
    // Periksa tabrakan bola dengan blok
    for (let i = blocks.length - 1; i >= 0; i--) {
        const block = blocks[i];
        
        state.activeBalls.forEach(ball => {
            if (ball.x + ball.radius > block.x && 
                ball.x - ball.radius < block.x + block.width &&
                ball.y + ball.radius > block.y && 
                ball.y - ball.radius < block.y + block.height) {
                
                if (block.indestructible) {
                    playSound('block');
                } else {
                    const damage = ball.isFiring ? block.hitPoints : 1;
                    block.hitPoints -= damage;
                    playSound('block');
                    createParticles(ball.x, ball.y, block.color);
                    
                    // Ubah warna blok berdasarkan hitPoints yang tersisa
                    if (block.hitPoints > 0) {
                        const colorIndex = block.hitPoints - 1;
                        block.color = config.blockColors[colorIndex];
                    }
                    
                    if (block.hitPoints <= 0) {
                        state.score += block.points;
                        createPowerup(block.x + block.width / 2, block.y + block.height / 2);
                        blocks.splice(i, 1);
                        state.blocksToClear--;
                        
                        if (state.blocksToClear <= 0) {
                            if (state.gameMode === 'arcade') {
                                state.level++;
                                state.arcadeSpeed += config.levels.arcadeSpeedIncrease;
                                playSound('level');
                                setTimeout(() => {
                                    createBlocks();
                                }, 1000);
                            } else {
                                state.isGameWon = true;
                                playSound('win');
                                if (state.gameMode === 'level') {
                                    saveProgress();
                                }
                            }
                        }
                    }
                }
                
                // Hitung arah pantulan
                const ballLeft = ball.x - ball.radius;
                const ballRight = ball.x + ball.radius;
                const ballTop = ball.y - ball.radius;
                const ballBottom = ball.y + ball.radius;
                const blockLeft = block.x;
                const blockRight = block.x + block.width;
                const blockTop = block.y;
                const blockBottom = block.y + block.height;
                const overlapX = Math.min(ballRight - blockLeft, blockRight - ballLeft);
                const overlapY = Math.min(ballBottom - blockTop, blockBottom - ballTop);
                
                if (overlapX < overlapY) {
                    ball.dx = -ball.dx;
                } else {
                    ball.dy = -ball.dy;
                }
            }
        });
    }
    
    // Periksa tabrakan powerup dengan paddle
    for (let i = state.fallingPowerups.length - 1; i >= 0; i--) {
        const powerup = state.fallingPowerups[i];
        if (powerup.y + powerup.height > paddle.y && 
            powerup.y < paddle.y + paddle.height &&
            powerup.x + powerup.width > paddle.x && 
            powerup.x < paddle.x + paddle.width) {
            applyPowerup(powerup.type);
            playSound('powerup');
            state.fallingPowerups.splice(i, 1);
        } else if (powerup.y > canvas.height) {
            state.fallingPowerups.splice(i, 1);
        }
    }
    
    // Mode arcade: turunkan blok dan tambahkan blok baru secara berkala
    if (state.gameMode === 'arcade' && Date.now() - state.lastDropTime > config.levels.arcadeDropInterval) {
        state.lastDropTime = Date.now();
        dropBlocks();
    }
}

function dropBlocks() {
    // Turunkan semua blok
    blocks.forEach(block => {
        block.y += config.block.height + config.block.margin;
        if (block.y > canvas.height) {
            blocks.splice(blocks.indexOf(block), 1);
            if (!block.indestructible) {
                state.blocksToClear--;
            }
        }
    });
    
    // Tambahkan blok baru di atas
    const blockWidth = (canvas.width - (config.block.padding * 2) - 
                     (config.block.columns - 1) * config.block.margin) / config.block.columns;
    
    for (let c = 0; c < config.block.columns; c++) {
        if (Math.random() < 0.7) {
            const hitPoints = 3 - Math.floor(Math.random() * 3); // 1, 2, atau 3 hit points
            const colorIndex = hitPoints - 1;
            
            state.blocksToClear++;
            
            blocks.push({
                x: c * (blockWidth + config.block.margin) + config.block.padding,
                y: 60,
                width: blockWidth,
                height: config.block.height,
                color: config.blockColors[colorIndex],
                originalColor: config.blockColors[colorIndex],
                hitPoints: hitPoints,
                points: 10 * (state.level > 10 ? 2 : 1),
                indestructible: false
            });
        }
    }
}

function update() {
    if (!state.gameRunning || state.isPaused || state.isGameOver || state.isGameWon) {
        return;
    }
    
    // Gerakan paddle
    if (keys.right && paddle.x + paddle.width < canvas.width) {
        paddle.x += config.paddle.speed;
    }
    if (keys.left && paddle.x > 0) {
        paddle.x -= config.paddle.speed;
    }
    
    // Gerakan bola
    state.activeBalls.forEach(ball => {
        ball.trail.push({ x: ball.x, y: ball.y });
        if (ball.trail.length > 10) {
            ball.trail.shift();
        }
        
        // Tambahkan kecepatan ekstra di mode arcade
        const speedMultiplier = state.gameMode === 'arcade' ? (1 + state.arcadeSpeed) : 1;
        ball.x += ball.dx * speedMultiplier;
        ball.y += ball.dy * speedMultiplier;
    });
    
    // Gerakan powerup
    state.fallingPowerups.forEach(powerup => {
        powerup.y += powerup.dy;
    });
    
    // Update partikel
    particles = particles.filter(particle => {
        particle.x += particle.dx;
        particle.y += particle.dy;
        particle.dy += 0.2;
        particle.life--;
        return particle.life > 0;
    });
    
    checkCollisions();
    updateUI();
    
    if (state.isGameOver) {
        if (state.gameMode === 'arcade') {
            showOverlay('Game Over', `Your score: ${state.score}`, true);
        } else {
            showOverlay('Level Failed', `Try again!`, false);
        }
    } else if (state.isGameWon) {
        if (state.gameMode === 'arcade') {
            showOverlay('You Win!', `Score: ${state.score}`, true);
        } else {
            showOverlay('Level Complete!', `Score: ${state.score}`, false);
        }
    }
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Gambar partikel
    particles.forEach(particle => {
        const alpha = particle.life / particle.maxLife;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
    });
    
    // Gambar blok
    blocks.forEach(block => {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = block.color;
        ctx.fillRect(block.x, block.y, block.width, block.height);
        
        if (!block.indestructible) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(block.x, block.y, block.width, 5);
        }
        
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(block.x, block.y, block.width, block.height);
    });
    
    // Gambar paddle
    ctx.shadowColor = 'rgba(102, 126, 234, 0.5)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = config.paddle.color;
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(paddle.x, paddle.y, paddle.width, 5);
    ctx.shadowBlur = 0;
    
    // Gambar bola
    state.activeBalls.forEach(ball => {
        // Gambar trail bola
        ball.trail.forEach((pos, index) => {
            const alpha = index / ball.trail.length;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, ball.radius * alpha, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
            ctx.fill();
        });
        
        // Gambar efek fire ball
        if (ball.isFiring) {
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius + 6, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(248, 113, 113, 0.3)';
            ctx.fill();
        }
        
        // Gambar bola utama
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = ball.isFiring ? '#f87171' : config.ball.color;
        ctx.fill();
        
        // Gambar highlight bola
        ctx.beginPath();
        ctx.arc(ball.x - 2, ball.y - 2, ball.radius / 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();
    });
    
    // Gambar powerup
    state.fallingPowerups.forEach(powerup => {
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        let color;
        switch (powerup.type) {
            case 'multi': color = '#a78bfa'; break;
            case 'fire': color = '#f87171'; break;
            case 'extra': color = '#4ade80'; break;
        }
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(powerup.x + powerup.width/2, powerup.y + powerup.height/2, powerup.width/2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    });
}

function gameLoop() {
    update();
    render();
    animationId = requestAnimationFrame(gameLoop);
}

function pauseGame() {
    if (!state.gameRunning || state.isGameOver || state.isGameWon) return;
    
    // Simpan state game sebelum pause
    state.gameStateBeforePause = {
        paddle: {...paddle},
        activeBalls: state.activeBalls.map(ball => ({...ball})),
        blocks: blocks.map(block => ({...block})),
        fallingPowerups: state.fallingPowerups.map(powerup => ({...powerup})),
        particles: particles.map(particle => ({...particle})),
        score: state.score,
        level: state.level
    };
    
    state.isPaused = true;
    state.gameRunning = false;
    showOverlay('Game Paused', `Level ${state.level}`, false);
}

function continueGame() {
    if (!state.isPaused) return;
    
    // Kembalikan state game setelah pause
    if (state.gameStateBeforePause) {
        paddle = {...state.gameStateBeforePause.paddle};
        state.activeBalls = state.gameStateBeforePause.activeBalls.map(ball => ({...ball}));
        blocks = state.gameStateBeforePause.blocks.map(block => ({...block}));
        state.fallingPowerups = state.gameStateBeforePause.fallingPowerups.map(powerup => ({...powerup}));
        particles = state.gameStateBeforePause.particles.map(particle => ({...particle}));
        state.score = state.gameStateBeforePause.score;
        state.level = state.gameStateBeforePause.level;
    }
    
    hideOverlay();
    state.isPaused = false;
    state.gameRunning = true;
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    gameLoop();
}

function restartGame() {
    hideOverlay();
    state.isPaused = false;
    startGame(state.level);
}

function returnToMenu() {
    if (state.gameRunning && !state.isPaused) {
        if (confirm('Are you sure you want to exit to menu? Your progress will be lost.')) {
            hideOverlay();
            showMenu();
        }
    } else {
        hideOverlay();
        showMenu();
    }
}

function updateUI() {
    scoreElement.textContent = state.score;
    levelElement.textContent = state.level;
}

function showOverlay(title, subtitle, showNameInput = false) {
    state.gameRunning = false;
    overlayTitle.textContent = title;
    overlaySubtitle.textContent = subtitle;
    
    if (showNameInput) {
        nameInputContainer.style.display = 'block';
        playerNameInput.focus();
    } else {
        nameInputContainer.style.display = 'none';
    }
    
    let buttonsHTML = '';
    
    if (state.isPaused) {
        buttonsHTML = `
            <button type="button" class="btn btn-primary" id="continueBtn">Continue</button>
            <button type="button" class="btn btn-secondary" id="restartBtn">Restart Level</button>
            <button type="button" class="btn btn-secondary" id="menuFromOverlayBtn">Main Menu</button>
        `;
    } else if (state.isGameWon && state.gameMode === 'level' && state.level < config.levels.max) {
        buttonsHTML = `
            <button type="button" class="btn btn-primary" id="nextLevelBtn">Next Level</button>
            <button type="button" class="btn btn-secondary" id="levelSelectFromOverlayBtn">Level Select</button>
            <button type="button" class="btn btn-secondary" id="menuFromOverlayBtn">Main Menu</button>
        `;
    } else if (state.isGameOver || state.isGameWon) {
        if (state.gameMode === 'arcade') {
            buttonsHTML = `
                <button type="button" class="btn btn-primary" id="saveScoreBtn">Save Score</button>
                <button type="button" class="btn btn-secondary" id="menuFromOverlayBtn">Main Menu</button>
            `;
        } else {
            buttonsHTML = `
                <button type="button" class="btn btn-primary" id="restartBtn">Try Again</button>
                <button type="button" class="btn btn-secondary" id="menuFromOverlayBtn">Main Menu</button>
            `;
        }
    }
    
    overlayButtons.innerHTML = buttonsHTML;
    
    gameOverlay.classList.add('active');
    setTimeout(() => {
        overlayContent.classList.add('show');
    }, 100);
}

function hideOverlay() {
    overlayContent.classList.remove('show');
    setTimeout(() => {
        gameOverlay.classList.remove('active');
    }, 500);
}

function renderLevelSelect() {
    levelsContainer.innerHTML = '';
    for (let i = 1; i <= config.levels.max; i++) {
        const levelBtn = document.createElement('button');
        levelBtn.className = 'level-btn';
        levelBtn.textContent = i;
        if (i > state.highestLevel) {
            levelBtn.classList.add('locked');
        } else if (i < state.highestLevel) {
            levelBtn.classList.add('completed');
        }
        levelBtn.addEventListener('click', () => {
            if (!levelBtn.classList.contains('locked')) {
                state.gameMode = 'level';
                state.challengeMode = false;
                startGame(i);
            }
        });
        levelsContainer.appendChild(levelBtn);
    }
}

function saveProgress() {
    if (state.level >= state.highestLevel && state.gameMode === 'level') {
        state.highestLevel = Math.min(state.level + 1, config.levels.max);
        try {
            localStorage.setItem('blockbastProgress', JSON.stringify({
                highestLevel: state.highestLevel
            }));
            renderLevelSelect();
        } catch (e) {
            console.error('Error saving progress', e);
        }
    }
}

function loadProgress() {
    const progressData = localStorage.getItem('blockbastProgress');
    try {
        const progress = progressData ? JSON.parse(progressData) : {};
        state.highestLevel = progress.highestLevel || 1;
    } catch (e) {
        console.error('Error loading progress', e);
        state.highestLevel = 1;
    }
}

function saveHighScore() {
    if (state.gameMode !== 'arcade') return;
    
    let name = 'Player';
    if (playerNameInput.value.trim()) {
        name = playerNameInput.value.trim().substring(0, 10);
    }
    
    try {
        const scoresData = localStorage.getItem('blockbastHighScores') || '{}';
        const highScores = JSON.parse(scoresData);
        if (!highScores.arcade) highScores.arcade = [];
        
        highScores.arcade.push({
            name: name,
            score: state.score,
            level: state.level,
            date: new Date().toLocaleDateString()
        });
        
        highScores.arcade.sort((a, b) => b.score - a.score);
        if (highScores.arcade.length > 10) {
            highScores.arcade = highScores.arcade.slice(0, 10);
        }
        
        localStorage.setItem('blockbastHighScores', JSON.stringify(highScores));
        updateHighScores('arcade');
    } catch (e) {
        console.error('Error saving high score', e);
    }
}

function updateHighScores(mode) {
    let highScores = {};
    try {
        const scoresData = localStorage.getItem('blockbastHighScores');
        highScores = scoresData ? JSON.parse(scoresData) : {};
    } catch (e) {
        console.error('Error loading high scores', e);
    }
    
    scoresList.innerHTML = '';
    
    if (!highScores[mode] || highScores[mode].length === 0) {
        scoresList.innerHTML = '<div class="score-item" style="justify-content: center;"><div>No scores yet!</div></div>';
        return;
    }
    
    highScores[mode].forEach((score, index) => {
        const scoreItem = document.createElement('div');
        scoreItem.className = 'score-item';
        scoreItem.innerHTML = `
            <div class="score-rank">#${index + 1}</div>
            <div class="score-name">${score.name}</div>
            <div class="score-points">${score.score}</div>
            <div class="score-level">Lvl ${score.level}</div>
            <div class="score-date">${score.date}</div>
        `;
        scoresList.appendChild(scoreItem);
    });
}

function updateTheme() {
    if (themeToggle.checked) {
        document.body.classList.remove('light-theme');
    } else {
        document.body.classList.add('light-theme');
    }
    saveSettings();
}

function saveSettings() {
    const settings = {
        darkMode: !themeToggle.checked,
        sound: soundToggle.checked,
        vibration: vibrationToggle.checked
    };
    try {
        localStorage.setItem('blockbastSettings', JSON.stringify(settings));
    } catch (e) {
        console.error('Error saving settings', e);
    }
}

function loadSettings() {
    try {
        const saved = localStorage.getItem('blockbastSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            if (settings.darkMode !== undefined) {
                themeToggle.checked = !settings.darkMode;
            }
            if (settings.sound !== undefined) {
                soundToggle.checked = settings.sound;
            }
            if (settings.vibration !== undefined) {
                vibrationToggle.checked = settings.vibration;
            }
            updateTheme();
        }
    } catch (e) {
        console.error('Error loading settings', e);
    }
}

function playSound(type) {
    if (!soundToggle.checked) return;
    console.log(`Play sound: ${type}`);
}

function vibrate(duration) {
    if (vibrationToggle.checked && 'vibrate' in navigator) {
        navigator.vibrate(duration);
    }
}

window.onload = function() {
    initApp();
};

document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.gameRunning && !state.isPaused) {
        pauseGame();
    }
});