class PuzzleGame {
    constructor(containerId, imageSrc, difficulty = 3) {
        this.container = document.getElementById(containerId);
        // Clean up previous canvas if any (though container usually cleared by render)
        this.container.innerHTML = '';

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.imageSrc = imageSrc;
        this.difficulty = difficulty; // 3x3
        this.tileSize = 0;
        this.board = [];
        this.emptyTile = { x: difficulty - 1, y: difficulty - 1 };
        this.isSolved = false;
        this.moves = 0;
        this.startTime = null;
        this.timerInterval = null;
        this.usePattern = false; // Fallback mode
        this.animationFrameId = null; // Track animation frame for cleanup

        this.image = new Image();
        this.image.onload = () => {
            this.usePattern = false;
            this.init();
        };
        this.image.onerror = () => {
            console.warn("Puzzle image failed to load, switching to pattern mode.");
            this.usePattern = true;
            this.init();
        };
        this.image.src = this.imageSrc;

        // Particles system
        this.particles = [];

        // Bind events
        this.handleInput = this.handleInput.bind(this);
        this.handleResize = this.resize.bind(this); // Bind specifically for removal

        // Mouse click
        this.canvas.addEventListener('mousedown', (e) => this.handleInput(e));
        // Touch support (prevent default scroll)
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const fakeEvent = {
                clientX: touch.clientX,
                clientY: touch.clientY
            };
            this.handleInput(fakeEvent);
        }, { passive: false });

        // Resize listener
        window.addEventListener('resize', this.handleResize);
    }

    // --- CLEANUP METHOD ---
    destroy() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        window.removeEventListener('resize', this.handleResize);

        // Remove canvas from DOM if it still exists
        if (this.container && this.container.contains(this.canvas)) {
            this.container.removeChild(this.canvas);
        }
        console.log("PuzzleGame instance destroyed.");
    }

    init() {
        // Wait for layout parameters to be accurate
        // IMPORTANT: initBoard must happen BEFORE draw/resize usage of this.board
        this.animationFrameId = requestAnimationFrame(() => {
            this.initBoard(); // 1. Create Data
            this.resize();    // 2. Calculate Metrics & Draw
            this.scramble();  // 3. Randomize
            this.draw();      // 4. Final Render

            // Start Timer
            if (this.timerInterval) clearInterval(this.timerInterval);
            this.startTime = Date.now();
            this.timerInterval = setInterval(() => this.updateTimer(), 1000);
            this.isSolved = false;

            // Reset UI
            const movesEl = document.getElementById('puzzle-moves');
            const timerEl = document.getElementById('puzzle-timer');
            if (movesEl) movesEl.innerText = "0";
            if (timerEl) timerEl.innerText = "0:00";
        });
    }

    resize() {
        if (!this.container) return;

        const maxWidth = this.container.clientWidth || 300;
        const maxHeight = window.innerHeight * 0.6; // Max 60% view height
        const size = Math.min(maxWidth, maxHeight);

        // Ensure even size
        const roundedSize = Math.floor(size / this.difficulty) * this.difficulty;

        this.canvas.width = roundedSize;
        this.canvas.height = roundedSize;
        this.tileSize = roundedSize / this.difficulty;

        this.draw();
    }

    // ... (initBoard, scramble, getNeighbors, handleInput, canMove, swap match previous robust version)
    initBoard() {
        this.board = [];
        for (let y = 0; y < this.difficulty; y++) {
            this.board[y] = [];
            for (let x = 0; x < this.difficulty; x++) {
                if (x === this.difficulty - 1 && y === this.difficulty - 1) {
                    this.board[y][x] = null; // Empty slot
                } else {
                    this.board[y][x] = { x, y }; // Original position
                }
            }
        }
        this.emptyTile = { x: this.difficulty - 1, y: this.difficulty - 1 };
    }

    scramble() {
        const moves = 100;
        let lastMove = null;

        for (let i = 0; i < moves; i++) {
            const neighbors = this.getNeighbors(this.emptyTile.x, this.emptyTile.y);
            const candidates = neighbors.filter(n => !lastMove || (n.x !== lastMove.x || n.y !== lastMove.y));

            if (candidates.length > 0) {
                const move = candidates[Math.floor(Math.random() * candidates.length)];
                this.swap(move.x, move.y);
                lastMove = this.emptyTile;
            }
        }
        this.moves = 0;
        this.updateStats();
    }

    getNeighbors(x, y) {
        const neighbors = [];
        if (x > 0) neighbors.push({ x: x - 1, y });
        if (x < this.difficulty - 1) neighbors.push({ x: x + 1, y });
        if (y > 0) neighbors.push({ x, y: y - 1 });
        if (y < this.difficulty - 1) neighbors.push({ x, y: y + 1 });
        return neighbors;
    }

    handleInput(e) {
        if (this.isSolved) {
            this.init();
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const tileX = Math.floor(x / this.tileSize);
        const tileY = Math.floor(y / this.tileSize);

        if (this.canMove(tileX, tileY)) {
            this.swap(tileX, tileY);
            this.moves++;
            this.updateStats();
            this.draw();

            if (this.checkWin()) {
                this.win();
            }
        }
    }

    canMove(x, y) {
        return (Math.abs(x - this.emptyTile.x) + Math.abs(y - this.emptyTile.y)) === 1;
    }

    swap(x, y) {
        if (!this.board[y] || !this.board[this.emptyTile.y]) return; // Guard

        const temp = this.board[y][x];
        this.board[y][x] = this.board[this.emptyTile.y][this.emptyTile.x]; // Should be null
        this.board[this.emptyTile.y][this.emptyTile.x] = temp;

        this.emptyTile = { x, y };
    }

    checkWin() {
        for (let y = 0; y < this.difficulty; y++) {
            if (!this.board[y]) return false;
            for (let x = 0; x < this.difficulty; x++) {
                const tile = this.board[y][x];
                if (tile === null) {
                    if (x !== this.difficulty - 1 || y !== this.difficulty - 1) return false;
                } else {
                    if (tile.x !== x || tile.y !== y) return false;
                }
            }
        }
        return true;
    }

    draw() {
        if (!this.ctx || !this.board || this.board.length === 0) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.usePattern) {
            this.ctx.fillStyle = "#2d0a12";
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        for (let y = 0; y < this.difficulty; y++) {
            if (!this.board[y]) continue;
            for (let x = 0; x < this.difficulty; x++) {
                const tile = this.board[y][x];
                if (tile) {
                    const dx = x * this.tileSize;
                    const dy = y * this.tileSize;
                    const size = this.tileSize - 2;

                    if (this.usePattern) {
                        this.drawPatternTile(dx, dy, size, tile.x, tile.y);
                    } else {
                        // Image mode
                        if (this.image.complete && this.image.naturalHeight !== 0) {
                            const sx = tile.x * (this.image.width / this.difficulty);
                            const sy = tile.y * (this.image.height / this.difficulty);
                            const sw = this.image.width / this.difficulty;
                            const sh = this.image.height / this.difficulty;
                            this.ctx.drawImage(this.image, sx, sy, sw, sh, dx, dy, size, size);
                        } else {
                            this.drawPatternTile(dx, dy, size, tile.x, tile.y);
                        }

                        this.ctx.strokeStyle = '#ff69b4';
                        this.ctx.lineWidth = 1;
                        this.ctx.strokeRect(dx, dy, size, size);
                    }
                }
            }
        }

        if (this.isSolved) {
            this.updateParticles();
            this.drawParticles();
            this.animationFrameId = requestAnimationFrame(() => this.draw());

            this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            this.ctx.fillRect(0, this.canvas.height / 2 - 60, this.canvas.width, 120);

            this.ctx.font = "bold 30px 'Comic Sans MS', cursive";
            this.ctx.fillStyle = "#ff69b4";
            this.ctx.textAlign = "center";
            this.ctx.fillText("JSI ŠIKOVNÁ! 💖", this.canvas.width / 2, this.canvas.height / 2 - 10);

            // Reward (Timer check)
            const diff = Math.floor((Date.now() - this.startTime) / 1000);
            if (diff < 60) {
                this.ctx.font = "italic 16px 'Comic Sans MS'";
                this.ctx.fillStyle = "#ffff00";
                this.ctx.fillText("✨ Odměna za rychlost! ✨", this.canvas.width / 2, this.canvas.height / 2 + 20);

                // Show reward notification if not already shown
                if (!this.rewardShown) {
                    this.rewardShown = true;
                    this.showReward();
                }
            }

            this.ctx.font = "15px Arial";
            this.ctx.fillStyle = "#fff";
            this.ctx.fillText("Klikni pro další hru", this.canvas.width / 2, this.canvas.height / 2 + 45);
        }
    }

    showReward() {
        const funFacts = [
            "Věděla jsi? Moje první slovo nebylo 'máma', ale 'auto'. 🚗",
            "Tajemství: Vždycky když říkám 'jsem na cestě', teprve hledám klíče. 🔑",
            "Fakt: Moje oblíbená barva není modrá, ale 'půlnoční modř'. 🌌",
            "Přiznání: Jednou jsem snědl celou pizzu a svedl to na psa. 🍕",
            "Kdybych byl zvíře, byl bych lenochod s kofeinovým předávkováním. 🦥☕",
            "Můj tajný talent? Dokážu spát 14 hodin v kuse. 😴",
            "Nejraději na tobě mám ten pohled, když se snažíš nezasmát mému vtipu. 😉"
        ];
        const randomFact = funFacts[Math.floor(Math.random() * funFacts.length)];

        setTimeout(() => {
            if (typeof showNotification === 'function') {
                showNotification(`🏆 ODMĚNA: ${randomFact}`, "success", 8000);
            } else {
                alert(`🏆 ODMĚNA:\n${randomFact}`);
            }
        }, 500);
    }

    // ... (keep drawPatternTile, drawHeart, win, updateParticles, drawParticles, updateTimer, updateStats)
    drawPatternTile(dx, dy, size, tx, ty) {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(dx, dy, size, size);
        this.ctx.clip();

        this.ctx.fillStyle = (tx + ty) % 2 === 0 ? "#ff69b4" : "#ff1493";
        this.ctx.fillRect(dx, dy, size, size);

        const cx = dx + size / 2;
        const cy = dy + size / 2;
        const hSize = size * 0.4;

        this.ctx.fillStyle = "#fff0f5";
        this.drawHeart(cx, cy, hSize);

        this.ctx.fillStyle = "rgba(0,0,0,0.2)";
        this.ctx.font = `bold ${size / 3}px 'Comic Sans MS'`;
        this.ctx.textAlign = "right";
        this.ctx.textBaseline = "bottom";
        this.ctx.fillText(`${ty * 3 + tx + 1}`, dx + size - 5, dy + size - 5);

        this.ctx.restore();

        this.ctx.strokeStyle = '#ffb7c5';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(dx, dy, size, size);
    }

    drawHeart(x, y, size) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + size * 0.3);
        this.ctx.bezierCurveTo(x, y, x - size, y - size * 0.5, x - size, y - size);
        this.ctx.bezierCurveTo(x - size, y - size * 1.5, x - size * 0.5, y - size * 1.5, x, y - size);
        this.ctx.bezierCurveTo(x + size * 0.5, y - size * 1.5, x + size, y - size * 1.5, x + size, y - size);
        this.ctx.bezierCurveTo(x + size, y - size * 0.5, x, y, x, y + size * 0.3);
        this.ctx.fill();
    }

    win() {
        this.isSolved = true;
        clearInterval(this.timerInterval);

        for (let i = 0; i < 100; i++) {
            this.particles.push({
                x: this.canvas.width / 2,
                y: this.canvas.height / 2,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15,
                life: 1.0,
                color: `hsl(${Math.random() * 60 + 300}, 100%, 60%)`
            });
        }

        if (typeof triggerHaptic === 'function') triggerHaptic('success');
        if (typeof showNotification === 'function') showNotification("Puzzle vyřešeno! Miluju tě! 💖", "success");
        if (typeof triggerConfetti === 'function') triggerConfetti();

        this.rewardShown = false; // Reset/Prepare flag for next time (though instance usually recreated)
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    drawParticles() {
        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1.0;
    }

    updateTimer() {
        const diff = Math.floor((Date.now() - this.startTime) / 1000);
        const mins = Math.floor(diff / 60);
        const secs = diff % 60;
        const timeStr = `${mins}:${String(secs).padStart(2, '0')}`;

        const el = document.getElementById('puzzle-timer');
        if (el) el.innerText = timeStr;
    }

    updateStats() {
        const el = document.getElementById('puzzle-moves');
        if (el) el.innerText = this.moves;
    }
}
