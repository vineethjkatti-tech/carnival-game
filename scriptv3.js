
'use strict';
/* ==========================================================
   ESCAPE THE CARNIVAL -- Game Logic (Vanilla JS)
   ========================================================== */

/* ----------------------------------------------------------
   1. GAME STATE
   ---------------------------------------------------------- */

document.addEventListener("keydown", function (event) {
  if (event.key === " ") {
    event.preventDefault();
    document.getElementById("btn-escape").click();
  }
}, { once: true }); // This object makes it fire only once
// Around 9: 
// GoInFullscreen(window.body);
window.addEventListener("load", function (e) {
  start();
});

async function toggleFullscreen() {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen();
  } else {
    await document.exitFullscreen();
  }
}
const state = {
  lives: 3,             // 3 balloons
  riddleIndex: 0,       // current riddle (0-2)
  puzzle: [],           // current tile order (0..8)
  selectedTile: null,   // first tile chosen for a swap
  pieces: []            // puzzle pieces earned from correct answers (0..8)
};

/* ----------------------------------------------------------
   2. AUDIO HELPERS
   ---------------------------------------------------------- */
function audioEl(id) { return document.getElementById(id); }

function playAudio(id, loop, volume) {
  const a = audioEl(id);
  if (!a) return;
  a.loop = !!loop;
  if (typeof volume === 'number') a.volume = volume;
  a.currentTime = 0;
  const p = a.play();
  if (p && p.catch) p.catch(function () { }); // swallow autoplay errors
}
function stopAudio(id) {
  const a = audioEl(id);
  if (!a) return;
  a.pause();
  a.currentTime = 0;
}

/* ----------------------------------------------------------
   3. TYPEWRITER (SILENT)
   - Prints text letter-by-letter into an element.
   - No beeps. The typewriter just types.
   - Starting a new typewriter cancels the previous one.
   ---------------------------------------------------------- */
let typeTimer = null;
let typeJob = null;

function stopTypewriter() {
  if (typeTimer) { clearInterval(typeTimer); typeTimer = null; }
  typeJob = null;
}

function finishTypewriter() {
  const j = typeJob;
  if (!j) return;
  stopTypewriter();
  j.el.textContent = j.text;      // always end on the full text
  if (j.onDone) j.onDone();
}

function skipTypewriter() {
  if (typeJob) finishTypewriter();
}

function typewriter(el, text, speed, onDone) {
  stopTypewriter();               // kill any running printer
  if (!el) { if (onDone) onDone(); return; }

  el.textContent = '';
  typeJob = { el: el, text: text, onDone: onDone };

  let i = 0;
  typeTimer = setInterval(function () {
    if (!typeJob) return;         // superseded by a new typewriter
    typeJob.el.textContent += text.charAt(i);
    i++;
    if (i >= text.length) finishTypewriter();
  }, speed || 40);                // ~40ms per char (snappy)
}

// Any left-click during dialogue instantly skips it (never on real controls).
document.addEventListener('click', function (e) {
  if (e.target.closest('button, a, input, select, textarea')) return;
  skipTypewriter();
});

/* ----------------------------------------------------------
   4. SCENE ROUTER
   ---------------------------------------------------------- */
const scenes = document.querySelectorAll('.scene');
const CARNIVAL_SCENES = ['scene-joker', 'scene-riddles', 'scene-puzzle'];

// Make sure the eerie carnival loop is playing whenever a carnival
// scene is on screen (skips a restart if it's already going).
function ensureCarnivalMusic() {
  const a = audioEl('bg-music-carnival');
  if (!a || !a.paused) return;
  a.loop = true;
  a.volume = 0.3;
  const p = a.play();
  if (p && p.catch) p.catch(function () { });
}

function goToScene(id) {
  stopTypewriter();
  scenes.forEach(function (s) { s.classList.remove('active'); });
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
  if (CARNIVAL_SCENES.indexOf(id) !== -1) ensureCarnivalMusic();
}

/* ----------------------------------------------------------
   5. GLITCH EFFECT
   ---------------------------------------------------------- */
const glitchOverlay = document.getElementById('glitch-overlay');

function triggerGlitch(duration, violent) {
  document.body.classList.add('glitching');
  if (violent) glitchOverlay.classList.add('violent');
  glitchOverlay.classList.add('on');
  setTimeout(function () {
    glitchOverlay.classList.remove('on');
    glitchOverlay.classList.remove('violent');
    document.body.classList.remove('glitching');
  }, duration || 900);
}

/* ----------------------------------------------------------
    5b. JOKER JUMPCUT (full-screen scare)
   The Joker hard-cuts in, covers the whole screen, and the
   audio clip (cut to the exact length) ends precisely when
   the image cuts back out to the same starting screen.
   ---------------------------------------------------------- */
function playJumpcutAudio(audioId, duration) {
  const a = audioEl(audioId);
  if (a) {
    a.currentTime = 0;
    const p = a.play();
    if (p && p.catch) {
      p.catch(function () { playGlitchCut(duration); });
      return;
    }
    return;
  }
  playGlitchCut(duration);
}

// Fallback: play the known-good static track and stop it after the
// exact jumpcut length if the cut clip fails to play.
function playGlitchCut(duration) {
  // const g = audioEl('sfx-glitch');
  // if (!g) return;
  // g.currentTime = 0;
  // const p = g.play();
  // if (p && p.catch) p.catch(function () {});
  // setTimeout(function () { g.pause(); g.currentTime = 0; }, duration);
  return;
}

function triggerJumpcut(duration, audioId) {
  const overlay = document.getElementById('joker-jumpcut');

  // Reset the animations so each trigger replays them.
  overlay.classList.remove('active', 'cut-out');
  void overlay.offsetWidth;
  overlay.classList.remove('hidden');
  overlay.classList.add('active');

  playJumpcutAudio(audioId, duration);

  // Keep the Joker up exactly until the audio ends, then cut back out.
  const audio = audioEl(audioId);
  let cleared = false;
  const cutOut = function () {
    if (cleared) return;
    cleared = true;
    overlay.classList.remove('active');
    overlay.classList.add('cut-out');
    setTimeout(function () {
      overlay.classList.add('hidden');
      overlay.classList.remove('cut-out');
    }, 200);
  };

  if (audio) audio.addEventListener('ended', cutOut, { once: true });
  setTimeout(cutOut, duration + 250);   // fallback: never linger forever
}

/* ----------------------------------------------------------
   6. LIVES / BALLOON HUD
   ---------------------------------------------------------- */
function renderBalloons() {
  const containers = document.querySelectorAll('#balloons, #balloons-puzzle');
  containers.forEach(function (container) {
    container.textContent = new Array(Math.max(0, state.lives)).fill('🎈').join('');
  });
}

function setJokerImage() {
  const img = document.getElementById('joker-riddles');
  if (!img) return;
  if (state.lives === 3) img.src = 'joker.png';
  else if (state.lives === 2) img.src = 'joker-angry.png';
  else if (state.lives <= 1) img.src = 'joker-angrier.png';
}

function loseLife(delayMs) {
  state.lives--;

  const update = function () {
    playAudio('sfx-balloon-pop', false, 0.9);
    const containers = document.querySelectorAll('#balloons, #balloons-puzzle');
    containers.forEach(function (c) {
      c.textContent = new Array(Math.max(0, state.lives)).fill('🎈').join('');
      c.classList.remove('pop');
      void c.offsetWidth;          // restart the pulse
      c.classList.add('pop');
    });
    setJokerImage();
  };

  // On the first wrong answer the jumpcut hides the HUD for ~1s,
  // so defer the countdown until the Joker cuts back out.
  if (delayMs) setTimeout(update, delayMs); else update();

  if (state.lives <= 0) setTimeout(showGameOver, 700);
}

function showGameOver() {
  stopTypewriter();
  const overlay = document.getElementById('game-over');
  const btn = document.getElementById('btn-gameover-reload');
  overlay.classList.remove('hidden');
  btn.classList.add('hidden');

  // The "trapped forever" ending - typed out by the Joker.
  typewriter(document.getElementById('game-over-dialogue'),
    'Three balloons. All popped by that gray little brain of yours. The Carnival keeps what it catches, guest. You failed... and now you are trapped here. FOREVER. HAHAHAHA!',
    45, function () {
      btn.classList.remove('hidden');
      // Fallback: reload if the player never clicks.
      setTimeout(function () { location.reload(); }, 6000);
    });
}




    function GoInFullscreen(element) {
        if(element.requestFullscreen)
            element.requestFullscreen();
        else if(element.mozRequestFullScreen)
            element.mozRequestFullScreen();
        else if(element.webkitRequestFullscreen)
            element.webkitRequestFullscreen();
        else if(element.msRequestFullscreen)
            element.msRequestFullscreen();
    }

    function GoOutFullscreen() {
        if(document.exitFullscreen)
            document.exitFullscreen();
        else if(document.mozCancelFullScreen)
            document.mozCancelFullScreen();
        else if(document.webkitExitFullscreen)
            document.webkitExitFullscreen();
        else if(document.msExitFullscreen)
            document.msExitFullscreen();
    }

    function IsFullScreenCurrently() {
        var full_screen_element = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement || null;

        if(full_screen_element === null)
            return false;
        else
            return true;
    }

    $("#go-button").on('click', function() {
        if(IsFullScreenCurrently())
            GoOutFullscreen();
        else
            GoInFullscreen($("#demo-element").get(0));
    });

    $(document).on('fullscreenchange webkitfullscreenchange mozfullscreenchange MSFullscreenChange', function() {
        if(IsFullScreenCurrently()) {
            $("#demo-element span").text('Full Screen Mode Enabled');
            $("#go-button").text('Disable Full Screen');
        }
        else {
            $("#demo-element span").text('Full Screen Mode Disabled');
            $("#go-button").text('Enable Full Screen');
        }
    });
    

/* ----------------------------------------------------------
   7. SCENE 1 -> TRANSITION -> SCENE 2
   ---------------------------------------------------------- */
function start() {
  // Glitch sound fires EXACTLY with the visual glitch...
  playAudio('sfx-glitch', false, 1.0);
  // toggleFullscreen();
  triggerGlitch(900, false);
  // ...and is cut off when the visual glitch ends, so the long
  // 4.9s static track never bleeds into the transition scene.
  setTimeout(function () { stopAudio('sfx-glitch'); }, 1100);

  setTimeout(function () {
    goToScene('scene-transition');
    // Transition text types silently.
    typewriter(document.getElementById('transition-text'),
      ' Welcome to the Carnival.', 45, function () {
        // Short beat after the line lands, then slide into the carnival
        // (no more 3-second dead pause before the next glitch/scene).
        setTimeout(function () {
          goToScene('scene-joker');
          playAudio('bg-music-carnival', true, 0.3);
          typewriter(document.getElementById('joker-dialogue'),
            "You came to escape reality... But your mind is bound by rules. Answer with basic logic, or lose your mind forever.",
            40, function () {
              // Reveal the Play button only after typing finishes.
              document.getElementById('btn-play').classList.add('fade-in');
            });
        }, 1200);
      });
  }, 450);
}

/* ----------------------------------------------------------
   8. SCENE 2 -> SCENE 3 (riddles)
   ---------------------------------------------------------- */
document.getElementById('btn-play').addEventListener('click', function () {
  goToScene('scene-riddles');
  renderRiddle();
});

/* ----------------------------------------------------------
   9. THE RIDDLES
   Each riddle shows FOUR shuffled choices: 1 SURREAL (correct)
   + 3 LOGICAL decoys (wrong). Buttons stay hidden until the
   typewriter finishes.
   ---------------------------------------------------------- */

const riddles = [
  {
    question: 'Who is almost ALWAYS the main villain or killer in an evil carnival movie?',
    options: [
      { text: 'The creepy clown', correct: true },
      { text: 'The popcorn vendor', correct: false },
      { text: 'The ticket booth teenager', correct: false },
      { text: 'The balloon artist', correct: false }
    ]
  },
  {
    question: 'Where does the final showdown between the killer and the hero usually take place?',
    options: [
      { text: 'The prize counter', correct: false },
      { text: 'The parking lot', correct: false },
      { text: 'The Hall of Mirrors or Funhouse', correct: true },
      { text: 'The public restrooms', correct: false }
    ]
  },
  {
    question: 'What ride is guaranteed to break down, jam, or trap characters at the top?',
    options: [
      { text: 'The Ferris Wheel', correct: true },
      { text: 'The Bumper Cars', correct: false },
      { text: 'The Merry-Go-Round', correct: false },
      { text: 'The Fun Slide', correct: false }
    ]
  },
  {
    question: 'Which character type almost always dies first when things go wrong?',
    options: [
      { text: 'The quiet protagonist', correct: false },
      { text: 'The arrogant bully or teenager who wanders off alone', correct: true },
      { text: 'The heroic local cop', correct: false },
      { text: 'The carnival owner', correct: false }
    ]
  },
  {
    question: 'What classic fortune-telling prop is usually cursed or predicts everyone’s doom?',
    options: [
      { text: 'A magic 8-ball', correct: false },
      { text: 'An automated animatronic machine (like Zoltar)', correct: true },
      { text: 'A scratch-off ticket', correct: false },
      { text: 'A fortune cookie', correct: false }
    ]
  },
  {
    question: 'What happens to cell phones as soon as the characters step onto the carnival grounds?',
    options: [
      { text: 'They download a scary app', correct: false },
      { text: 'They instantly lose signal or die', correct: true },
      { text: 'They start calling the killer automatically', correct: false },
      { text: 'The screen shatters', correct: false }
    ]
  },
  {
    question: 'What classic carnival snack is almost always turned into something disgusting or poisonous?',
    options: [
      { text: 'Candy Apples', correct: true },
      { text: 'Soft Pretzels', correct: false },
      { text: 'Funnel Cake', correct: false },
      { text: 'Nachos', correct: false }
    ]
  },
  {
    question: 'What warning does a local elder or creepy carnival worker ALWAYS give early in the movie?',
    options: [
      { text: '"The food is overpriced!"', correct: false },
      { text: '"Watch out for rain!"', correct: false },
      { text: '"Don\'t stay after dark / Don\'t go in there!"', correct: true },
      { text: '"Keep your shoes tied!"', correct: false }
    ]
  },
  {
    question: 'What happens when a character tries to run away and escape the carnival grounds?',
    options: [
      { text: 'They get trapped in an endless loop that brings them right back to the center', correct: true },
      { text: 'A bus picks them up immediately', correct: false },
      { text: 'The exit gates open smoothly', correct: false },
      { text: 'They get arrested by security', correct: false }
    ]
  }
];

const riddleQuestion = document.getElementById('riddle-question');
const riddleChoices = document.getElementById('riddle-choices');
const riddleFeedback = document.getElementById('riddle-feedback');

function renderRiddle() {
  // All riddles solved -> move on to the puzzle.

  if (state.riddleIndex >= riddles.length) {
    goToScene('scene-puzzle');
    initPuzzleIntro();
    return;
  }

  const r = riddles[state.riddleIndex];

  riddleChoices.classList.add('hidden');
  riddleChoices.classList.remove('reveal');
  riddleFeedback.classList.add('hidden');
  riddleFeedback.className = 'feedback hidden';
  riddleChoices.innerHTML = '';

  // Build 4 shuffled choices from the question/options structure.
  shuffleArray(r.options.map(function (o, i) { return { index: i, option: o }; }))
    .forEach(function (pair) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'answer-btn ' + (pair.option.correct ? 'surreal' : 'logical');
      btn.textContent = pair.option.text;
      btn.addEventListener('click', function () { handleRiddle(pair.option.correct, btn); });
      riddleChoices.appendChild(btn);
    });

  // Type the question; reveal the buttons only when done.
  typewriter(riddleQuestion, r.question, 40, function () {
    riddleChoices.classList.remove('hidden');
    riddleChoices.classList.add('reveal');
  });
}

function handleRiddle(correct, btn) {
  const allBtns = riddleChoices.querySelectorAll('.answer-btn');
  allBtns.forEach(function (b) { b.disabled = true; });

  if (correct) {
    // CORRECT: unlock the puzzle piece, flash "YOU PASSED!", then next riddle.
    btn.classList.add('correct');
    state.pieces.push(state.riddleIndex);
    showRewardFlash(state.riddleIndex, function () {
      state.riddleIndex++;
      renderRiddle();
    });
  } else {
    // WRONG (logical): pop a balloon + show the sad Joker, then retry.
    btn.classList.add('wrong');
    riddleFeedback.classList.add('hidden');
    loseLife();

    const sadImg = document.getElementById('joker-riddles');
    if (sadImg) sadImg.src = 'joker-angry.png';

    const taunts = [
      'WRONG! HAHAHA! That is the cage talking. Answer again, guest - the Carnival is hungry.',
      'LOGIC?! You still think in boxes. Pop. Pop. Pop. Try again before I get bored.',
      'Wrong, wrong, WRONG. Every cage you obey becomes a wall. Now think like a nightmare.'
    ];
    const taunt = taunts[Math.floor(Math.random() * taunts.length)];

    // The Joker types a taunt over the question, then restores it
    // and lets the player retry the SAME riddle (unless already dead).
    typewriter(riddleQuestion, taunt, 45, function () {
      if (state.lives > 0) {
        riddleQuestion.textContent = riddles[state.riddleIndex].question;
        allBtns.forEach(function (b) { b.disabled = false; });
        btn.classList.remove('wrong');
        setJokerImage();
      }
    });
  }
}

/* ----------------------------------------------------------
    9b. REWARD FLASH ("YOU PASSED!" + Puzzle Piece preview)
   Flashes for 1.5s after each correct answer, previewing the
   puzzle piece that was just unlocked. The preview slices
   puzzle.png the same way the Scene 4 grid does.
   ---------------------------------------------------------- */
function showRewardFlash(pieceIndex, onDone) {
  const flash = document.getElementById('reward-flash');
  const preview = document.getElementById('reward-piece-preview');
  const label = document.getElementById('reward-piece-label');

  const col = pieceIndex % 3;
  const row = Math.floor(pieceIndex / 3);
  preview.style.backgroundImage = "url('puzzle.png')";
  preview.style.backgroundPosition = (col * 50) + '% ' + (row * 50) + '%';
  preview.style.backgroundSize = '300% 300%';
  label.textContent = 'PUZZLE PIECE #' + (pieceIndex + 1) + ' UNLOCKED';

  flash.classList.remove('hidden');
  setTimeout(function () {
    flash.classList.add('hidden');
    if (onDone) onDone();
  }, 1500);
}

/* ----------------------------------------------------------
   10. THE FINAL PICTURE PUZZLE (Scene 4)
   3x3 grid, click-to-swap. Grid stays hidden until the
   typewriter intro finishes.
   ---------------------------------------------------------- */
const grid = document.getElementById('puzzle-grid');
const puzzleFeedback = document.getElementById('puzzle-feedback');

function shuffleArray(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

function isSolved() {
  return state.puzzle.every(function (piece, i) { return piece === i; });
}

function initPuzzleIntro() {
  typewriter(document.getElementById('puzzle-dialogue'),
    "You survived the nonsense. Now, piece together what you've broken.",
    40, function () {
      // Reveal the board + buttons only after typing finishes.
      state.puzzle = shuffleArray([0, 1, 2, 3, 4, 5, 6, 7, 8]);
      if (isSolved()) state.puzzle = shuffleArray(state.puzzle);
      state.selectedTile = null;
      puzzleFeedback.textContent = '';
      puzzleFeedback.className = 'feedback hidden';
      renderTiles();
      grid.classList.remove('hidden');
      document.getElementById('btn-shuffle').classList.remove('hidden');
      document.getElementById('btn-solve').classList.remove('hidden');
    });
}

function renderTiles() {
  grid.innerHTML = '';
  const sourceImg = document.getElementById('puzzle-source');
  const src = sourceImg ? sourceImg.src : 'puzzle.png';

  state.puzzle.forEach(function (piece, pos) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    if (state.selectedTile === pos) tile.classList.add('selected');

    // Map piece index -> background-position slice (3x3).
    const col = piece % 3;
    const row = Math.floor(piece / 3);
    tile.style.backgroundImage = "url('" + src + "')";
    tile.style.backgroundPosition = (col * 50) + '% ' + (row * 50) + '%';

    tile.addEventListener('click', function () { handleTileClick(pos); });
    grid.appendChild(tile);
  });
}

function handleTileClick(pos) {
  if (state.selectedTile === null) {
    state.selectedTile = pos;        // first click: select
  } else if (state.selectedTile === pos) {
    state.selectedTile = null;       // same tile: deselect
  } else {
    // swap the two pieces
    const a = state.puzzle[pos];
    state.puzzle[pos] = state.puzzle[state.selectedTile];
    state.puzzle[state.selectedTile] = a;
    state.selectedTile = null;
  }
  renderTiles();
}

document.getElementById('btn-shuffle').addEventListener('click', function () {
  state.puzzle = shuffleArray(state.puzzle);
  state.selectedTile = null;
  puzzleFeedback.textContent = '';
  renderTiles();
});

document.getElementById('btn-solve').addEventListener('click', function () {
  if (isSolved()) {
    cinematicReveal();              // flash the photo, then Scene 5
  } else {
    puzzleFeedback.textContent = 'The door does not move. Something is out of place.';
    puzzleFeedback.className = 'feedback';
    grid.classList.remove('shake');
    void grid.offsetWidth;          // restart the shake animation
    grid.classList.add('shake');
  }
});

/* ----------------------------------------------------------
   11. SCENE 5 -- triggerEnding() (final cutscene)
   Violent glitch -> white -> falling pixel snow -> text fades
   -> pixels stop -> End Game button.
   ---------------------------------------------------------- */
const snowCanvas = document.getElementById('snow-canvas');
const sctx = snowCanvas.getContext('2d');
const snowPixels = [];
let snowLoop = false;
let snowSpawn = true;

function resizeSnow() {
  snowCanvas.width = window.innerWidth;
  snowCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeSnow);

function startSnow() {
  resizeSnow();
  snowPixels.length = 0;
  snowSpawn = true;
  snowLoop = true;
  requestAnimationFrame(tickSnow);
}

// Stops generating new pixels (called once all text is on screen).
function stopSnow() { snowSpawn = false; }

function tickSnow() {
  if (!snowLoop) return;
  sctx.clearRect(0, 0, snowCanvas.width, snowCanvas.height);

  // Slowly spawn blocky black/gray data pixels.
  if (snowSpawn) {
    for (let i = 0; i < 3; i++) {
      const gray = Math.random() < 0.5;
      snowPixels.push({
        x: Math.random() * snowCanvas.width,
        y: -8 - Math.random() * 40,
        size: 3 + Math.floor(Math.random() * 4) * 2, // 3,5,7,9
        speed: 0.5 + Math.random() * 1.2,
        drift: (Math.random() - 0.5) * 0.4,
        alpha: 1,
        gray: gray
      });
    }
  }

  const bottom = snowCanvas.height;
  snowPixels.forEach(function (p) {
    p.y += p.speed;
    p.x += p.drift;
    // Dissolve in the lower portion of the screen.
    if (p.y > bottom * 0.6) {
      p.alpha = Math.max(0, 1 - ((p.y - bottom * 0.6) / (bottom * 0.4)));
    }
    sctx.globalAlpha = p.alpha;
    sctx.fillStyle = p.gray ? '#ABB2BF' : '#1F242D';
    sctx.fillRect(p.x, p.y, p.size, p.size);
  });
  sctx.globalAlpha = 1;

  // Prune dead pixels; stop the loop once everything has settled.
  for (let i = snowPixels.length - 1; i >= 0; i--) {
    const p = snowPixels[i];
    if (p.y >= bottom || p.alpha <= 0) snowPixels.splice(i, 1);
  }
  if (!snowSpawn && snowPixels.length === 0) {
    snowLoop = false;
    sctx.clearRect(0, 0, snowCanvas.width, snowCanvas.height);
    return;
  }
  requestAnimationFrame(tickSnow);
}

/* ----------------------------------------------------------
    10b. CINEMATIC PHOTO REVEAL (puzzle solved)
   White photo-flash -> the solved image slams in -> dark cut,
   then the glitch/white ending takes over.
   ---------------------------------------------------------- */
function cinematicReveal() {
  const flash = document.getElementById('puzzle-flash');
  const img = document.getElementById('puzzle-flash-img');
  const source = document.getElementById('puzzle-source');
  if (source) img.src = source.src;   // the now-perfect image
  img.alt = 'Scanned Document';

  playAudio('sfx-glitch', false, 1.0);
  flash.classList.remove('hidden');
  flash.classList.add('active');

  setTimeout(function () {
    flash.classList.remove('active');
    flash.classList.add('hidden');
    triggerEnding();
  }, 2300);
}

function triggerEnding() {
  stopTypewriter();
  playAudio('sfx-glitch', false, 1.0);

  // 1.5s of violent black/white/red strobing, then pure white.
  triggerGlitch(1500, true);
  setTimeout(function () {
    goToScene('scene-ending');
    startSnow();
    runEndingText();
  }, 1500);
}

function runEndingText() {
  const line1 = document.getElementById('ending-line-1');
  const line2 = document.getElementById('ending-line-2');
  const line3 = document.getElementById('ending-line-3');
  const endBtn = document.getElementById('btn-end-game');

  // Ghostly fade-ins (3s each), 2s apart, red line third.
  setTimeout(function () { line1.classList.add('show'); }, 600);
  setTimeout(function () { line2.classList.add('show'); }, 2600);
  setTimeout(function () { line3.classList.add('show'); }, 4600);

  // After all text is up, stop the snow + show the End Game button.
  setTimeout(function () {
    stopSnow();
    endBtn.classList.add('show');
  }, 8600);
}

document.getElementById('btn-end-game').addEventListener('click', function () {
  location.reload();
});

document.getElementById('btn-gameover-reload').addEventListener('click', function () {
  // TRY AGAIN: the Joker cuts in full-screen for 3s, then reloads.
  this.disabled = true;
  triggerJumpcut(3000, 'sfx-jumpcut-long');
  setTimeout(function () { location.reload(); }, 3200);
});

/* ----------------------------------------------------------
   12. INIT
   ---------------------------------------------------------- */
renderBalloons();
