// 迷宫探险游戏

// 排行榜管理器类
class LeaderboardManager {
  constructor() {
    this.maxEntries = 10; // 每个难度存储前 10 名
  }

  // 获取指定难度的排行榜
  getLeaderboard(difficulty) {
    const data = localStorage.getItem(`leaderboard_${difficulty}`);
    return data ? JSON.parse(data) : [];
  }

  // 保存排行榜
  saveLeaderboard(difficulty, entries) {
    localStorage.setItem(`leaderboard_${difficulty}`, JSON.stringify(entries));
  }

  // 添加新记录
  addEntry(difficulty, entry) {
    const leaderboard = this.getLeaderboard(difficulty);
    leaderboard.push(entry);
    // 排序：星星多优先，时间少优先
    leaderboard.sort((a, b) => {
      if (b.stars !== a.stars) return b.stars - a.stars;
      return a.totalTime - b.totalTime;
    });
    // 保留前 10 名
    leaderboard.splice(this.maxEntries);
    this.saveLeaderboard(difficulty, leaderboard);
  }

  // 获取排名
  getRank(difficulty, entry) {
    const leaderboard = this.getLeaderboard(difficulty);
    // 计算比当前条目更好的数量
    let rank = 1;
    for (const other of leaderboard) {
      if (
        other.stars > entry.stars ||
        (other.stars === entry.stars && other.totalTime < entry.totalTime)
      ) {
        rank++;
      }
    }
    return Math.min(rank, this.maxEntries + 1);
  }
}

class SoundManager {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.sfxVolume = 0.5;
    this.isMuted = false;
    this.initialized = false;
  }

  // 初始化 AudioContext（需要用户交互触发）
  init() {
    if (this.initialized) return;

    try {
      this.audioContext = new (
        window.AudioContext || window.webkitAudioContext
      )();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.sfxVolume;
      this.masterGain.connect(this.audioContext.destination);
      this.initialized = true;
    } catch (e) {
      console.warn("Web Audio API 不支持:", e);
    }
  }

  // 确保 AudioContext 已就绪
  ensureContext() {
    if (!this.initialized) this.init();
    if (!this.audioContext) return null;
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  // 播放合成音效
  playTone(frequency, type, duration, slideTo = null) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (slideTo) {
      oscillator.frequency.linearRampToValueAtTime(slideTo, now + duration);
    }

    gainNode.connect(this.masterGain);
    oscillator.connect(gainNode);

    gainNode.gain.setValueAtTime(this.sfxVolume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  // 播放移动音效（短促的"哒哒"声）
  playMove() {
    this.playTone(200 + Math.random() * 50, "sine", 0.08);
  }

  // 播放星星音效（清脆的上行音阶）
  playStar() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      gain.gain.setValueAtTime(0.3, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.2);

      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.2);
    });
  }

  // 播放障碍物音效（沉闷的撞击声）
  playObstacle() {
    this.playTone(150, "square", 0.15);
  }

  // 播放胜利音效（简单上升音调）
  playWin() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // 简单上升音调表示胜利
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.frequency.setValueAtTime(freq, now + i * 0.15);
      gain.gain.setValueAtTime(0.3, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.2);

      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.2);
    });
  }

  // 播放失败音效（简单下降音调）
  playLose() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // 简单下降音调表示失败
    [440.0, 392.0, 330.0].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.frequency.setValueAtTime(freq, now + i * 0.2);
      gain.gain.setValueAtTime(0.25, now + i * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.2 + 0.25);

      osc.start(now + i * 0.2);
      osc.stop(now + i * 0.2 + 0.25);
    });
  }

  // 播放背景音乐
  playBGM() {
    if (this.bgmPlaying) return;

    this.bgmAudio.play().catch((e) => {
      console.warn("背景音乐播放失败:", e);
    });
    this.bgmPlaying = true;
  }

  // 停止背景音乐
  stopBGM() {
    this.bgmAudio.pause();
    this.bgmAudio.currentTime = 0;
    this.bgmPlaying = false;
  }

  // 设置音效音量
  setSFXVolume(volume) {
    this.sfxVolume = volume;
    if (this.masterGain) {
      this.masterGain.gain.value = volume;
    }
  }

  // 静音/取消静音
  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : this.sfxVolume;
    }
    return this.isMuted;
  }

  // 检查是否静音
  isCurrentlyMuted() {
    return this.isMuted;
  }
}

class MazeGame {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");

    // 音效管理器
    this.soundManager = new SoundManager();

    // 排行榜管理器
    this.leaderboardManager = new LeaderboardManager();

    // 关卡系统
    this.currentLevel = 1;
    this.maxLevels = { 5: 10, 10: 10, 15: 10 }; // 每个难度 10 个关卡
    this.totalBrooms = 0; // 累计扫把总数（跨关卡）
    this.firstGameStarted = false; // 是否第一次开始游戏
    this.accumulatedStars = 0; // 累计收集星星总数
    this.isNextLevelCall = false; // 是否从下一关按钮调用
    this.prevCols = 10; // 记录上一次的难度（格子数）
    this.levelTime = 0; // 当前关卡剩余时间
    this.timeResetOnLevelChange = true; // 是否每关重置时间
    this.levelStartTime = 0; // 当前关卡开始的时间戳

    // 游戏配置
    this.cellSize = 0;
    this.cols = 10;
    this.rows = 10;
    this.maze = [];
    this.player = { x: 0, y: 0 };
    this.goal = { x: 0, y: 0 };
    this.stars = [];
    this.starsCollected = 0;
    this.totalStars = 3;
    this.obstacles = []; // 路障
    this.broomItem = null; // 扫把道具
    this.hasBroom = false; // 是否拥有扫把
    this.broomCount = 0; // 扫把数量
    this.steps = 0;
    this.maxSteps = 50; // 最大步数
    this.timer = 0;
    this.timerInterval = null;
    this.gameStarted = false;
    this.gameWon = false;
    this.gameLost = false; // 游戏失败状态

    // 保存当前关卡的游戏状态（用于重玩）
    this.savedMaze = [];
    this.savedStars = [];
    this.savedObstacles = [];
    this.savedBroomItem = null;

    // 每关数据记录（用于排行榜计算）- 使用 Map 按关卡 ID 存储
    // key: 关卡 ID (难度 + 关卡号), value: { stars, time }
    this.levelProgress = new Map();

    // 绑定事件
    this.bindEvents();

    // 初始化游戏界面（不启动计时器）
    this.initGame();
  }

  bindEvents() {
    // 键盘控制
    document.addEventListener("keydown", (e) => this.handleKeyPress(e));

    // 难度选择改变
    document
      .getElementById("difficulty")
      .addEventListener("change", () => this.showConfirmRestartDialog());

    // 新游戏按钮
    document.getElementById("newGameBtn").addEventListener("click", () => {
      this.newGame();
      // 启动计时器
      // 如果遮罩层显示中，禁止键盘操作
      const overlay = document.getElementById("gameOverlay");
      if (overlay && overlay.classList.contains("hidden")) this.startTimer();
    });

    // 静音按钮
    document.getElementById("muteBtn").addEventListener("click", () => {
      const isMuted = this.soundManager.toggleMute();
      const btn = document.getElementById("muteBtn");
      btn.textContent = isMuted ? "🔇 已静音" : "🔊 静音";
      btn.classList.toggle("muted", isMuted);
    });

    // 排行榜按钮
    document.getElementById("leaderboardBtn").addEventListener("click", () => {
      toggleLeaderboardPanel();
    });

    // 添加测试数据按钮
    document.getElementById("addTestDataBtn").addEventListener("click", () => {
      addTestData();
    });

    // 开始游戏按钮（遮罩层）
    document
      .getElementById("startGameBtn")
      .addEventListener("click", () => this.onStartGame());

    // 下一关按钮
    document.getElementById("nextLevelBtn").addEventListener("click", () => {
      this.hideWinMessage();
      this.nextLevel();
    });

    // 重玩本关按钮
    document.getElementById("replayLevelBtn").addEventListener("click", () => {
      this.hideWinMessage();
      this.replayLevel();
    });

    // 再玩一次按钮
    if (document.getElementById("playAgainBtn")) {
      document.getElementById("playAgainBtn").addEventListener("click", () => {
        this.hideWinMessage();
        this.accumulatedStars = 0; // 再玩一次时重置累计星星
        this.newGame();
        // 再玩一次要启动计时器
        this.startTimer();
      });
    }

    // 重新开始按钮（失败时使用）
    document.getElementById("restartBtn").addEventListener("click", () => {
      this.currentLevel = 1;
      this.accumulatedStars = 0; // 重新开始游戏时重置累计星星
      this.gameLost = false;
      this.newGame();
      // 失败后重新开始要启动计时器
      this.startTimer();
    });
  }

  // 获取难度提示文本
  getDifficultyTip() {
    const cols = parseInt(document.getElementById("difficulty").value);
    const level = this.currentLevel;

    const tips = {
      5: {
        1: "🌟 第 1 关 - 初出茅庐！5×5 迷宫，14 步",
        2: "🌟 第 2 关 - 稍有挑战！5×5 迷宫，14 步",
        3: "🌟 第 3 关 - 稳步前进！5×5 迷宫，14 步",
        4: "🌟 第 4 关 - 渐入佳境！5×5 迷宫，14 步",
        5: "🌟 第 5 关 - 游刃有余！5×5 迷宫，14 步",
        6: "🌟 第 6 关 - 轻松应对！5×5 迷宫，14 步",
        7: "🌟 第 7 关 - 游刃有余！5×5 迷宫，14 步",
        8: "🌟 第 8 关 - 轻松过关！5×5 迷宫，14 步",
        9: "🌟 第 9 关 - 挑战自我！5×5 迷宫，14 步",
        10: "🌟 第 10 关 - 完美通关！5×5 迷宫，14 步",
      },
      10: {
        1: "⚡ 第 1 关 - 中等难度！10×10 迷宫，35 步",
        2: "⚡ 第 2 关 - 路障出现！10×10 迷宫，35 步",
        3: "⚡ 第 3 关 - 小心绕路！10×10 迷宫，35 步",
        4: "⚡ 第 4 关 - 更加复杂！10×10 迷宫，35 步",
        5: "⚡ 第 5 关 - 终极考验！10×10 迷宫，35 步",
        6: "⚡ 第 6 关 - 挑战极限！10×10 迷宫，35 步",
        7: "⚡ 第 7 关 - 突破自我！10×10 迷宫，35 步",
        8: "⚡ 第 8 关 - 勇往直前！10×10 迷宫，35 步",
        9: "⚡ 第 9 关 - 巅峰对决！10×10 迷宫，35 步",
        10: "⚡ 第 10 关 - 完美通关！10×10 迷宫，35 步",
      },
      15: {
        1: "🔥 第 1 关 - 高手入门！15×15 迷宫，70 步",
        2: "🔥 第 2 关 - 路障增多！15×15 迷宫，70 步",
        3: "🔥 第 3 关 - 路径复杂！15×15 迷宫，70 步",
        4: "🔥 第 4 关 - 考验技巧！15×15 迷宫，70 步",
        5: "🔥 第 5 关 - 传奇挑战！15×15 迷宫，70 步",
        6: "🔥 第 6 关 - 挑战极限！15×15 迷宫，70 步",
        7: "🔥 第 7 关 - 突破自我！15×15 迷宫，70 步",
        8: "🔥 第 8 关 - 勇往直前！15×15 迷宫，70 步",
        9: "🔥 第 9 关 - 巅峰对决！15×15 迷宫，70 步",
        10: "🔥 第 10 关 - 完美通关！15×15 迷宫，70 步",
      },
    };

    return tips[cols]?.[level] || "🎮 开始游戏吧！";
  }

  updateDifficultyTip() {
    const tipElement = document.getElementById("difficultyTip");
    if (tipElement) {
      tipElement.textContent = this.getDifficultyTip();
    }
  }

  showConfirmRestartDialog() {
    // 如果 mask 层已经显示，说明不需要再显示确认对话框，直接切换
    const overlay = document.getElementById("gameOverlay");
    if (overlay && !overlay.classList.contains("hidden")) {
      this.performDifficultyChange();
      return;
    }

    // 第一次开始游戏前（firstGameStarted 为 false）或已完成所有关卡（currentLevel 为 1 且 isNextLevelCall 为 true）切换难度，不显示确认对话框
    if (
      !this.firstGameStarted ||
      (this.currentLevel === 1 && this.isNextLevelCall)
    ) {
      // 直接切换难度
      this.performDifficultyChange();
      return;
    }

    // 暂停倒计时
    this.stopTimer();

    // 创建确认对话框
    let dialog = document.getElementById("confirmRestartDialog");
    if (!dialog) {
      dialog = document.createElement("div");
      dialog.id = "confirmRestartDialog";
      dialog.style.cssText =
        "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center; z-index: 3000;";
      dialog.innerHTML = `
        <div style="background: white; padding: 40px 60px; border-radius: 20px; text-align: center; animation: popIn 0.3s ease;">
          <h2 style="color: #667eea; margin-bottom: 20px; font-size: 1.8rem;">切换难度</h2>
          <p style="color: #555; font-size: 1.1rem; margin-bottom: 30px;">
            切换难度等级会重新开始游戏，确定要继续吗？
          </p>
          <div style="display: flex; gap: 15px; justify-content: center;">
            <button id="confirmRestartBtn" class="btn btn-primary">确定</button>
            <button id="cancelRestartBtn" class="btn btn-muted">取消</button>
          </div>
        </div>
      `;
      document.body.appendChild(dialog);

      // 添加动画样式
      if (!document.getElementById("confirmDialogStyle")) {
        const style = document.createElement("style");
        style.id = "confirmDialogStyle";
        style.textContent = `
          @keyframes popIn {
            0% { transform: scale(0); opacity: 0; }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); opacity: 1; }
          }
        `;
        document.head.appendChild(style);
      }

      // 绑定按钮事件
      dialog
        .querySelector("#confirmRestartBtn")
        .addEventListener("click", () => {
          this.accumulatedStars = 0; // 切换难度时重置总星星数
          this.performDifficultyChange();
          dialog.remove();
        });

      dialog
        .querySelector("#cancelRestartBtn")
        .addEventListener("click", () => {
          dialog.remove();
          // 恢复原来的难度选择
          const select = document.getElementById("difficulty");
          select.value = this.cols;
          // 恢复倒计时
          if (!this.gameWon && !this.gameLost) {
            this.startTimer();
          }
        });
    }

    dialog.classList.remove("hidden");
    dialog.style.display = "flex";
  }

  performDifficultyChange() {
    const newCols = parseInt(document.getElementById("difficulty").value);

    if (newCols !== this.cols) {
      // 记录当前难度
      const currentCols = this.cols;
      // 重置状态
      this.prevCols = newCols;
      this.firstGameStarted = false;
      this.currentLevel = 1;
      this.isNextLevelCall = false;
      this.cols = newCols;
      this.rows = newCols;
      // 切换难度
      this.resetLevelData();
      this.hideWinMessage();
      this.hideLoseMessage();
      this.stopTimer();

      // 根据难度设置最大步数
      if (this.cols === 5) {
        this.maxSteps = 14;
      } else if (this.cols === 10) {
        this.maxSteps = 35;
      } else {
        this.maxSteps = 70;
      }

      // 每关倒计时时间
      if (this.cols === 5) {
        this.levelTime = 15;
      } else if (this.cols === 10) {
        this.levelTime = 30;
      } else {
        this.levelTime = 60;
      }
      this.timer = this.levelTime;

      this.updateDifficultyTip();

      // 计算单元格大小
      const maxSize = Math.min(window.innerWidth - 100, 600);
      this.cellSize = Math.floor(maxSize / this.cols);
      this.canvas.width = this.cellSize * this.cols;
      this.canvas.height = this.cellSize * this.rows;

      // 重置游戏状态
      this.generateMaze();
      this.player = { x: 0, y: 0 };
      this.goal = { x: this.cols - 1, y: this.rows - 1 };
      this.stars = [];
      this.starsCollected = 0;
      this.obstacles = [];
      this.steps = 0;
      this.gameWon = false;
      this.gameLost = false;
      this.gameStarted = true;

      this.generateStars();
      this.generateBroom();
      this.addObstacles();
      this.saveGameState();

      this.updateUI();
      this.draw();

      // 显示遮罩层
      const overlay = document.getElementById("gameOverlay");
      if (overlay) overlay.classList.remove("hidden");
    }
  }

  newGame() {
    // 记录是否是下一关调用（在修改 isNextLevelCall 之前保存）
    const isNextLevel = this.isNextLevelCall;
    const currentCols = this.cols;

    // 点击新游戏按钮或切换难度时，重置关卡为 1，并且重置为已通关状态
    if (!this.isNextLevelCall) {
      this.currentLevel = 1;
      this.firstGameStarted = true; // 标记为已通关状态
      document.getElementById("reStartGame").textContent = "重新开始"; // 更新按钮文本
    }
    this.isNextLevelCall = false;

    // 重置累计星星数的逻辑：
    // - 切换难度时重置（currentCols !== this.prevCols）
    // - 第一次开始游戏时重置（!this.firstGameStarted）
    // - 重新开始游戏时重置（失败后，isNextLevel 为 false）
    // - 下一关时不重置（isNextLevel 为 true 且难度不变）
    if (
      currentCols !== this.prevCols ||
      !this.firstGameStarted ||
      !isNextLevel
    ) {
      this.accumulatedStars = 0;
      // 只在切换难度或重新开始游戏时清空关卡数据记录
      this.resetLevelData();
    }
    // 下一关时不重置关卡数据记录，保留已累计的数据

    // 更新上次难度
    this.prevCols = currentCols;

    // 隐藏所有弹窗
    this.hideWinMessage();
    this.hideLoseMessage();

    // 停止之前的计时器
    this.stopTimer();

    // 初始化音效（需要用户交互触发）
    this.soundManager.init();

    // 获取难度
    this.cols = parseInt(document.getElementById("difficulty").value);
    this.rows = this.cols;

    // 根据难度设置最大步数
    if (this.cols === 5) {
      this.maxSteps = 14; // 简单：20*0.7=14 步
    } else if (this.cols === 10) {
      this.maxSteps = 35; // 中等：50*0.7=35 步
    } else {
      this.maxSteps = 70; // 困难：100*0.7=70 步
    }
    // 每关倒计时时间（根据不同难度）
    if (this.cols === 5) {
      this.levelTime = 15; // 简单：15 秒
    } else if (this.cols === 10) {
      this.levelTime = 30; // 中等：30 秒
    } else {
      this.levelTime = 60; // 困难：60 秒（1 分钟）
    }
    this.timer = this.levelTime; // 倒计时初始值
    this.levelStartTime = Date.now(); // 记录关卡开始时间

    // 更新关卡提示
    this.updateDifficultyTip();

    // 计算单元格大小
    const maxSize = Math.min(window.innerWidth - 100, 600);
    this.cellSize = Math.floor(maxSize / this.cols);
    this.canvas.width = this.cellSize * this.cols;
    this.canvas.height = this.cellSize * this.rows;

    // 重置游戏状态
    this.generateMaze();
    this.player = { x: 0, y: 0 };
    this.goal = { x: this.cols - 1, y: this.rows - 1 };
    this.stars = [];
    this.starsCollected = 0;
    this.obstacles = [];
    this.steps = 0;
    this.gameWon = false;
    this.gameLost = false;
    this.gameStarted = true;

    // 生成星星位置
    this.generateStars();

    // 生成扫把道具
    this.generateBroom();

    // 根据难度添加路障（确保不与星星、扫把重叠）
    this.addObstacles();

    // 保存当前关卡的游戏状态（用于重玩本关）
    this.saveGameState();

    // 更新 UI
    this.updateUI();

    // 绘制游戏
    this.draw();

    // 如果是第一次开始游戏，显示遮罩层
    if (!this.firstGameStarted) {
      const overlay = document.getElementById("gameOverlay");
      if (overlay) overlay.classList.remove("hidden");
    }
  }

  // 开始游戏（点击遮罩层按钮）
  onStartGame() {
    // 初始化音效（需要用户交互触发）
    this.soundManager.init();

    // 隐藏遮罩层
    document.getElementById("gameOverlay").classList.add("hidden");

    this.levelStartTime = Date.now(); // 记录关卡开始时间

    // 启动计时器
    this.startTimer();
  }

  // 保存游戏状态
  saveGameState() {
    // 深拷贝迷宫
    this.savedMaze = this.maze.map((row) => [...row]);
    // 深拷贝星星
    this.savedStars = this.stars.map((s) => ({ ...s }));
    // 深拷贝障碍物
    this.savedObstacles = this.obstacles.map((o) => ({ ...o }));
    // 保存扫把
    this.savedBroomItem = this.broomItem ? { ...this.broomItem } : null;
  }

  // 加载保存的游戏状态
  loadGameState() {
    // 恢复迷宫
    this.maze = this.savedMaze.map((row) => [...row]);
    // 恢复星星
    this.stars = this.savedStars.map((s) => ({ ...s }));
    // 恢复障碍物
    this.obstacles = this.savedObstacles.map((o) => ({ ...o }));
    // 恢复扫把
    this.broomItem = this.savedBroomItem ? { ...this.savedBroomItem } : null;
  }

  // 绘制 Ready Go 界面
  // 初始化游戏（不启动计时器）
  initGame() {
    // 隐藏所有弹窗
    this.hideWinMessage();
    this.hideLoseMessage();

    // 获取难度
    this.cols = parseInt(document.getElementById("difficulty").value);
    this.rows = this.cols;

    // 根据难度设置最大步数
    if (this.cols === 5) {
      this.maxSteps = 14;
    } else if (this.cols === 10) {
      this.maxSteps = 35;
    } else {
      this.maxSteps = 70;
    }

    // 每关倒计时时间（根据不同难度）
    if (this.cols === 5) {
      this.levelTime = 15;
    } else if (this.cols === 10) {
      this.levelTime = 30;
    } else {
      this.levelTime = 60;
    }
    this.timer = this.levelTime;

    // 重置游戏状态
    this.generateMaze();
    this.player = { x: 0, y: 0 };
    this.goal = { x: this.cols - 1, y: this.rows - 1 };
    this.stars = [];
    this.starsCollected = 0;
    this.obstacles = [];
    this.steps = 0;
    this.gameWon = false;
    this.gameLost = false;
    this.gameStarted = true;

    // 生成星星位置
    this.generateStars();

    // 生成扫把道具
    this.generateBroom();

    // 根据难度添加路障
    this.addObstacles();

    // 保存当前关卡的游戏状态
    this.saveGameState();

    // 更新 UI
    this.updateUI();

    // 计算单元格大小并设置 canvas
    const maxSize = Math.min(window.innerWidth - 100, 600);
    this.cellSize = Math.floor(maxSize / this.cols);
    this.canvas.width = this.cellSize * this.cols;
    this.canvas.height = this.cellSize * this.rows;

    // 绘制游戏
    this.draw();

    // 显示遮罩层
    document.getElementById("gameOverlay").classList.remove("hidden");
  }

  // 下一关
  nextLevel() {
    this.isNextLevelCall = true; // 标记是从下一关按钮调用的
    if (this.currentLevel < this.maxLevels[this.cols]) {
      this.currentLevel++;
    } else {
      // 已是最后一关，重新开始游戏（从第 1 关开始）
      this.currentLevel = 1;
      this.firstGameStarted = true; // 重置为已通关状态
      // 重新开始游戏时清除所有进度记录
      this.levelProgress.clear();
      this.accumulatedStars = 0;
      this.accumulatedTime = 0;
    }
    this.newGame();
    // 下一关时不重置累计星星总数（保留累计星星）
    // 下一关时自动启动计时器，不需要遮罩层
    this.startTimer();
    this.updateDifficultyTip(); // 更新提示信息
  }

  // 重置每关数据记录
  resetLevelData() {
    this.levelProgress.clear();
  }

  // 重玩当前关卡
  replayLevel() {
    if (this.savedMaze && this.savedMaze.length > 0) {
      // 隐藏所有弹窗和遮罩
      this.hideWinMessage();
      this.hideLoseMessage();
      const overlay = document.getElementById("gameOverlay");
      if (overlay) overlay.classList.add("hidden");

      // 停止之前的计时器
      this.stopTimer();

      // 重玩关卡时，移除该关卡的旧记录
      // 这样可以确保重玩不计算在总时间中
      const levelKey = `${this.cols}_${this.currentLevel}`;
      if (this.levelProgress.has(levelKey)) {
        const prevData = this.levelProgress.get(levelKey);
        this.accumulatedStars -= prevData.stars;
        this.accumulatedTime -= prevData.time;
        this.levelProgress.delete(levelKey);
      }

      // 初始化音效（需要用户交互触发）
      this.soundManager.init();

      // 获取难度
      this.cols = parseInt(document.getElementById("difficulty").value);
      this.rows = this.cols;

      // 根据难度设置最大步数
      if (this.cols === 5) {
        this.maxSteps = 14;
      } else if (this.cols === 10) {
        this.maxSteps = 35;
      } else {
        this.maxSteps = 70;
      }

      // 每关倒计时时间
      if (this.cols === 5) {
        this.levelTime = 15;
      } else if (this.cols === 10) {
        this.levelTime = 30;
      } else {
        this.levelTime = 60;
      }
      this.timer = this.levelTime;

      // 更新关卡提示
      this.updateDifficultyTip();

      // 计算单元格大小
      const maxSize = Math.min(window.innerWidth - 100, 600);
      this.cellSize = Math.floor(maxSize / this.cols);
      this.canvas.width = this.cellSize * this.cols;
      this.canvas.height = this.cellSize * this.rows;

      // 加载保存的游戏状态
      this.loadGameState();
      this.player = { x: 0, y: 0 };
      this.goal = { x: this.cols - 1, y: this.rows - 1 };
      this.starsCollected = 0;
      this.broomItem = null;
      this.hasBroom = this.totalBrooms > 0;
      this.broomCount = this.totalBrooms; // 使用累计的扫把数量
      this.steps = 0;
      this.gameWon = false;
      this.gameLost = false;
      this.gameStarted = true;

      // 更新 UI 和绘制
      this.updateUI();

      // 启动计时器
      this.levelStartTime = Date.now(); // 记录关卡开始时间
      this.startTimer();

      // 绘制游戏
      this.draw();
    } else {
      // 如果没有保存状态，则重新开始
      this.newGame();
    }
  }

  // 使用递归回溯算法生成迷宫，并添加多条路径
  generateMaze() {
    // 初始化迷宫，全部为墙 (1)
    this.maze = [];
    for (let y = 0; y < this.rows; y++) {
      this.maze[y] = [];
      for (let x = 0; x < this.cols; x++) {
        this.maze[y][x] = 1;
      }
    }

    // 标记起点为通路
    this.maze[0][0] = 0;

    // 使用栈进行迭代式 DFS
    const stack = [];
    const visited = [];
    for (let y = 0; y < this.rows; y++) {
      visited[y] = [];
      for (let x = 0; x < this.cols; x++) {
        visited[y][x] = false;
      }
    }

    // 从 (1,1) 开始生成
    visited[1][1] = true;
    this.maze[1][1] = 0;
    stack.push({ x: 1, y: 1 });

    const directions = [
      { dx: 0, dy: -2 }, // 上
      { dx: 2, dy: 0 }, // 右
      { dx: 0, dy: 2 }, // 下
      { dx: -2, dy: 0 }, // 左
    ];

    while (stack.length > 0) {
      const current = stack[stack.length - 1];

      // 查找未访问的邻居
      const neighbors = [];
      for (const dir of directions) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;

        if (nx > 0 && nx < this.cols - 1 && ny > 0 && ny < this.rows - 1) {
          if (!visited[ny][nx]) {
            neighbors.push({ x: nx, y: ny, dx: dir.dx, dy: dir.dy });
          }
        }
      }

      if (neighbors.length > 0) {
        // 打乱顺序随机选择
        this.shuffleArray(neighbors);
        const chosen = neighbors[0];

        // 打通中间的墙
        this.maze[current.y + chosen.dy / 2][current.x + chosen.dx / 2] = 0;
        // 标记新格子
        this.maze[chosen.y][chosen.x] = 0;
        visited[chosen.y][chosen.x] = true;
        // 推入栈
        stack.push({ x: chosen.x, y: chosen.y });
      } else {
        // 回溯
        stack.pop();
      }
    }

    // 打通起点到迷宫的路径
    this.maze[0][1] = 0;
    this.maze[1][0] = 0;

    // 确保终点为通路
    this.maze[this.rows - 1][this.cols - 1] = 0;

    // 打通终点附近 3x3 范围内的一条路径通道
    const endX = this.cols - 1;
    const endY = this.rows - 1;

    // 在终点左侧一列，从终点向上 3 格范围内打通
    if (endX >= 2 && endY >= 2) {
      // 打通 (endY-2, endX-1), (endY-1, endX-1), (endY, endX-1) 形成垂直通道
      this.maze[endY - 2][endX - 1] = 0;
      this.maze[endY - 1][endX - 1] = 0;
      this.maze[endY][endX - 1] = 0;
    }

    // 添加多条路径到终点（增加迷宫的趣味性和迷惑性）
    this.addMultiplePathsToGoal();
  }

  // 添加多条路径到终点
  addMultiplePathsToGoal() {
    // 收集迷宫中间段的墙（中间 50% 的区域）
    const potentialPathCells = [];
    const midX = Math.floor(this.cols / 2);
    const midY = Math.floor(this.rows / 2);
    const rangeX = Math.floor(this.cols * 0.25); // 中间段宽度
    const rangeY = Math.floor(this.rows * 0.25); // 中间段高度

    for (let y = midY - rangeY; y < midY + rangeY; y++) {
      for (let x = midX - rangeX; x < midX + rangeX; x++) {
        if (x > 0 && x < this.cols - 1 && y > 0 && y < this.rows - 1) {
          if (this.maze[y][x] === 1) {
            // 检查这个位置是否靠近现有路径（至少有一个通路邻居）
            const directions = [
              { dx: 0, dy: -1 },
              { dx: 1, dy: 0 },
              { dx: 0, dy: 1 },
              { dx: -1, dy: 0 },
            ];
            let hasPathNeighbor = false;
            for (const dir of directions) {
              const nx = x + dir.dx;
              const ny = y + dir.dy;
              if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
                if (this.maze[ny][nx] === 0) {
                  hasPathNeighbor = true;
                  break;
                }
              }
            }
            if (hasPathNeighbor) {
              potentialPathCells.push({ x, y });
            }
          }
        }
      }
    }

    // 打乱顺序，随机选择一些墙打通形成分支
    this.shuffleArray(potentialPathCells);

    // 打通中间段 50% 的墙形成额外路径
    const branchesToOpen = Math.floor(potentialPathCells.length * 0.5);
    for (let i = 0; i < branchesToOpen && i < potentialPathCells.length; i++) {
      const cell = potentialPathCells[i];
      this.maze[cell.y][cell.x] = 0;
    }
  }

  // 打乱数组
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  generateStars() {
    this.stars = [];
    let starCount = 0;

    while (starCount < this.totalStars) {
      const x = Math.floor(Math.random() * this.cols);
      const y = Math.floor(Math.random() * this.rows);

      // 确保星星不在起点、终点或已有的星星位置
      if (
        (x !== 0 || y !== 0) &&
        (x !== this.cols - 1 || y !== this.rows - 1)
      ) {
        let duplicate = false;
        for (const star of this.stars) {
          if (star.x === x && star.y === y) {
            duplicate = true;
            break;
          }
        }

        // 检查是否与障碍物重叠
        const isObstacle = this.obstacles.some((o) => o.x === x && o.y === y);

        if (!duplicate && !isObstacle && this.maze[y][x] === 0) {
          this.stars.push({ x, y });
          starCount++;
        }
      }
    }
  }

  // 生成扫把道具
  generateBroom() {
    this.broomItem = null;

    // 第一关开始时，默认给一把扫把
    if (this.currentLevel === 1 && !this.isNextLevelCall) {
      this.firstGameStarted = true;
      this.totalBrooms = 1;
      this.broomCount = 1;
      this.hasBroom = true;
      // 点击开始游戏后，文本显示为"重新开始"
      document.getElementById("restartBtn").textContent = "重新开始";
      return;
    }

    // 扫把生成概率：简单模式 20%，其他模式 30%
    const broomProbability = this.cols === 5 ? 0.2 : 0.3;
    if (Math.random() <= broomProbability) {
      let broomCount = 0;
      while (broomCount < 1) {
        const x = Math.floor(Math.random() * this.cols);
        const y = Math.floor(Math.random() * this.rows);

        // 确保扫把不在起点、终点
        if (
          (x !== 0 || y !== 0) &&
          (x !== this.cols - 1 || y !== this.rows - 1)
        ) {
          // 检查是否与星星重叠
          const isStar = this.stars.some((s) => s.x === x && s.y === y);
          // 检查是否与障碍物重叠
          const isObstacle = this.obstacles.some((o) => o.x === x && o.y === y);
          // 检查是否是通路
          const isPath = this.maze[y][x] === 0;

          if (!isStar && !isObstacle && isPath) {
            this.broomItem = { x, y };
            broomCount++;
          }
        }
      }
    }
  }

  // 生成障碍物（确保不与星星和扫把重叠）
  addObstacles() {
    this.obstacles = [];
    let numObstacles = 0;

    // 根据难度设置路障数量
    if (this.cols === 5) {
      numObstacles = 1; // 简单模式：1 个路障
    } else if (this.cols === 10) {
      numObstacles = 2; // 中等模式：2 个路障
    } else if (this.cols === 15) {
      numObstacles = 4; // 高级模式：4 个路障
    }

    if (numObstacles === 0) return;

    const directions = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];

    // 收集路径中间的 45% 区域内的通路格子
    const midX = Math.floor(this.cols / 2);
    const midY = Math.floor(this.rows / 2);
    const rangeX = Math.floor(this.cols * 0.225); // 中间段宽度 45%
    const rangeY = Math.floor(this.rows * 0.225); // 中间段高度 45%

    const pathCellsInMiddle = [];
    for (let y = midY - rangeY; y < midY + rangeY; y++) {
      for (let x = midX - rangeX; x < midX + rangeX; x++) {
        if (x > 0 && x < this.cols - 1 && y > 0 && y < this.rows - 1) {
          // 确保在通路上
          if (this.maze[y][x] === 0) {
            pathCellsInMiddle.push({ x, y });
          }
        }
      }
    }

    // 打乱顺序
    this.shuffleArray(pathCellsInMiddle);

    // 随机选择位置添加路障
    for (let i = 0; i < numObstacles && i < pathCellsInMiddle.length; i++) {
      const cell = pathCellsInMiddle[i];
      const x = cell.x;
      const y = cell.y;

      // 确保不在起点、终点、已有路障、星星或扫把位置
      const isStart = x === 0 && y === 0;
      const isGoal = x === this.cols - 1 && y === this.rows - 1;

      const isStar = this.stars.some((s) => s.x === x && s.y === y);
      const isBroom =
        this.broomItem && this.broomItem.x === x && this.broomItem.y === y;
      const isObstacle = this.obstacles.some((o) => o.x === x && o.y === y);

      // 确保至少有 2 个通路邻居（这样玩家需要绕路）
      let pathNeighbors = 0;
      for (const dir of directions) {
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
          if (this.maze[ny][nx] === 0) {
            pathNeighbors++;
          }
        }
      }

      if (
        !isStart &&
        !isGoal &&
        !isStar &&
        !isBroom &&
        !isObstacle &&
        pathNeighbors >= 2
      ) {
        this.obstacles.push({ x, y });
      }
    }
  }

  handleKeyPress(e) {
    if (!this.gameStarted || this.gameWon) return;

    // 如果遮罩层显示中，禁止键盘操作
    const overlay = document.getElementById("gameOverlay");
    if (overlay && !overlay.classList.contains("hidden")) return;

    let dx = 0;
    let dy = 0;
    let handled = false;

    switch (e.key) {
      case "ArrowUp":
      case "w":
      case "W":
        dy = -1;
        handled = true;
        break;
      case "ArrowDown":
      case "s":
      case "S":
        dy = 1;
        handled = true;
        break;
      case "ArrowLeft":
      case "a":
      case "A":
        dx = -1;
        handled = true;
        break;
      case "ArrowRight":
      case "d":
      case "D":
        dx = 1;
        handled = true;
        break;
    }

    if (handled) {
      e.preventDefault();
      this.movePlayer(dx, dy);
    }
  }

  movePlayer(dx, dy) {
    if (this.gameLost) return;

    const newX = this.player.x + dx;
    const newY = this.player.y + dy;

    // 检查边界
    if (newX < 0 || newX >= this.cols || newY < 0 || newY >= this.rows) {
      return;
    }

    // 检查是否是墙
    if (this.maze[newY][newX] === 1) {
      return;
    }

    // 检查是否是障碍物
    if (this.obstacles.some((o) => o.x === newX && o.y === newY)) {
      // 如果有扫把，清除障碍物
      if (this.hasBroom && this.broomCount > 0) {
        this.obstacles = this.obstacles.filter(
          (o) => o.x !== newX || o.y !== newY,
        );
        this.broomCount--;
        this.hasBroom = this.broomCount > 0;
        this.soundManager.playStar(); // 使用收集音效
        this.updateUI();
      } else {
        this.soundManager.playObstacle();
      }
      return;
    }

    // 移动玩家
    this.player.x = newX;
    this.player.y = newY;
    this.steps++;

    // 播放移动音效
    this.soundManager.playMove();

    // 检查是否收集扫把
    this.checkBroomCollection();

    // 检查步数是否耗尽（失败显示弹窗，等待用户点击重新开始）
    if (this.steps > this.maxSteps) {
      this.gameLost = true;
      this.stopTimer();
      // 显示失败弹窗
      this.showLoseMessage();
      this.updateUI();
      this.draw();
      return;
    }

    // 检查是否收集星星
    this.checkStarCollection();

    // 检查是否到达终点
    this.checkGoal();

    // 更新 UI 和绘制
    this.updateUI();
    this.draw();
  }

  checkStarCollection() {
    for (let i = 0; i < this.stars.length; i++) {
      if (
        this.stars[i].x === this.player.x &&
        this.stars[i].y === this.player.y
      ) {
        this.stars.splice(i, 1);
        this.starsCollected++;
        this.accumulatedStars++;
        this.soundManager.playStar();
        break;
      }
    }
  }

  // 检查扫把收集
  checkBroomCollection() {
    if (
      this.broomItem &&
      this.broomItem.x === this.player.x &&
      this.broomItem.y === this.player.y
    ) {
      this.broomItem = null;
      this.totalBrooms++;
      this.broomCount = this.totalBrooms;
      this.hasBroom = true;
      this.soundManager.playStar();
    }
  }

  checkGoal() {
    if (this.player.x === this.goal.x && this.player.y === this.goal.y) {
      // 检查是否收集了至少 2 颗星星
      if (this.starsCollected >= 2) {
        this.gameWon = true;
        this.stopTimer();

        // 记录当前关卡数据（用于排行榜计算）
        // 使用关卡 ID 作为 key，重玩时覆盖旧记录
        const levelKey = `${this.cols}_${this.currentLevel}`;
        this.levelProgress.set(levelKey, {
          stars: this.starsCollected,
          time: this.levelTime - this.timer,
        });

        this.showWinMessage();
      } else {
        // 星星不够，显示提示
        this.showStarNotEnoughMessage();
      }
    }
  }

  startTimer() {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      this.timer--;
      this.updateUI();
      // 时间用尽检查（失败显示弹窗，等待用户点击重新开始）
      if (this.timer <= 0) {
        this.gameLost = true;
        this.stopTimer();
        this.showLoseMessage();
        this.updateUI();
        this.draw();
        return;
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  updateUI() {
    document.getElementById("stars").textContent =
      `${this.starsCollected}/${this.totalStars}`;
    document.getElementById("brooms").textContent = this.broomCount;
    document.getElementById("timer").textContent = this.formatTime(this.timer);
    const remainingSteps = Math.max(0, this.maxSteps - this.steps);
    document.getElementById("remainingSteps").textContent = remainingSteps;
    document.getElementById("totalStars").textContent = this.accumulatedStars;
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  showWinMessage() {
    // 先隐藏失败弹窗
    this.hideLoseMessage();

    const message = document.getElementById("winMessage");
    const stats = message.querySelector(".win-stats");
    const buttons = message.querySelector(".win-buttons");
    const leaderboardInput = message.querySelector(".win-buttons-input");

    // 检查是否是最后一个关卡
    const isLastLevel = this.currentLevel === this.maxLevels[this.cols];

    if (isLastLevel) {
      message.className = "win-message hidden mode-complete-message";

      // 计算总分（遍历 Map 中所有关卡的记录）
      let totalStars = 0;
      let totalTime = 0;
      for (const data of this.levelProgress.values()) {
        totalStars += data.stars;
        totalTime += data.time;
      }

      // 最后一关关卡通关 - 显示排行榜输入界面
      stats.innerHTML = `
        🎊 恭喜完成所有关卡！ 🎊<br><br>
        太棒了！你已经完成了这个难度的所有关卡！<br><br>
        总收集星星：${totalStars} 颗<br>
        总用时：${this.formatTime(totalTime)}
      `;

      leaderboardInput.innerHTML = `
            <input
              type="text"
              id="playerName"
              placeholder="请输入您的姓名"
              maxlength="10"
              style="
                padding: 12px 20px;
                border: 2px solid #667eea;
                border-radius: 10px;
                font-size: 1rem;
                width: 250px;
              "
            />
            <input
              type="text"
              id="playerRegion"
              placeholder="请输入您的地区"
              maxlength="15"
              style="
                padding: 12px 20px;
                border: 2px solid #667eea;
                border-radius: 10px;
                font-size: 1rem;
                width: 150px;
              "
            />
            <button id="submitLeaderboardBtn" class="btn btn-primary">
              提交排行榜
            </button>
    `;

      buttons.classList.add("hidden"); // 隐藏按钮区域`
      leaderboardInput.classList.remove("hidden"); // 显示排行榜输入区域
      // 绑定提交按钮
      document
        .getElementById("submitLeaderboardBtn")
        .addEventListener("click", () => {
          this.submitLeaderboard(totalStars, totalTime);
        });
    } else {
      let starsText = "";
      message.className = "win-message hidden";
      if (this.starsCollected === this.totalStars) {
        starsText = "⭐ 完美！收集了所有星星 ⭐<br>";
      } else {
        starsText = `收集了 ${this.starsCollected}/${this.totalStars} 颗星星<br>`;
      }

      // 普通关卡通关 - 原有弹窗样式
      const timeSpent = Math.floor((Date.now() - this.levelStartTime) / 1000);
      stats.innerHTML = `
          步数：${this.steps}<br>
          ${starsText}
          用时：${this.formatTime(timeSpent)}
      `;

      buttons.classList.remove("hidden"); // 隐藏按钮区域`
      leaderboardInput.classList.add("hidden"); // 隐藏排行榜输入区域
    }

    // 显示按钮区域
    buttons.style.display = "flex";

    // 播放胜利音效
    this.soundManager.playWin();

    // 移除 hidden 类显示弹窗
    message.classList.remove("hidden");
  }

  hideWinMessage() {
    document.getElementById("winMessage").classList.add("hidden");
  }

  // 提交排行榜
  submitLeaderboard(totalStars, totalTime) {
    const nameInput = document.getElementById("playerName");
    const regionInput = document.getElementById("playerRegion");
    const name = nameInput.value.trim();
    const region = regionInput.value.trim() || "未知";

    if (!name) {
      alert("请输入姓名！");
      return;
    }

    const difficulty = this.cols;
    const entry = {
      name,
      region,
      stars: totalStars,
      totalTime,
      timestamp: Date.now(),
    };

    // 添加并获取排名
    this.leaderboardManager.addEntry(difficulty, entry);
    const rank = this.leaderboardManager.getRank(difficulty, entry);

    // 显示排行榜结果
    this.showLeaderboardResult(rank, difficulty);
  }

  // 显示排行榜结果
  showLeaderboardResult(rank, difficulty) {
    const leaderboard = this.leaderboardManager.getLeaderboard(difficulty);
    const message = document.getElementById("winMessage");
    const stats = message.querySelector(".win-stats");
    const leaderboardInput = message.querySelector(".win-buttons-input");

    let leaderboardHtml =
      "<h3 style='margin-bottom: 15px; color: #667eea;'>🏆 本难度排行榜</h3><ul style='text-align: left; max-height: 300px; overflow-y: auto; list-style: none; padding: 0;'>";
    leaderboard.forEach((entry, i) => {
      const isCurrentUser = i + 1 === rank;
      const medal =
        i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      leaderboardHtml += `
        <li style="padding: 10px; border-bottom: 1px solid #f0f0f0; ${isCurrentUser ? "background: #fff3cd; color:#000" : ""}">
          <strong>${medal}</strong> ${entry.name} <span style="color: #999;">(${entry.region})</span> - ⭐ ${entry.stars} - ⏱ ${this.formatTime(entry.totalTime)}
        </li>
      `;
    });
    leaderboardHtml += "</ul>";

    stats.innerHTML = `
      🎉 恭喜你！获得第 ${rank} 名！ 🎉<br><br>
      ${leaderboardHtml}
    `;

    leaderboardInput.innerHTML = `
      <button id="newLeaderboardBtn" class="btn btn-primary">再玩一次</button>
      <button id="closeLeaderboardBtn" class="btn btn-primary">关闭</button>
    `;

    document
      .getElementById("newLeaderboardBtn")
      .addEventListener("click", () => {
        this.newGame();
        this.startTimer(); // 重新开始游戏时启动计时器
      });

    document
      .getElementById("closeLeaderboardBtn")
      .addEventListener("click", () => {
        this.hideWinMessage();
        // 刷新排行榜面板显示
        const activeTab = document.querySelector(".tab-btn.active");
        if (activeTab) {
          const difficulty = parseInt(activeTab.dataset.difficulty);
          showLeaderboard(difficulty);
        }
      });

    message.classList.remove("hidden");
  }

  // 显示星星不够的提示
  showStarNotEnoughMessage() {
    // 创建临时提示元素
    let tip = document.getElementById("starNotEnoughTip");
    if (!tip) {
      tip = document.createElement("div");
      tip.id = "starNotEnoughTip";
      tip.style.cssText =
        "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(255, 100, 100, 0.95); color: white; padding: 30px 50px; border-radius: 20px; font-size: 1.5rem; text-align: center; z-index: 2000; box-shadow: 0 10px 40px rgba(0,0,0,0.5); animation: popIn 0.3s ease;";
      document.body.appendChild(tip);
    }
    tip.innerHTML = `😢 星星不够！<br>至少需要收集 2 颗星星才能通关`;
    tip.classList.remove("hidden");

    // 3 秒后自动隐藏
    setTimeout(() => {
      tip.classList.add("hidden");
    }, 3000);
  }

  showLoseMessage() {
    // 清零扫把累计数（闯关失败时）
    this.totalBrooms = 0;
    this.hasBroom = false;
    this.broomCount = 0;

    const message = document.getElementById("loseMessage");
    const stats = message.querySelector(".lose-stats");

    stats.innerHTML = `
            剩余步数：0<br>
            收集星星：${this.starsCollected}/${this.totalStars}<br>
            通关时间：${this.formatTime(this.levelTime - this.timer)}
        `;

    // 播放失败音效
    this.soundManager.playLose();

    // 移除 hidden 类显示弹窗
    message.classList.remove("hidden");
  }

  hideLoseMessage() {
    const message = document.getElementById("loseMessage");
    if (message) {
      message.classList.add("hidden");
    }
  }

  draw() {
    // 清空画布
    this.ctx.fillStyle = "#fff";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 绘制迷宫
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const cellX = x * this.cellSize;
        const cellY = y * this.cellSize;

        if (this.maze[y][x] === 1) {
          // 墙壁
          this.ctx.fillStyle = "#4CAF50";
          this.ctx.fillRect(cellX, cellY, this.cellSize, this.cellSize);

          // 墙壁高光
          this.ctx.fillStyle = "#66BB6A";
          this.ctx.fillRect(cellX, cellY, this.cellSize, 4);
        } else {
          // 地板
          this.ctx.fillStyle = "#E8F5E9";
          this.ctx.fillRect(cellX, cellY, this.cellSize, this.cellSize);

          // 地板网格线
          this.ctx.strokeStyle = "#C8E6C9";
          this.ctx.lineWidth = 1;
          this.ctx.strokeRect(cellX, cellY, this.cellSize, this.cellSize);
        }
      }
    }

    // 绘制星星
    for (const star of this.stars) {
      this.drawStar(star.x, star.y);
    }

    // 绘制路障
    for (const obstacle of this.obstacles) {
      this.drawObstacle(obstacle.x, obstacle.y);
    }

    // 绘制扫把道具
    if (this.broomItem) {
      this.drawBroom(this.broomItem.x, this.broomItem.y);
    }

    // 绘制终点
    this.drawGoal(this.goal.x, this.goal.y);

    // 绘制玩家
    this.drawPlayer(this.player.x, this.player.y);
  }

  drawStar(cellX, cellY) {
    const centerX = cellX * this.cellSize + this.cellSize / 2;
    const centerY = cellY * this.cellSize + this.cellSize / 2;

    this.ctx.save();
    this.ctx.font = `${this.cellSize * 0.8}px Arial`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText("⭐", centerX, centerY);
    this.ctx.restore();
  }

  drawGoal(cellX, cellY) {
    const centerX = cellX * this.cellSize + this.cellSize / 2;
    const centerY = cellY * this.cellSize + this.cellSize / 2;

    this.ctx.save();
    this.ctx.font = `${this.cellSize * 0.8}px Arial`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText("🏆", centerX, centerY);
    this.ctx.restore();
  }

  drawPlayer(cellX, cellY) {
    const centerX = cellX * this.cellSize + this.cellSize / 2;
    const centerY = cellY * this.cellSize + this.cellSize / 2;

    this.ctx.save();
    this.ctx.font = `${this.cellSize * 0.8}px Arial`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    // 绘制小狐狸
    this.ctx.fillText("🦊", centerX, centerY);

    // 如果有扫把，在下方显示扫把图标
    if (this.hasBroom) {
      this.ctx.font = `${this.cellSize * 0.5}px Arial`;
      this.ctx.fillText("🧹", centerX, centerY + this.cellSize * 0.3);
    }

    this.ctx.restore();
  }

  drawObstacle(cellX, cellY) {
    const centerX = cellX * this.cellSize + this.cellSize / 2;
    const centerY = cellY * this.cellSize + this.cellSize / 2;

    this.ctx.save();
    this.ctx.font = `${this.cellSize * 0.8}px Arial`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText("🪨", centerX, centerY);
    this.ctx.restore();
  }

  drawBroom(cellX, cellY) {
    const centerX = cellX * this.cellSize + this.cellSize / 2;
    const centerY = cellY * this.cellSize + this.cellSize / 2;

    this.ctx.save();
    this.ctx.font = `${this.cellSize * 0.8}px Arial`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText("🧹", centerX, centerY);
    this.ctx.restore();
  }
}

// 启动游戏
window.onload = () => {
  const game = new MazeGame();
  // 初始化排行榜面板
  initLeaderboardPanel();
};

// 格式时间工具函数
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// 切换排行榜面板显示/隐藏
function toggleLeaderboardPanel() {
  const panel = document.getElementById("leaderboardPanel");
  const isVisible = !panel.classList.contains("hidden");

  if (isVisible) {
    panel.classList.add("hidden");
  } else {
    panel.classList.remove("hidden");
    // 刷新当前选中标签的排行榜
    const activeTab = document.querySelector(".tab-btn.active");
    if (activeTab) {
      const difficulty = parseInt(activeTab.dataset.difficulty);
      showLeaderboard(difficulty);
    }
  }
}

// 显示排行榜（供外部调用）
function showLeaderboard(difficulty) {
  const content = document.getElementById("leaderboardContent");
  const lbManager = new LeaderboardManager();
  const leaderboard = lbManager.getLeaderboard(difficulty);

  if (leaderboard.length === 0) {
    content.innerHTML =
      '<p style="text-align: center; color: #999; padding: 20px;">完成所有关卡后查看排名</p>';
    return;
  }

  let html = '<ul style="list-style: none; padding: 0; margin: 0;">';
  leaderboard.forEach((entry, i) => {
    const medal =
      i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
    html += `
      <li style="padding: 12px; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center;">
        <span><strong>${medal}</strong> ${entry.name} <span style="color: #999;">(${entry.region})</span></span>
        <span>⭐ ${entry.stars} | ⏱ ${formatTime(entry.totalTime)}</span>
      </li>
    `;
  });
  html += "</ul>";
  content.innerHTML = html;
}

// 添加测试数据
function addTestData() {
  const testEntries = [
    {
      difficulty: 5,
      name: "玩家 A",
      region: "北京",
      stars: 30,
      totalTime: 300,
    },
    {
      difficulty: 5,
      name: "玩家 B",
      region: "上海",
      stars: 28,
      totalTime: 320,
    },
    {
      difficulty: 5,
      name: "玩家 C",
      region: "广州",
      stars: 25,
      totalTime: 350,
    },
    {
      difficulty: 10,
      name: "玩家 D",
      region: "深圳",
      stars: 30,
      totalTime: 400,
    },
    {
      difficulty: 10,
      name: "玩家 E",
      region: "杭州",
      stars: 27,
      totalTime: 450,
    },
    {
      difficulty: 15,
      name: "玩家 F",
      region: "成都",
      stars: 30,
      totalTime: 600,
    },
    {
      difficulty: 15,
      name: "玩家 G",
      region: "武汉",
      stars: 26,
      totalTime: 650,
    },
  ];

  testEntries.forEach((entry) => {
    const leaderboardManager = new LeaderboardManager();
    leaderboardManager.addEntry(entry.difficulty, entry);
  });

  alert("已添加测试数据！请点击排行榜查看。");
  // 刷新当前选中的标签
  const activeTab = document.querySelector(".tab-btn.active");
  if (activeTab) {
    const difficulty = parseInt(activeTab.dataset.difficulty);
    showLeaderboard(difficulty);
  }
}

// 排行榜面板初始化
function initLeaderboardPanel() {
  const panel = document.getElementById("leaderboardPanel");
  const tabs = document.querySelectorAll(".tab-btn");
  const content = document.getElementById("leaderboardContent");

  // 切换难度标签
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const difficulty = parseInt(tab.dataset.difficulty);
      showLeaderboard(difficulty);
    });
  });

  // 初始化时加载当前选中标签对应的排行榜
  const activeTab = document.querySelector(".tab-btn.active");
  if (activeTab) {
    const difficulty = parseInt(activeTab.dataset.difficulty);
    showLeaderboard(difficulty);
  }

  // 存储 game 实例以便排行榜访问
  window.gameInstance = game;
}
