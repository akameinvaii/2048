(function () {
    const SIZE = 4;
    const WIN_VALUE = 2048;

    const tileContainer = document.getElementById('tileContainer');
    const scoreEl = document.getElementById('score');
    const bestEl = document.getElementById('best');
    const restartBtn = document.getElementById('restartBtn');
    const overlay = document.getElementById('gameOverlay');
    const overlayTitle = document.getElementById('overlayTitle');
    const overlayBtn = document.getElementById('overlayBtn');

    let grid = [];
    let score = 0;
    let bestScore = 0;
    let gameOver = false;
    let won = false;
    let keepPlaying = false;

    // ============ 初始化 ============
    function init() {
        grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
        score = 0;
        gameOver = false;
        won = false;
        keepPlaying = false;
        bestScore = parseInt(localStorage.getItem('2048_best') || '0');
        updateUI();
        overlay.classList.add('hidden');
        addRandomTile();
        addRandomTile();
        renderTiles();
    }

    // ============ 随机方块 ============
    function addRandomTile() {
        const emptyCells = [];
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (grid[r][c] === 0) emptyCells.push({ r, c });
            }
        }
        if (emptyCells.length === 0) return;
        const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        grid[cell.r][cell.c] = Math.random() < 0.9 ? 2 : 4;
    }

    // ============ 移动逻辑 ============
    function slideAndMerge(row) {
        // 去零并合并
        let filtered = row.filter(v => v !== 0);
        const merged = [];
        let mergedFlags = [];

        for (let i = 0; i < filtered.length; i++) {
            if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
                const val = filtered[i] * 2;
                merged.push(val);
                mergedFlags.push(true); // 标记为合并过
                score += val;
                if (val === WIN_VALUE && !won && !keepPlaying) {
                    won = true;
                }
                i++;
            } else {
                merged.push(filtered[i]);
                mergedFlags.push(false);
            }
        }

        while (merged.length < SIZE) merged.push(0);
        while (mergedFlags.length < SIZE) mergedFlags.push(false);

        return { newRow: merged, merged: mergedFlags };
    }

    function getColumn(grid, col) {
        return grid.map(row => row[col]);
    }

    function setColumn(grid, col, values) {
        for (let r = 0; r < SIZE; r++) {
            grid[r][col] = values[r];
        }
    }

    function move(direction) {
        // direction: 0=left, 1=right, 2=up, 3=down
        const oldGrid = grid.map(row => [...row]);
        const mergeMap = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));

        if (direction === 0) {
            // 左
            for (let r = 0; r < SIZE; r++) {
                const result = slideAndMerge(grid[r]);
                grid[r] = result.newRow;
                for (let c = 0; c < SIZE; c++) mergeMap[r][c] = result.merged[c];
            }
        } else if (direction === 1) {
            // 右
            for (let r = 0; r < SIZE; r++) {
                const reversed = [...grid[r]].reverse();
                const result = slideAndMerge(reversed);
                grid[r] = result.newRow.reverse();
                for (let c = 0; c < SIZE; c++) mergeMap[r][SIZE - 1 - c] = result.merged[c];
            }
        } else if (direction === 2) {
            // 上
            for (let c = 0; c < SIZE; c++) {
                const col = getColumn(grid, c);
                const result = slideAndMerge(col);
                setColumn(grid, c, result.newRow);
                for (let r = 0; r < SIZE; r++) mergeMap[r][c] = result.merged[r];
            }
        } else if (direction === 3) {
            // 下
            for (let c = 0; c < SIZE; c++) {
                const col = getColumn(grid, c).reverse();
                const result = slideAndMerge(col);
                const reversed = result.newRow.reverse();
                setColumn(grid, c, reversed);
                for (let r = 0; r < SIZE; r++) mergeMap[SIZE - 1 - r][c] = result.merged[r];
            }
        }

        // 检查是否有变化
        let changed = false;
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (grid[r][c] !== oldGrid[r][c]) changed = true;
            }
        }

        if (changed) {
            if (won && !keepPlaying) {
                updateUI();
                renderTiles(mergeMap);
                showWin();
                return;
            }
            addRandomTile();
            updateUI();
            renderTiles(mergeMap);
            if (isGameOver()) {
                gameOver = true;
                updateUI();
                renderTiles();
                showGameOver();
            }
        }
    }

    // ============ 游戏状态检查 ============
    function isGameOver() {
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (grid[r][c] === 0) return false;
                if (c < SIZE - 1 && grid[r][c] === grid[r][c + 1]) return false;
                if (r < SIZE - 1 && grid[r][c] === grid[r + 1][c]) return false;
            }
        }
        return true;
    }

    // ============ 渲染 ============
    function renderTiles(mergeMap = null) {
        tileContainer.innerHTML = '';

        const containerWidth = tileContainer.clientWidth;
        const gap = 12;
        const totalGaps = gap * (SIZE + 1);
        const cellSize = (containerWidth - totalGaps) / SIZE;

        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                const value = grid[r][c];
                if (value === 0) continue;

                const tile = document.createElement('div');
                tile.className = 'tile';
                tile.textContent = value;

                // 颜色类
                if (value <= 2048) {
                    tile.classList.add('tile-' + value);
                } else {
                    tile.classList.add('tile-super');
                }

                // 合并动画
                if (mergeMap && mergeMap[r][c]) {
                    tile.classList.add('merged');
                }

                // 位置
                tile.style.left = (gap + c * (cellSize + gap)) + 'px';
                tile.style.top = (gap + r * (cellSize + gap)) + 'px';
                tile.style.width = cellSize + 'px';
                tile.style.height = cellSize + 'px';

                // 字号
                const len = String(value).length;
                let fontSize;
                if (len <= 2) fontSize = Math.max(cellSize * 0.45, 20);
                else if (len === 3) fontSize = Math.max(cellSize * 0.36, 16);
                else fontSize = Math.max(cellSize * 0.28, 12);
                tile.style.fontSize = fontSize + 'px';

                tileContainer.appendChild(tile);
            }
        }
    }

    function updateUI() {
        scoreEl.textContent = score;
        if (score > bestScore || bestScore === 0) {
            bestScore = score;
            localStorage.setItem('2048_best', bestScore);
        }
        bestEl.textContent = bestScore;
    }

    function showWin() {
        overlay.classList.remove('hidden');
        overlayTitle.textContent = '你赢了! 🎉';
        overlayBtn.textContent = '继续游戏';
        overlayBtn.onclick = () => {
            keepPlaying = true;
            overlay.classList.add('hidden');
        };
    }

    function showGameOver() {
        overlay.classList.remove('hidden');
        overlayTitle.textContent = '游戏结束!';
        overlayBtn.textContent = '再来一局';
        overlayBtn.onclick = init;
    }

    // ============ 键盘事件 ============
    document.addEventListener('keydown', (e) => {
        if (gameOver) return;
        if (won && !keepPlaying) return;

        switch (e.key) {
            case 'ArrowLeft':  e.preventDefault(); move(0); break;
            case 'ArrowRight': e.preventDefault(); move(1); break;
            case 'ArrowUp':    e.preventDefault(); move(2); break;
            case 'ArrowDown':  e.preventDefault(); move(3); break;
        }
    });

    // ============ 触屏滑动 ============
    let touchStartX = 0, touchStartY = 0;
    const MIN_SWIPE = 30;

    tileContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    tileContainer.addEventListener('touchend', (e) => {
        if (gameOver || (won && !keepPlaying)) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (Math.max(absDx, absDy) < MIN_SWIPE) return;

        if (absDx > absDy) {
            move(dx > 0 ? 1 : 0);
        } else {
            move(dy > 0 ? 3 : 2);
        }
    });

    // ============ 按钮 ============
    restartBtn.addEventListener('click', init);
    overlayBtn.addEventListener('click', init);

    // ============ 窗口大小变更时重绘 ============
    window.addEventListener('resize', () => renderTiles());

    // ============ 启动 ============
    init();
})();