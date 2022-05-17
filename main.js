const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

const canvasNext = document.getElementById('next');
const ctxNext = canvasNext.getContext('2d');

// 뿌려주는 값 저장
let accountValues = {
  score: 0,
  level: 0,
  lines: 0
};

function updateAccount(key, value) {
  let element = document.getElementById(key);
  if (element) {
    // 태그 안의 값을 바꿔줌
    element.textContent = value;
  }
}

// proxy는 새로운 행동을 정의할 때 사용
// target은 accountValues임 즉, accountValues값을 변경해주는 작업
// account.score += point; 로 값을 변경해줌
// account.key = value;
let account = new Proxy(accountValues, {
  set: (target, key, value) => {
    // 저장되는 accountValues 값을 변경
    target[key] = value;
    // html에 변경된 값 뿌려줌
    updateAccount(key, value);
    return true;
  }
});

let requestId = null;
let time = null;

// up버튼 시계방향으로 회전, q버튼 반시계방향으로 회전
// key style에 따라 block p를 x,y축방향으로 -1,+1
const moves = {
  [KEY.LEFT]: (p) => ({ ...p, x: p.x - 1 }),
  [KEY.RIGHT]: (p) => ({ ...p, x: p.x + 1 }),
  [KEY.DOWN]: (p) => ({ ...p, y: p.y + 1 }),
  [KEY.SPACE]: (p) => ({ ...p, y: p.y + 1 }),
  [KEY.UP]: (p) => board.rotate(p, ROTATION.RIGHT),
  [KEY.Q]: (p) => board.rotate(p, ROTATION.LEFT)
};

// block 생성
// board.piece에 새로운 color, shape 생성됨
let board = new Board(ctx, ctxNext);

initNext();
showHighScores();


function initNext() {
  // Calculate size of canvas from constants.
  // preview 캔버스 크기
  ctxNext.canvas.width = 4 * BLOCK_SIZE;
  ctxNext.canvas.height = 4 * BLOCK_SIZE;
  // block의 크기 설정 (두께설정)
  ctxNext.scale(BLOCK_SIZE, BLOCK_SIZE);
}

// paly버튼 클릭시 동작
function addEventListener() {
  document.removeEventListener('keydown', handleKeyPress);
  document.addEventListener('keydown', handleKeyPress);
}

function handleKeyPress(event) {
  
  // p버튼 - 일시정지
  if (event.keyCode === KEY.P) {
    pause();
  }
  // esc버튼 - 게임종료
  if (event.keyCode === KEY.ESC) {
    gameOver();
  } else if (moves[event.keyCode]) {
    // 동작 중단
    event.preventDefault();
    // Get new state
    // p : 새로운 block, 위에 선언한 const moves에 key값과 board모양 넘겨줌
    let p = moves[event.keyCode](board.piece);
    
    if (event.keyCode === KEY.SPACE) {
      // Hard drop
      if (document.querySelector('#pause-btn').style.display === 'block') dropSound.play();
      else return;
      
      while (board.valid(p)) {
        // 이동 가능한 상태라면 조각을 이동한다.
        // 아래로 내릴시 점수 추가
        account.score += POINTS.HARD_DROP;
        board.piece.move(p);
        p = moves[KEY.DOWN](board.piece);
      }
      board.piece.hardDrop();

    } else if (board.valid(p)) {
      if (document.querySelector('#pause-btn').style.display === 'block') {
        movesSound.play();
      }
      board.piece.move(p);
      // 스페이스바 클릭시 큰점수
      if (event.keyCode === KEY.DOWN && 
          document.querySelector('#pause-btn').style.display === 'block') {
        account.score += POINTS.SOFT_DROP;
      }
    }
  }
}

function resetGame() {
  account.score = 0;
  account.lines = 0;
  account.level = 0;
  board.reset();
  time = { start: performance.now(), elapsed: 0, level: LEVEL[account.level] };
}

function play() {
  addEventListener();
  if (document.querySelector('#play-btn').style.display == '') {
    resetGame();
  }

  // If we have an old game running then cancel it
  if (requestId) {
    cancelAnimationFrame(requestId);
  }

  animate();
  document.querySelector('#play-btn').style.display = 'none';
  document.querySelector('#pause-btn').style.display = 'block';
  backgroundSound.play();
}

function animate(now = 0) {
  time.elapsed = now - time.start;
  if (time.elapsed > time.level) {
    time.start = now;
    if (!board.drop()) {
      gameOver();
      return;
    }
  }

  // Clear board before drawing new state.
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  board.draw();
  requestId = requestAnimationFrame(animate);
}

function gameOver() {
  cancelAnimationFrame(requestId);

  ctx.fillStyle = 'black';
  ctx.fillRect(1, 3, 8, 1.2);
  ctx.font = '1px Arial';
  ctx.fillStyle = 'red';
  ctx.fillText('GAME OVER', 1.8, 4);
  
  sound.pause();
  finishSound.play();
  checkHighScore(account.score);

  document.querySelector('#pause-btn').style.display = 'none';
  document.querySelector('#play-btn').style.display = '';
}

function pause() {
  if (!requestId) {
    document.querySelector('#play-btn').style.display = 'none';
    document.querySelector('#pause-btn').style.display = 'block';
    animate();
    backgroundSound.play();
    return;
  }

  cancelAnimationFrame(requestId);
  requestId = null;

  ctx.fillStyle = 'black';
  ctx.fillRect(1, 3, 8, 1.2);
  ctx.font = '1px Arial';
  ctx.fillStyle = 'yellow';
  ctx.fillText('PAUSED', 3, 4);
  document.querySelector('#play-btn').style.display = 'block';
  document.querySelector('#pause-btn').style.display = 'none';
  sound.pause();
}

function showHighScores() {
  const highScores = JSON.parse(localStorage.getItem('highScores')) || [];
  const highScoreList = document.getElementById('highScores');

  highScoreList.innerHTML = highScores
    .map((score) => `<li>${score.score} - ${score.name}`)
    .join('');
}

function checkHighScore(score) {
  const highScores = JSON.parse(localStorage.getItem('highScores')) || [];
  const lowestScore = highScores[NO_OF_HIGH_SCORES - 1]?.score ?? 0;

  if (score > lowestScore) {
    const name = prompt('You got a highscore! Enter name:');
    const newScore = { score, name };
    saveHighScore(newScore, highScores);
    showHighScores();
  }
}

function saveHighScore(score, highScores) {
  highScores.push(score);
  highScores.sort((a, b) => b.score - a.score);
  highScores.splice(NO_OF_HIGH_SCORES);

  localStorage.setItem('highScores', JSON.stringify(highScores));
}