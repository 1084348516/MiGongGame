# 游戏音效功能实现计划

## 背景
用户希望为迷宫探险游戏添加丰富的音效，包括移动、收集星星、碰到障碍物、胜利、失败和背景音乐。采用"两者结合"的实现方式：关键交互音效使用 Web Audio API 合成（无需外部文件，零延迟），背景音乐使用在线音效文件。

## 实现方案

### 1. 音效分类与触发点

| 音效类型 | 触发时机 | 实现方式 |
|---------|---------|---------|
| 移动音效 | 小狐狸每一步移动 | Web Audio 合成 |
| 收集星星音效 | 收集到星星时 | Web Audio 合成 |
| 障碍物音效 | 小狐狸碰到障碍物时 | Web Audio 合成 |
| 胜利音效 | 游戏获胜时 | Web Audio 合成 + 背景音乐 |
| 失败音效 | 步数耗尽时 | Web Audio 合成 |
| 背景音乐 | 游戏开始到结束 | 在线 MP3 文件 |

### 2. 技术架构

#### 2.1 音效管理器（SoundManager 类）
在 `game.js` 中添加一个独立的音效管理类：

```javascript
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.bgmAudio = new Audio();
        this.bgmVolume = 0.3;
        this.sfxVolume = 0.5;
        this.initialized = false;
    }

    // 初始化 AudioContext（需要用户交互触发）
    init() { ... }

    // 播放合成音效
    playTone(frequency, type, duration, slideTo = null) { ... }

    // 播放移动音效（短促的"哒哒"声）
    playMove() { ... }

    // 播放星星音效（清脆的叮当声）
    playStar() { ... }

    // 播放障碍物音效（沉闷的撞击声）
    playObstacle() { ... }

    // 播放胜利音效（欢快的旋律）
    playWin() { ... }

    // 播放失败音效（低沉的下行音阶）
    playLose() { ... }

    // 背景音乐控制
    playBGM() { ... }
    stopBGM() { ... }
}
```

#### 2.2 Web Audio API 合成器方案

**移动音效**：短促的低频脉冲（200-300Hz，50ms）
```javascript
const oscillator = ctx.createOscillator();
const gainNode = ctx.createGain();
oscillator.connect(gainNode);
gainNode.connect(masterGain);
oscillator.frequency.setValueAtTime(250, now);
gainNode.gain.setValueAtTime(0.3, now);
gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
oscillator.start(now);
oscillator.stop(now + 0.05);
```

**星星音效**：高频正弦波，快速上行音阶（880Hz → 1760Hz，200ms）
```javascript
oscillator.frequency.setValueAtTime(880, now);
oscillator.frequency.linearRampToValueAtTime(1760, now + 0.2);
gainNode.gain.setValueAtTime(0.4, now);
gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
```

**障碍物音效**：方波，低频衰减（100Hz，150ms）
```javascript
oscillator.type = 'square';
oscillator.frequency.setValueAtTime(100, now);
gainNode.gain.setValueAtTime(0.3, now);
gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
```

**胜利音效**：C 大调和弦琶音（C5-E5-G5-C6）
```javascript
const notes = [523.25, 659.25, 783.99, 1046.50];
notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(masterGain);
    osc.frequency.setValueAtTime(freq, now + i*0.1);
    gain.gain.setValueAtTime(0.3, now + i*0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + i*0.1 + 0.3);
    osc.start(now + i*0.1);
    osc.stop(now + i*0.1 + 0.3);
});
```

**失败音效**：下行音阶（C5 → C4）
```javascript
const notes = [523.25, 493.88, 466.16, 440.00, 415.30, 392.00, 370.00, 349.23];
notes.forEach((freq, i) => {
    // 类似实现...
});
```

### 3. 文件修改清单

#### game.js
1. 在文件开头添加 `SoundManager` 类
2. 在 `MazeGame` 类中引入音效管理：
   ```javascript
   constructor() {
       // ... 现有代码
       this.soundManager = new SoundManager();
   }

   newGame() {
       // 游戏开始时尝试初始化音效（需要用户交互）
       this.soundManager.init();
       this.soundManager.playBGM();
       // ... 其他代码
   }

   // 在 movePlayer() 中添加
   this.soundManager.playMove();

   // 在 checkStarCollection() 中添加
   this.soundManager.playStar();

   // 在障碍物碰撞检测中添加
   this.soundManager.playObstacle();

   // 在 showWinMessage() 中添加
   this.soundManager.playWin();
   this.soundManager.stopBGM();

   // 在 showLoseMessage() 中添加
   this.soundManager.playLose();
   this.soundManager.stopBGM();
   ```

#### index.html（可选）
添加背景音乐文件引用（如果选择使用外部文件）：
```html
<audio id="bgm" loop>
    <source src="https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3" type="audio/mp3"></source>
</audio>
```

### 4. 背景音乐选择
推荐使用免费可商用的背景音乐：
- 来源：Pixabay Music 或 Freesound
- 风格：轻松愉快的冒险音乐
- 格式：MP3，循环播放

示例 URL（可替换）：
```
https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3  // 轻松冒险风格
```

### 5. 测试验证

1. **基础功能测试**：
   - 点击"新游戏"按钮，音效系统初始化
   - 移动小狐狸，听到移动音效
   - 收集星星，听到清脆音效
   - 碰到障碍物，听到撞击音效

2. **胜利/失败测试**：
   - 到达终点，听到胜利旋律
   - 步数耗尽，听到失败音效

3. **背景音乐测试**：
   - 游戏开始自动播放
   - 游戏结束时停止

### 6. 注意事项

- **浏览器自动播放策略**：AudioContext 需要用户交互后才能激活，所以 `init()` 在"新游戏"按钮点击时调用
- **音量控制**：提供静音选项（可选增强功能）
- **移动端兼容性**：Web Audio API 在所有现代浏览器中支持良好
