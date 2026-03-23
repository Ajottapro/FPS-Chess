/* ═══════════════════════════════════════════════════
   FPS CHESS — CONQUEST  |  Game Logic
   ═══════════════════════════════════════════════════ */

'use strict';

// ─── PIECE DEFINITIONS ───────────────────────────────
const PIECES = {
  pawn: {
    symbol: { white: '♙', black: '♟' },
    name: 'Peón', weapon: 'Cuchillo', hp: 80, speed: 6,
    damage: 22, abilityName: 'Lanzamiento', abilityCooldown: 4,
    color: '#aaffaa', icon: '🗡',
    desc: 'Rápido y ágil. Ataca cuerpo a cuerpo con cuchillo. Habilidad: lanza el cuchillo a distancia.'
  },
  rook: {
    symbol: { white: '♖', black: '♜' },
    name: 'Torre', weapon: 'Escopeta', hp: 200, speed: 2.5,
    damage: 55, abilityName: 'Barrera', abilityCooldown: 8,
    color: '#aaaaff', icon: '🏰',
    desc: 'Tanque lento pero con gran HP. Escopeta devastadora a corta distancia. Habilidad: barrera defensiva.'
  },
  knight: {
    symbol: { white: '♘', black: '♞' },
    name: 'Caballo', weapon: 'Pistolas Duales', hp: 100, speed: 8,
    damage: 18, abilityName: 'Dash', abilityCooldown: 2.5,
    color: '#ffcc44', icon: '🐴',
    desc: 'Muy rápido. Pistolas duales con alta cadencia. Habilidad: dash de alta velocidad.'
  },
  bishop: {
    symbol: { white: '♗', black: '♝' },
    name: 'Alfil', weapon: 'Rifle de Francotirador', hp: 90, speed: 4,
    damage: 75, abilityName: 'Zoom', abilityCooldown: 5,
    color: '#ff8844', icon: '🔭',
    desc: 'Ataca a distancia. Alto daño de un solo disparo pero lenta recarga. Habilidad: modo zoom largo alcance.'
  },
  queen: {
    symbol: { white: '♕', black: '♛' },
    name: 'Reina', weapon: 'Arsenal Total', hp: 150, speed: 6,
    damage: 40, abilityName: 'Explosión Arcana', abilityCooldown: 6,
    color: '#ff44ff', icon: '👑',
    desc: 'La más poderosa. Daño mixto, movilidad alta. Habilidad: explosión en área.'
  },
  king: {
    symbol: { white: '♔', black: '♚' },
    name: 'Rey', weapon: 'Martillo Real + Escudo', hp: 180, speed: 3.5,
    damage: 48, abilityName: 'Escudo Real', abilityCooldown: 7,
    color: '#44ffee', icon: '⚜',
    desc: 'Poderoso y defensivo. Escudo bloquea proyectiles. Habilidad: escudo que refleja daño.'
  }
};

const PIECE_ORDER = ['pawn','rook','knight','bishop','queen','king'];

function getPieceType(pieceCode) {
  const map = { p:'pawn', r:'rook', n:'knight', b:'bishop', q:'queen', k:'king' };
  return map[pieceCode.toLowerCase()] || 'pawn';
}
function getPieceCode(type, isWhite) {
  const map = { pawn:'p', rook:'r', knight:'n', bishop:'b', queen:'q', king:'k' };
  const c = map[type]; return isWhite ? c.toUpperCase() : c;
}

// ─── GAME STATE ──────────────────────────────────────
const GS = {
  mode: 'menu',           // menu|chess|fps|training
  localColor: 'white',
  playerName: 'Jugador',
  opponentName: 'Oponente',

  // Chess
  board: null,            // 8x8 array of piece strings
  currentTurn: 'white',
  selectedCell: null,
  validMoves: [],
  moveHistory: [],
  capturedWhite: [],
  capturedBlack: [],
  lastMove: null,
  timerWhite: 600, timerBlack: 600,
  timerInterval: null,
  inCheck: null,
  gameOver: false,
  isVsBot: false,

  // FPS Combat
  combat: null,           // { attacker, defender, attackerColor, defenderColor, ... }
  fpsActive: false,

  // Stats
  stats: { wins:0, losses:0, combatWins:0, combatLosses:0 },

  // Multiplayer
  peer: null,
  conn: null,
  myPeerId: null,
  isHost: false,
  pendingRoom: null,
  reconnectAttempts: 0,
  matchmakingInterval: null,
  waitingForOpponent: false,
};

// ─── SCREEN MANAGEMENT ───────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'screen-ranking') renderRanking();
}

// ─── TOAST NOTIFICATION ──────────────────────────────
let toastTimer;
function toast(msg, duration = 2500) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), duration);
}

// ─── CHESS ENGINE (Simple) ────────────────────────────
function initBoard() {
  const b = Array.from({length:8}, () => Array(8).fill(null));
  // Place pieces
  const backRow = ['r','n','b','q','k','b','n','r'];
  for (let c=0;c<8;c++) {
    b[0][c] = backRow[c];           // black back
    b[1][c] = 'p';                  // black pawns
    b[6][c] = 'P';                  // white pawns
    b[7][c] = backRow[c].toUpperCase(); // white back
  }
  return b;
}

function pieceColor(p) {
  if (!p) return null;
  return p === p.toUpperCase() ? 'white' : 'black';
}

function isInBounds(r,c) { return r>=0&&r<8&&c>=0&&c<8; }

function getValidMoves(board, row, col, lastMove, skipCheckTest) {
  const piece = board[row][col];
  if (!piece) return [];
  const color = pieceColor(piece);
  const moves = [];
  const type = piece.toLowerCase();
  const dir = color==='white' ? -1 : 1;
  const startRow = color==='white' ? 6 : 1;

  const add = (r,c,isCapture) => {
    if (!isInBounds(r,c)) return false;
    const target = board[r][c];
    if (target && pieceColor(target)===color) return false;
    if (isCapture && !target) return false;
    moves.push([r,c]);
    return !target;
  };

  const slide = (dr,dc) => {
    let r=row+dr, c=col+dc;
    while (isInBounds(r,c)) {
      const t=board[r][c];
      if (t) { if (pieceColor(t)!==color) moves.push([r,c]); break; }
      moves.push([r,c]); r+=dr; c+=dc;
    }
  };

  switch(type) {
    case 'p':
      if (!board[row+dir]?.[col]) {
        moves.push([row+dir, col]);
        if (row===startRow && !board[row+2*dir]?.[col]) moves.push([row+2*dir,col]);
      }
      // captures
      for (const dc of [-1,1]) {
        const tc = board[row+dir]?.[col+dc];
        if (tc && pieceColor(tc)!==color) moves.push([row+dir, col+dc]);
      }
      // en passant
      if (lastMove) {
        const [fr,fc,tr,tc] = lastMove;
        const lp = board[tr][tc];
        if (lp && lp.toLowerCase()==='p' && Math.abs(fr-tr)===2 && tr===row && Math.abs(tc-col)===1) {
          moves.push([row+dir, tc]);
        }
      }
      break;
    case 'r':
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc])=>slide(dr,dc)); break;
    case 'n':
      [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]
        .forEach(([dr,dc])=>add(row+dr,col+dc)); break;
    case 'b':
      [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>slide(dr,dc)); break;
    case 'q':
      [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]
        .forEach(([dr,dc])=>slide(dr,dc)); break;
    case 'k':
      [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
        .forEach(([dr,dc])=>add(row+dr,col+dc));
      // castling (simplified)
      if (!skipCheckTest) {
        const rank = color==='white'?7:0;
        const kRook = color==='white'?'R':'r';
        if (row===rank && col===4) {
          if (board[rank][7]===kRook && !board[rank][5] && !board[rank][6])
            moves.push([rank,6]);
          if (board[rank][0]===kRook && !board[rank][1] && !board[rank][2] && !board[rank][3])
            moves.push([rank,2]);
        }
      }
      break;
  }
  if (skipCheckTest) return moves;
  return moves.filter(([mr,mc]) => !wouldBeInCheck(board, row, col, mr, mc, color, lastMove));
}

function wouldBeInCheck(board, fr, fc, tr, tc, color, lastMove) {
  const nb = board.map(r=>[...r]);
  nb[tr][tc] = nb[fr][fc]; nb[fr][fc] = null;
  return isInCheck(nb, color, lastMove);
}

function findKing(board, color) {
  const k = color==='white'?'K':'k';
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) if (board[r][c]===k) return [r,c];
  return null;
}

function isInCheck(board, color, lastMove) {
  const kPos = findKing(board, color);
  if (!kPos) return false;
  const opp = color==='white'?'black':'white';
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    if (pieceColor(board[r][c])===opp) {
      const ms = getValidMoves(board,r,c,lastMove,true);
      if (ms.some(([mr,mc])=>mr===kPos[0]&&mc===kPos[1])) return true;
    }
  }
  return false;
}

function hasAnyMoves(board, color, lastMove) {
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    if (pieceColor(board[r][c])===color)
      if (getValidMoves(board,r,c,lastMove).length>0) return true;
  }
  return false;
}

function pieceToNotation(p) {
  if (!p) return '';
  const map = {p:'',r:'R',n:'N',b:'B',q:'Q',k:'K'};
  return map[p.toLowerCase()]||'';
}
function cellToAlgebraic(r,c) {
  return String.fromCharCode(97+c)+(8-r);
}

// ─── BOARD RENDERING ─────────────────────────────────
function renderBoard() {
  const bd = document.getElementById('chess-board');
  bd.innerHTML = '';
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    const cell = document.createElement('div');
    cell.className = 'chess-cell ' + ((r+c)%2===0 ? 'light':'dark');
    cell.dataset.r = r; cell.dataset.c = c;

    if (GS.selectedCell && GS.selectedCell[0]===r && GS.selectedCell[1]===c)
      cell.classList.add('selected');
    if (GS.validMoves.some(([mr,mc])=>mr===r&&mc===c)) {
      if (GS.board[r][c]) cell.classList.add('valid-capture');
      else cell.classList.add('valid-move');
    }
    if (GS.lastMove) {
      const [fr,fc,tr,tc] = GS.lastMove;
      if ((r===fr&&c===fc)||(r===tr&&c===tc)) cell.classList.add('last-move');
    }
    if (GS.inCheck) {
      const kPos = findKing(GS.board, GS.inCheck);
      if (kPos && kPos[0]===r && kPos[1]===c) cell.classList.add('in-check');
    }

    const piece = GS.board[r][c];
    if (piece) {
      const pEl = document.createElement('div');
      pEl.className = 'chess-piece ' + (pieceColor(piece)==='white'?'piece-white':'piece-black');
      const type = getPieceType(piece);
      pEl.textContent = PIECES[type].symbol[pieceColor(piece)];
      cell.appendChild(pEl);
    }

    cell.addEventListener('click', ()=>handleCellClick(r,c));
    bd.appendChild(cell);
  }

  // Captured pieces
  document.getElementById('captured-pieces-white').textContent =
    GS.capturedWhite.map(p=>{ const t=getPieceType(p); return PIECES[t].symbol.white; }).join('');
  document.getElementById('captured-pieces-black').textContent =
    GS.capturedBlack.map(p=>{ const t=getPieceType(p); return PIECES[t].symbol.black; }).join('');
}

function updateChessHUD() {
  document.getElementById('turn-indicator').textContent =
    'TURNO: ' + (GS.currentTurn==='white'?'BLANCAS':'NEGRAS');
  document.getElementById('hud-name-white').textContent = GS.localColor==='white'?GS.playerName:GS.opponentName;
  document.getElementById('hud-name-black').textContent = GS.localColor==='black'?GS.playerName:GS.opponentName;
  document.getElementById('chess-timer').textContent =
    formatTime(GS.currentTurn==='white'?GS.timerWhite:GS.timerBlack);
}

function formatTime(s) {
  return Math.floor(s/60)+':'+(s%60<10?'0':'')+s%60;
}

// ─── CELL CLICK HANDLER ──────────────────────────────
function handleCellClick(r, c) {
  if (GS.gameOver) return;
  if (GS.fpsActive) return;

  const myTurn = GS.currentTurn === GS.localColor;
  if (!myTurn && !GS.isVsBot) return; // not your turn in multiplayer

  const piece = GS.board[r][c];

  if (GS.selectedCell) {
    const [sr,sc] = GS.selectedCell;
    const isValid = GS.validMoves.some(([mr,mc])=>mr===r&&mc===c);

    if (isValid) {
      attemptMove(sr, sc, r, c);
      return;
    }
    // deselect or select new
    GS.selectedCell = null; GS.validMoves = [];
    if (piece && pieceColor(piece)===GS.currentTurn) {
      GS.selectedCell = [r,c];
      GS.validMoves = getValidMoves(GS.board,r,c,GS.lastMove);
    }
  } else {
    if (piece && pieceColor(piece)===GS.currentTurn) {
      GS.selectedCell = [r,c];
      GS.validMoves = getValidMoves(GS.board,r,c,GS.lastMove);
    }
  }
  renderBoard();
}

function attemptMove(fr, fc, tr, tc) {
  const piece = GS.board[fr][fc];
  const target = GS.board[tr][tc];

  if (target) {
    // COMBAT!
    startCombat({
      fromRow:fr, fromCol:fc, toRow:tr, toCol:tc,
      attackerPiece: piece, defenderPiece: target,
      attackerColor: pieceColor(piece), defenderColor: pieceColor(target)
    });
  } else {
    // Normal move
    executeMove(fr, fc, tr, tc, null);
  }
}

function executeMove(fr, fc, tr, tc, combatResult) {
  const nb = GS.board.map(r=>[...r]);
  const piece = nb[fr][fc];
  const target = nb[tr][tc];

  // En passant capture
  const type = piece.toLowerCase();
  const dir = pieceColor(piece)==='white'?-1:1;
  if (type==='p' && fc!==tc && !target) {
    nb[tr-dir][tc] = null; // remove en-passant pawn
  }

  // Castling
  if (type==='k' && Math.abs(tc-fc)===2) {
    const rank = fr;
    if (tc===6) { nb[rank][5]=nb[rank][7]; nb[rank][7]=null; }
    if (tc===2) { nb[rank][3]=nb[rank][0]; nb[rank][0]=null; }
  }

  // If defender won combat, capture attacker (stay in place)
  if (combatResult === 'defender') {
    nb[fr][fc] = null;
    GS.board = nb;
    recordCapture(piece, pieceColor(piece));
  } else {
    nb[tr][tc] = piece; nb[fr][fc] = null;
    if (target) recordCapture(target, pieceColor(target));

    // Pawn promotion
    if (type==='p' && (tr===0||tr===7)) {
      nb[tr][tc] = pieceColor(piece)==='white'?'Q':'q';
    }
    GS.board = nb;
  }

  const notation = pieceToNotation(piece)+cellToAlgebraic(fr,fc)+(target?'x':'')+cellToAlgebraic(tr,tc);
  GS.lastMove = [fr,fc,tr,tc];
  GS.moveHistory.push(notation);

  // Update move history UI
  const mh = document.getElementById('move-history');
  mh.textContent = GS.moveHistory.slice(-10).join(' ');

  // Switch turn
  GS.currentTurn = GS.currentTurn==='white'?'black':'white';
  GS.selectedCell = null; GS.validMoves = [];

  // Check state
  const nextColor = GS.currentTurn;
  GS.inCheck = isInCheck(GS.board, nextColor, GS.lastMove) ? nextColor : null;
  const hasMoves = hasAnyMoves(GS.board, nextColor, GS.lastMove);

  if (!hasMoves) {
    if (GS.inCheck) {
      endGame(GS.currentTurn==='white'?'black':'white', 'checkmate');
    } else {
      endGame(null, 'stalemate');
    }
    return;
  }

  document.getElementById('game-status').textContent = GS.inCheck ? '⚠ JAQUE!' : '';

  // Send move to peer
  if (GS.conn) {
    GS.conn.send({ type:'move', fr, fc, tr, tc, combatResult });
  }

  // Bot turn
  if (GS.isVsBot && GS.currentTurn!==GS.localColor && !GS.gameOver) {
    setTimeout(botMove, 600);
  }

  renderBoard();
  updateChessHUD();
}

function recordCapture(piece, color) {
  if (color==='white') GS.capturedWhite.push(piece);
  else GS.capturedBlack.push(piece);
}

// ─── BOT AI (Basic) ───────────────────────────────────
function botMove() {
  if (GS.gameOver) return;
  const color = GS.currentTurn;
  const allMoves = [];
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    if (pieceColor(GS.board[r][c])===color) {
      const ms = getValidMoves(GS.board,r,c,GS.lastMove);
      ms.forEach(([tr,tc])=>allMoves.push({fr:r,fc:c,tr,tc}));
    }
  }
  if (allMoves.length===0) return;

  // Prioritize captures
  const captures = allMoves.filter(m=>GS.board[m.tr][m.tc]);
  const mv = captures.length>0
    ? captures[Math.floor(Math.random()*captures.length)]
    : allMoves[Math.floor(Math.random()*allMoves.length)];

  if (GS.board[mv.tr][mv.tc]) {
    // Bot auto-wins or loses combat (simplified: higher-value piece wins)
    const attackerType = getPieceType(GS.board[mv.fr][mv.fc]);
    const defenderType = getPieceType(GS.board[mv.tr][mv.tc]);
    const av = PIECE_ORDER.indexOf(attackerType);
    const dv = PIECE_ORDER.indexOf(defenderType);
    const winner = av>=dv?'attacker':'defender';
    executeMove(mv.fr,mv.fc,mv.tr,mv.tc,winner);
  } else {
    executeMove(mv.fr,mv.fc,mv.tr,mv.tc,null);
  }
}

// ─── GAME MANAGEMENT ─────────────────────────────────
function startGame(isVsBot=false) {
  GS.board = initBoard();
  GS.currentTurn = 'white';
  GS.selectedCell = null; GS.validMoves = [];
  GS.moveHistory = []; GS.capturedWhite = []; GS.capturedBlack = [];
  GS.lastMove = null; GS.inCheck = null; GS.gameOver = false;
  GS.timerWhite = 600; GS.timerBlack = 600;
  GS.isVsBot = isVsBot;

  clearInterval(GS.timerInterval);
  GS.timerInterval = setInterval(tickTimer, 1000);

  showScreen('screen-chess');
  renderBoard();
  updateChessHUD();
  document.getElementById('move-history').textContent = '';
  document.getElementById('game-status').textContent = '';
}

function tickTimer() {
  if (GS.gameOver || GS.fpsActive) return;
  if (GS.currentTurn==='white') GS.timerWhite--;
  else GS.timerBlack--;
  if (GS.timerWhite<=0) { endGame('black','timeout'); return; }
  if (GS.timerBlack<=0) { endGame('white','timeout'); return; }
  document.getElementById('chess-timer').textContent =
    formatTime(GS.currentTurn==='white'?GS.timerWhite:GS.timerBlack);
}

function endGame(winner, reason) {
  GS.gameOver = true;
  clearInterval(GS.timerInterval);

  const isWin = winner===GS.localColor;
  const icon = winner ? (isWin?'👑':'💀') : '🤝';
  const title = winner ? (isWin?'VICTORIA':'DERROTA') : 'TABLAS';
  const subtitle = {
    checkmate:'Por jaque mate', stalemate:'Por ahogado',
    timeout:'Por tiempo agotado', resign:'Por rendición',
    draw:'De acuerdo mutuo', disconnect:'Por desconexión'
  }[reason]||'';

  if (winner) {
    if (isWin) GS.stats.wins++; else GS.stats.losses++;
  }

  saveStats();

  document.getElementById('gameover-icon').textContent = icon;
  document.getElementById('gameover-title').textContent = title;
  document.getElementById('gameover-title').style.color =
    winner ? (isWin?'#e8c84a':'#ff4444') : '#44aaff';
  document.getElementById('gameover-subtitle').textContent = subtitle;
  document.getElementById('gameover-stats').innerHTML =
    `Victorias: ${GS.stats.wins} &nbsp;|&nbsp; Derrotas: ${GS.stats.losses}<br>
     Combates ganados: ${GS.stats.combatWins} &nbsp;|&nbsp; Perdidos: ${GS.stats.combatLosses}`;

  setTimeout(()=>showScreen('screen-gameover'), 800);
}

function resignGame() {
  if (GS.gameOver) return;
  if (confirm('¿Seguro que quieres rendirte?')) {
    const winner = GS.localColor==='white'?'black':'white';
    if (GS.conn) GS.conn.send({type:'resign'});
    endGame(winner,'resign');
  }
}

function offerDraw() {
  if (GS.gameOver) return;
  if (GS.isVsBot) { toast('El bot nunca acepta tablas 🤖'); return; }
  if (GS.conn) {
    GS.conn.send({type:'offerDraw'});
    toast('Oferta de tablas enviada');
  }
}

function rematch() {
  if (GS.conn) GS.conn.send({type:'rematch'});
  startGame(GS.isVsBot);
}

function startVsBot() {
  GS.localColor = 'white';
  GS.playerName = document.getElementById('player-name')?.value || 'Tú';
  GS.opponentName = 'BOT IA';
  startGame(true);
}

// ─── FPS COMBAT ───────────────────────────────────────
const FPS = {
  scene: null, camera: null, renderer: null,
  clock: null, animId: null,
  player: null, enemy: null,
  bullets: [], particles: [],
  keys: {}, mouseX:0, mouseY:0,
  yaw: 0, pitch: 0,
  abilityCharge: 0, abilityCooldown: 0,
  combatTimer: 30,
  combatInterval: null,
  pointerLocked: false,
  arena: null,
  combatOver: false,
};

function startCombat(info) {
  GS.combat = info;
  GS.fpsActive = true;

  const attackerDef = PIECES[getPieceType(info.attackerPiece)];
  const defenderDef = PIECES[getPieceType(info.defenderPiece)];

  // Update UI
  document.getElementById('fps-attacker-name').textContent =
    attackerDef.name + (info.attackerColor===GS.localColor?' (TÚ)':' (Rival)');
  document.getElementById('fps-defender-name').textContent =
    defenderDef.name + (info.defenderColor===GS.localColor?' (TÚ)':' (Rival)');
  document.getElementById('fps-attacker-hp').textContent = attackerDef.hp;
  document.getElementById('fps-defender-hp').textContent = defenderDef.hp;
  document.getElementById('fps-attacker-hp-bar').style.width = '100%';
  document.getElementById('fps-defender-hp-bar').style.width = '100%';
  document.getElementById('fps-weapon-name').textContent = attackerDef.weapon;
  document.getElementById('fps-ability-fill').style.width = '0%';
  document.getElementById('fps-kill-msg').classList.remove('show');
  document.getElementById('fps-hit-flash').classList.remove('active');

  document.getElementById('ctp-piece-icon').textContent = attackerDef.icon;
  document.getElementById('ctp-title').textContent = `${attackerDef.name} vs ${defenderDef.name}`;
  document.getElementById('ctp-desc').textContent = `${attackerDef.desc}`;

  showScreen('screen-fps');
  initFPSScene(attackerDef, defenderDef, info);

  // If online and it's my piece attacking, I control attacker
  // If defending, I control defender (perspective swap)
  const iAmAttacker = info.attackerColor === GS.localColor;
  const myPieceDef = iAmAttacker ? attackerDef : defenderDef;
  document.getElementById('fps-weapon-name').textContent = myPieceDef.weapon;
}

function initFPSScene(attackerDef, defenderDef, info) {
  const canvas = document.getElementById('fps-canvas');

  // Cleanup previous
  if (FPS.renderer) { FPS.renderer.dispose(); cancelAnimationFrame(FPS.animId); }
  clearInterval(FPS.combatInterval);

  FPS.scene = new THREE.Scene();
  FPS.scene.background = new THREE.Color(0x1a0a2e);
  FPS.scene.fog = new THREE.Fog(0x1a0a2e, 8, 25);

  FPS.camera = new THREE.PerspectiveCamera(75, canvas.clientWidth/canvas.clientHeight, 0.1, 100);
  FPS.renderer = new THREE.WebGLRenderer({canvas, antialias:true});
  FPS.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  FPS.renderer.shadowMap.enabled = true;
  FPS.clock = new THREE.Clock();

  // Lighting
  const ambient = new THREE.AmbientLight(0x334466, 0.8);
  FPS.scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(5, 10, 5);
  dirLight.castShadow = true;
  FPS.scene.add(dirLight);

  // Arena (chess square)
  const floorGeo = new THREE.PlaneGeometry(12, 12);
  const floorMat = new THREE.MeshLambertMaterial({ color: 0x3a2510 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI/2;
  floor.receiveShadow = true;
  FPS.scene.add(floor);

  // Checkerboard pattern on floor
  for (let i=0;i<8;i++) for(let j=0;j<8;j++) {
    if ((i+j)%2===0) {
      const tileGeo = new THREE.PlaneGeometry(1.4,1.4);
      const tileMat = new THREE.MeshLambertMaterial({color:0x8b5e3c, transparent:true, opacity:.6});
      const tile = new THREE.Mesh(tileGeo, tileMat);
      tile.rotation.x = -Math.PI/2;
      tile.position.set(-5+i*1.4, 0.01, -5+j*1.4);
      FPS.scene.add(tile);
    }
  }

  // Walls with chess-themed glowing borders
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x0a0520 });
  const wallGeo = new THREE.BoxGeometry(12, 4, 0.3);
  for (const [x,y,z,ry] of [[0,2,-6,0],[0,2,6,Math.PI],[6,2,0,Math.PI/2],[-6,2,0,-Math.PI/2]]) {
    const w = new THREE.Mesh(wallGeo, wallMat); w.position.set(x,y,z); w.rotation.y=ry;
    FPS.scene.add(w);
  }

  // Glowing edge lights
  const colors = [0xe8c84a, 0xff4444, 0x44aaff, 0xff44ff];
  for (let i=0;i<4;i++) {
    const pl = new THREE.PointLight(colors[i], 1.5, 8);
    const angle = (i/4)*Math.PI*2;
    pl.position.set(Math.cos(angle)*5, 1.5, Math.sin(angle)*5);
    FPS.scene.add(pl);
  }

  // Player (attacker) — first person position
  FPS.player = {
    pos: new THREE.Vector3(0, 1.7, 4),
    hp: attackerDef.hp, maxHp: attackerDef.hp,
    def: attackerDef, speed: attackerDef.speed * 0.04,
    shootCooldown: 0, isLocal: info.attackerColor===GS.localColor,
    lastShot: 0,
  };

  // Enemy (defender) — 3D mesh
  const enemyColor = new THREE.Color(defenderDef.color);
  const bodyGeo = new THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.4, 1.0, 4, 8)
    : new THREE.CylinderGeometry(0.4, 0.4, 1.4, 8);
  const bodyMat = new THREE.MeshPhongMaterial({color: enemyColor, emissive: enemyColor, emissiveIntensity:0.3});
  const enemyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  enemyMesh.position.set(0, 0.9, -3);
  enemyMesh.castShadow = true;
  FPS.scene.add(enemyMesh);

  // Enemy head
  const headGeo = new THREE.SphereGeometry(0.3, 8, 8);
  const headMat = new THREE.MeshPhongMaterial({color: enemyColor, emissive: enemyColor, emissiveIntensity:0.5});
  const headMesh = new THREE.Mesh(headGeo, headMat);
  headMesh.position.set(0, 1.8, -3);
  FPS.scene.add(headMesh);

  // Weapon model (hands + gun)
  const gunGeo = new THREE.BoxGeometry(0.08, 0.08, 0.4);
  const gunMat = new THREE.MeshPhongMaterial({color:0x888888});
  const gunMesh = new THREE.Mesh(gunGeo, gunMat);
  gunMesh.position.set(0.2, -0.18, -0.4);
  FPS.camera.add(gunMesh);
  FPS.scene.add(FPS.camera);

  FPS.enemy = {
    mesh: enemyMesh, head: headMesh, gunMesh,
    pos: new THREE.Vector3(0, 1.7, -3),
    hp: defenderDef.hp, maxHp: defenderDef.hp,
    def: defenderDef, speed: defenderDef.speed*0.03,
    shootTimer: 1.5 + Math.random()*1.5,
    moveTimer: 0, targetX:0, targetZ:0,
    isBot: !GS.conn || info.defenderColor!==GS.localColor,
  };

  FPS.camera.position.copy(FPS.player.pos);
  FPS.yaw = 0; FPS.pitch = 0;
  FPS.keys = {}; FPS.bullets = []; FPS.particles = [];
  FPS.abilityCharge = 0; FPS.abilityCooldown = 0;
  FPS.combatTimer = 30; FPS.combatOver = false;
  FPS.pointerLocked = false;

  // Show overlay
  document.getElementById('fps-click-to-play').style.display = 'flex';

  // Combat timer
  FPS.combatInterval = setInterval(tickCombatTimer, 1000);
  document.getElementById('combat-timer').textContent = '30';
  document.getElementById('combat-timer').classList.remove('urgent');

  // Input events
  setupFPSInput();

  // Resize handler
  const onResize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    FPS.renderer.setSize(w,h);
    FPS.camera.aspect = w/h;
    FPS.camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', onResize);
  FPS.onResize = onResize;

  // Start loop
  FPS.animId = requestAnimationFrame(fpsLoop);
}

function tickCombatTimer() {
  if (FPS.combatOver) return;
  FPS.combatTimer--;
  document.getElementById('combat-timer').textContent = FPS.combatTimer;
  if (FPS.combatTimer<=10) document.getElementById('combat-timer').classList.add('urgent');
  if (FPS.combatTimer<=0) {
    // Timeout: defender wins
    endCombat('defender', 'Por tiempo agotado');
  }
}

function setupFPSInput() {
  // Remove old listeners by cloning
  const canvas = document.getElementById('fps-canvas');

  const onKeyDown = (e) => { FPS.keys[e.code] = true; if(e.code==='KeyE') useAbility(); };
  const onKeyUp   = (e) => { FPS.keys[e.code] = false; };
  const onMouseMove = (e) => {
    if (!FPS.pointerLocked) return;
    FPS.yaw   -= e.movementX * 0.002;
    FPS.pitch -= e.movementY * 0.002;
    FPS.pitch = Math.max(-Math.PI/3, Math.min(Math.PI/3, FPS.pitch));
  };
  const onMouseDown = (e) => {
    if (e.button===0 && FPS.pointerLocked && !FPS.combatOver) shoot();
  };
  const onPointerChange = () => {
    FPS.pointerLocked = document.pointerLockElement===canvas;
    document.getElementById('fps-click-to-play').style.display =
      FPS.pointerLocked ? 'none' : 'flex';
  };

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('pointerlockchange', onPointerChange);

  // Store for cleanup
  FPS._cleanup = ()=>{
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('pointerlockchange', onPointerChange);
    if(FPS.onResize) window.removeEventListener('resize', FPS.onResize);
  };
}

function enterPointerLock() {
  document.getElementById('fps-canvas').requestPointerLock();
}

function fpsLoop() {
  if (!GS.fpsActive) return;
  FPS.animId = requestAnimationFrame(fpsLoop);
  const dt = FPS.clock.getDelta();
  if (FPS.combatOver) { FPS.renderer.render(FPS.scene, FPS.camera); return; }

  updatePlayerMovement(dt);
  if (FPS.enemy.isBot) updateBotEnemy(dt);
  updateBullets(dt);
  updateParticles(dt);
  updateAbilityCharge(dt);

  FPS.renderer.render(FPS.scene, FPS.camera);
}

function updatePlayerMovement(dt) {
  const speed = FPS.player.speed * (FPS.keys['ShiftLeft']||FPS.keys['ShiftRight'] ? 1.8 : 1);
  const fwd = new THREE.Vector3(-Math.sin(FPS.yaw), 0, -Math.cos(FPS.yaw));
  const right = new THREE.Vector3(Math.cos(FPS.yaw), 0, -Math.sin(FPS.yaw));

  let moved = false;
  if (FPS.keys['KeyW']||FPS.keys['ArrowUp'])    { FPS.player.pos.addScaledVector(fwd, speed); moved=true; }
  if (FPS.keys['KeyS']||FPS.keys['ArrowDown'])   { FPS.player.pos.addScaledVector(fwd,-speed); moved=true; }
  if (FPS.keys['KeyA']||FPS.keys['ArrowLeft'])   { FPS.player.pos.addScaledVector(right,-speed); moved=true; }
  if (FPS.keys['KeyD']||FPS.keys['ArrowRight'])  { FPS.player.pos.addScaledVector(right, speed); moved=true; }

  // Clamp to arena
  FPS.player.pos.x = Math.max(-5, Math.min(5, FPS.player.pos.x));
  FPS.player.pos.z = Math.max(-5, Math.min(5, FPS.player.pos.z));
  FPS.player.pos.y = 1.7;

  FPS.camera.position.copy(FPS.player.pos);
  FPS.camera.rotation.order = 'YXZ';
  FPS.camera.rotation.y = FPS.yaw;
  FPS.camera.rotation.x = FPS.pitch;

  // Bob effect
  if (moved) {
    FPS.camera.position.y = 1.7 + Math.sin(Date.now()*0.01)*0.03;
  }
}

function updateBotEnemy(dt) {
  const e = FPS.enemy;
  e.moveTimer -= dt;
  if (e.moveTimer <= 0) {
    e.targetX = (Math.random()-0.5)*8;
    e.targetZ = (Math.random()-0.5)*8;
    e.moveTimer = 1 + Math.random()*2;
  }
  const toTarget = new THREE.Vector3(e.targetX, 1.7, e.targetZ).sub(e.pos);
  if (toTarget.length() > 0.1) {
    toTarget.normalize();
    e.pos.addScaledVector(toTarget, e.speed);
  }
  e.pos.x = Math.max(-5,Math.min(5,e.pos.x));
  e.pos.z = Math.max(-5,Math.min(5,e.pos.z));
  e.mesh.position.set(e.pos.x, 0.9, e.pos.z);
  e.head.position.set(e.pos.x, 1.8, e.pos.z);

  // Rotate toward player
  const dx = FPS.player.pos.x - e.pos.x;
  const dz = FPS.player.pos.z - e.pos.z;
  e.mesh.rotation.y = Math.atan2(dx, dz);
  e.head.rotation.y = e.mesh.rotation.y;

  // Enemy shooting
  e.shootTimer -= dt;
  if (e.shootTimer <= 0) {
    e.shootTimer = (1.5 + Math.random()*2) / (e.def.speed/4);
    enemyShoot();
  }
}

function shoot() {
  const now = Date.now();
  const cooldown = 1000 / (FPS.player.def.damage / 10 + 2);
  if (now - FPS.player.lastShot < cooldown) return;
  FPS.player.lastShot = now;

  const dir = new THREE.Vector3(0, 0, -1);
  dir.applyQuaternion(FPS.camera.quaternion);

  const bullet = {
    pos: FPS.player.pos.clone().add(new THREE.Vector3(0,-.1,0)),
    vel: dir.multiplyScalar(0.4),
    owner: 'player',
    dmg: FPS.player.def.damage * (0.8 + Math.random()*0.4),
    mesh: createBulletMesh(0xe8c84a),
  };
  FPS.scene.add(bullet.mesh);
  FPS.bullets.push(bullet);

  // Gunshot effect — camera kick
  FPS.pitch += 0.02;
  setTimeout(()=>FPS.pitch -= 0.02, 80);

  // Muzzle flash
  spawnParticles(FPS.player.pos.clone().add(dir.normalize().multiplyScalar(0.5)), 0xe8c84a, 5);

  // Update ammo display
  document.getElementById('fps-ammo').textContent = FPS.player.def.weapon;
}

function enemyShoot() {
  if (FPS.combatOver) return;
  const e = FPS.enemy;
  const dir = FPS.player.pos.clone().sub(e.pos).normalize();
  // Add some inaccuracy
  dir.x += (Math.random()-.5)*0.3;
  dir.y += (Math.random()-.5)*0.15;
  dir.z += (Math.random()-.5)*0.3;
  dir.normalize();

  const bullet = {
    pos: e.pos.clone(),
    vel: dir.multiplyScalar(0.3),
    owner: 'enemy',
    dmg: e.def.damage * (0.6 + Math.random()*0.4),
    mesh: createBulletMesh(0xff4444),
  };
  FPS.scene.add(bullet.mesh);
  FPS.bullets.push(bullet);
}

function createBulletMesh(color) {
  const geo = new THREE.SphereGeometry(0.05, 4, 4);
  const mat = new THREE.MeshBasicMaterial({color});
  const m = new THREE.Mesh(geo, mat);
  return m;
}

function updateBullets(dt) {
  const toRemove = [];
  for (const b of FPS.bullets) {
    b.pos.add(b.vel);
    b.mesh.position.copy(b.pos);

    // Out of arena
    if (Math.abs(b.pos.x)>7||Math.abs(b.pos.z)>7||b.pos.y<-1||b.pos.y>6) {
      toRemove.push(b); continue;
    }

    // Hit enemy
    if (b.owner==='player') {
      const ep = new THREE.Vector3(FPS.enemy.pos.x, FPS.enemy.pos.y, FPS.enemy.pos.z);
      if (b.pos.distanceTo(ep) < 0.7) {
        hitEnemy(b.dmg);
        spawnParticles(b.pos.clone(), 0xff0000, 8);
        toRemove.push(b);
      }
    }
    // Hit player
    if (b.owner==='enemy') {
      if (b.pos.distanceTo(FPS.player.pos) < 0.6) {
        hitPlayer(b.dmg);
        spawnParticles(b.pos.clone(), 0x4444ff, 8);
        toRemove.push(b);
      }
    }
  }
  for (const b of toRemove) {
    FPS.scene.remove(b.mesh);
    FPS.bullets = FPS.bullets.filter(x=>x!==b);
  }
}

function hitEnemy(dmg) {
  const e = FPS.enemy;
  e.hp = Math.max(0, e.hp - dmg);
  const pct = e.hp / e.maxHp;
  document.getElementById('fps-defender-hp-bar').style.width = (pct*100)+'%';
  document.getElementById('fps-defender-hp').textContent = Math.ceil(e.hp);
  if (pct < 0.3) document.getElementById('fps-defender-hp-bar').classList.add('low');

  // Shake enemy
  const ox = e.mesh.position.x;
  e.mesh.position.x += (Math.random()-.5)*.3;
  setTimeout(()=>{ if(e.mesh) e.mesh.position.x = ox; }, 80);

  if (e.hp <= 0) {
    endCombat('attacker', 'El atacante gana el combate!');
  }
}

function hitPlayer(dmg) {
  FPS.player.hp = Math.max(0, FPS.player.hp - dmg);
  const pct = FPS.player.hp / FPS.player.maxHp;
  document.getElementById('fps-attacker-hp-bar').style.width = (pct*100)+'%';
  document.getElementById('fps-attacker-hp').textContent = Math.ceil(FPS.player.hp);
  if (pct < 0.3) document.getElementById('fps-attacker-hp-bar').classList.add('low');

  // Hit flash
  const flash = document.getElementById('fps-hit-flash');
  flash.classList.add('active');
  setTimeout(()=>flash.classList.remove('active'), 150);

  // Camera shake
  FPS.pitch += (Math.random()-.5)*.08;
  FPS.yaw   += (Math.random()-.5)*.05;

  if (FPS.player.hp <= 0) {
    endCombat('defender', 'El defensor repele el ataque!');
  }
}

function useAbility() {
  if (FPS.combatOver) return;
  if (FPS.abilityCooldown > 0) { toast(`Habilidad recargando... ${FPS.abilityCooldown.toFixed(1)}s`); return; }

  const def = FPS.player.def;
  FPS.abilityCooldown = def.abilityCooldown;

  switch(def.name) {
    case 'Peón':
      // Knife throw — high damage forward
      const throwDir = new THREE.Vector3(0,0,-1).applyQuaternion(FPS.camera.quaternion);
      for(let i=0;i<3;i++) setTimeout(()=>{
        const b = {
          pos: FPS.player.pos.clone(),
          vel: throwDir.clone().multiplyScalar(0.6 + i*.1),
          owner:'player', dmg: def.damage*1.5,
          mesh: createBulletMesh(0xffff44)
        };
        FPS.scene.add(b.mesh); FPS.bullets.push(b);
      }, i*60);
      toast('🗡 ¡Lanzamiento de cuchillo!');
      break;
    case 'Torre':
      // Fortify — temp HP boost
      FPS.player.hp = Math.min(FPS.player.maxHp, FPS.player.hp + 60);
      document.getElementById('fps-attacker-hp').textContent = Math.ceil(FPS.player.hp);
      document.getElementById('fps-attacker-hp-bar').style.width = (FPS.player.hp/FPS.player.maxHp*100)+'%';
      toast('🏰 ¡Barrera activada! +60 HP');
      break;
    case 'Caballo':
      // Dash forward
      const dashDir = new THREE.Vector3(0,0,-1).applyQuaternion(FPS.camera.quaternion);
      dashDir.y = 0; dashDir.normalize();
      FPS.player.pos.addScaledVector(dashDir, 3.5);
      FPS.player.pos.x = Math.max(-4.5, Math.min(4.5, FPS.player.pos.x));
      FPS.player.pos.z = Math.max(-4.5, Math.min(4.5, FPS.player.pos.z));
      spawnParticles(FPS.player.pos.clone(), 0xffcc44, 15);
      toast('🐴 ¡Dash!');
      break;
    case 'Alfil':
      // Zoom — kill enemy with chance
      if (Math.random() < 0.7) {
        hitEnemy(FPS.enemy.maxHp * 0.5);
        toast('🔭 ¡Disparo de francotirador! Impacto crítico!');
      } else {
        toast('🔭 Disparo fallido...');
      }
      break;
    case 'Reina':
      // AoE explosion — massive damage
      hitEnemy(FPS.enemy.maxHp * 0.6);
      spawnParticles(FPS.enemy.pos.clone(), 0xff44ff, 25);
      toast('👑 ¡EXPLOSIÓN ARCANA!');
      break;
    case 'Rey':
      // Shield — negate next hits
      FPS.player.shielded = true;
      setTimeout(()=>FPS.player.shielded=false, 3000);
      toast('⚜ ¡Escudo Real activado por 3 segundos!');
      break;
  }
}

function updateAbilityCharge(dt) {
  if (FPS.abilityCooldown > 0) {
    FPS.abilityCooldown -= dt;
    const pct = 1 - (FPS.abilityCooldown / FPS.player.def.abilityCooldown);
    document.getElementById('fps-ability-fill').style.width = (pct*100)+'%';
  } else {
    document.getElementById('fps-ability-fill').style.width = '100%';
  }
}

function spawnParticles(pos, color, count) {
  for (let i=0;i<count;i++) {
    const geo = new THREE.SphereGeometry(0.04, 3, 3);
    const mat = new THREE.MeshBasicMaterial({color, transparent:true, opacity:1});
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    const vel = new THREE.Vector3((Math.random()-.5)*.3, Math.random()*.2, (Math.random()-.5)*.3);
    FPS.scene.add(mesh);
    FPS.particles.push({mesh, vel, life:1});
  }
}

function updateParticles(dt) {
  for (const p of [...FPS.particles]) {
    p.life -= dt * 2;
    p.mesh.position.add(p.vel);
    p.vel.y -= 0.01;
    p.mesh.material.opacity = Math.max(0, p.life);
    if (p.life <= 0) {
      FPS.scene.remove(p.mesh);
      FPS.particles = FPS.particles.filter(x=>x!==p);
    }
  }
}

function endCombat(winner, msg) {
  if (FPS.combatOver) return;
  FPS.combatOver = true;
  clearInterval(FPS.combatInterval);

  const killMsg = document.getElementById('fps-kill-msg');
  if (winner === 'attacker') {
    killMsg.textContent = '⚔ ¡VICTORIA EN COMBATE!';
    killMsg.style.color = '#e8c84a';
    GS.stats.combatWins++;
  } else {
    killMsg.textContent = '💀 DERROTA EN COMBATE';
    killMsg.style.color = '#ff4444';
    GS.stats.combatLosses++;
  }
  killMsg.classList.add('show');
  toast(msg, 3000);

  // Exit pointer lock
  if (document.pointerLockElement) document.exitPointerLock();

  setTimeout(() => {
    cleanupFPS();
    GS.fpsActive = false;
    showScreen('screen-chess');
    executeMove(
      GS.combat.fromRow, GS.combat.fromCol,
      GS.combat.toRow, GS.combat.toCol,
      winner
    );
    if (GS.conn) GS.conn.send({type:'combatResult', winner});
  }, 2000);
}

function cleanupFPS() {
  cancelAnimationFrame(FPS.animId);
  if (FPS._cleanup) FPS._cleanup();
  if (FPS.renderer) FPS.renderer.dispose();
  FPS.bullets = []; FPS.particles = [];
}

// ─── TRAINING MODE ────────────────────────────────────
function startTraining(pieceType) {
  GS.localColor = 'white';
  GS.isVsBot = true;
  const def = PIECES[pieceType];
  const fakePiece = getPieceCode(pieceType, true);
  const fakeDefender = getPieceCode('knight', false);
  GS.combat = {
    fromRow:4, fromCol:4, toRow:4, toCol:5,
    attackerPiece: fakePiece, defenderPiece: fakeDefender,
    attackerColor:'white', defenderColor:'black'
  };
  GS.fpsActive = true;
  startCombat(GS.combat);
}

// ─── MULTIPLAYER (PeerJS) ─────────────────────────────
function initPeer(callback) {
  if (GS.peer && GS.peer.id) { callback(GS.peer.id); return; }
  GS.peer = new Peer(undefined, {
    host: '0.peerjs.com', port: 443, path: '/', secure: true,
    config: { iceServers: [{urls:'stun:stun.l.google.com:19302'}] }
  });
  GS.peer.on('open', id => {
    GS.myPeerId = id;
    document.getElementById('peer-id-display').textContent = 'Tu ID: ' + id;
    callback(id);
  });
  GS.peer.on('error', e => {
    toast('Error de conexión: ' + e.type);
    document.getElementById('matchmaking-status').textContent = 'Error: ' + e.type;
  });
  GS.peer.on('connection', conn => {
    if (!GS.conn) setupConnection(conn);
  });
  GS.peer.on('disconnected', () => {
    toast('Desconectado del servidor de señalización');
    attemptReconnect();
  });
}

function setupConnection(conn) {
  GS.conn = conn;
  GS.reconnectAttempts = 0;
  conn.on('open', () => {
    toast('✅ Oponente conectado: ' + conn.peer.substring(0,8) + '...');
    document.getElementById('matchmaking-status').textContent = '¡Conectado!';
    // Start game after short delay
    setTimeout(() => {
      GS.opponentName = conn.peer.substring(0,8);
      if (GS.isHost) {
        GS.localColor = selectedColor==='random' ? (Math.random()<.5?'white':'black') : selectedColor;
        conn.send({type:'gameStart', opponentColor: GS.localColor==='white'?'black':'white', opponentName: GS.playerName});
        startGame(false);
      }
    }, 500);
  });
  conn.on('data', handlePeerData);
  conn.on('close', () => {
    toast('⚠ Oponente desconectado');
    if (!GS.gameOver) attemptReconnect();
  });
  conn.on('error', e => toast('Error de conexión: ' + e));
}

function handlePeerData(data) {
  switch(data.type) {
    case 'gameStart':
      GS.localColor = data.opponentColor;
      GS.opponentName = data.opponentName || 'Oponente';
      startGame(false);
      break;
    case 'move':
      if (GS.board[data.tr][data.tc] && !data.combatResult) {
        // Will trigger combat on the opponent's side
        startCombat({
          fromRow:data.fr, fromCol:data.fc, toRow:data.tr, toCol:data.tc,
          attackerPiece:GS.board[data.fr][data.fc], defenderPiece:GS.board[data.tr][data.tc],
          attackerColor:pieceColor(GS.board[data.fr][data.fc]),
          defenderColor:pieceColor(GS.board[data.tr][data.tc])
        });
      } else {
        executeMove(data.fr, data.fc, data.tr, data.tc, data.combatResult);
      }
      break;
    case 'combatResult':
      clearInterval(FPS.combatInterval);
      FPS.combatOver = true;
      cleanupFPS();
      GS.fpsActive = false;
      showScreen('screen-chess');
      executeMove(GS.combat.fromRow,GS.combat.fromCol,GS.combat.toRow,GS.combat.toCol,data.winner);
      break;
    case 'resign':
      endGame(GS.localColor, 'resign');
      break;
    case 'offerDraw':
      if (confirm('Tu oponente ofrece tablas. ¿Aceptas?')) {
        GS.conn.send({type:'acceptDraw'});
        endGame(null,'draw');
      } else {
        GS.conn.send({type:'declineDraw'});
        toast('Oferta de tablas rechazada');
      }
      break;
    case 'acceptDraw': endGame(null,'draw'); break;
    case 'declineDraw': toast('Oponente rechazó las tablas'); break;
    case 'rematch': startGame(false); break;
    case 'reconnect': toast('✅ Oponente reconectado'); break;
  }
}

let selectedColor = 'white';
function selectColor(color, btn) {
  selectedColor = color;
  document.querySelectorAll('.color-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}

function startMatchmaking() {
  const name = document.getElementById('player-name').value || 'Comandante';
  GS.playerName = name;

  const btn = document.getElementById('btn-matchmaking');
  const status = document.getElementById('matchmaking-status');

  if (GS.waitingForOpponent) {
    // Cancel
    GS.waitingForOpponent = false;
    clearInterval(GS.matchmakingInterval);
    btn.textContent = 'BUSCAR PARTIDA';
    status.textContent = 'Búsqueda cancelada';
    return;
  }

  GS.waitingForOpponent = true;
  btn.textContent = 'CANCELAR BÚSQUEDA';
  status.textContent = 'Iniciando...';

  initPeer(id => {
    status.textContent = '🔍 Buscando rivales...';
    // Simplified matchmaking: broadcast to known "lobby" peer
    // In production: use a signaling server
    // For demo: show room code and wait
    const dots = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
    let i = 0;
    GS.matchmakingInterval = setInterval(()=>{
      status.textContent = dots[i++%dots.length] + ' Buscando rivales... (usa sala privada para jugar con amigos)';
    }, 200);
    toast('Comparte tu ID para jugar: ' + id.substring(0,8));
  });
}

function createPrivateRoom() {
  const name = document.getElementById('player-name').value || 'Comandante';
  GS.playerName = name;
  GS.isHost = true;

  initPeer(id => {
    const shortCode = id.substring(0, 8).toUpperCase();
    document.getElementById('room-code-display').textContent = shortCode;
    toast('Sala creada: ' + shortCode + ' — comparte con tu amigo');
  });
}

function joinPrivateRoom() {
  const code = document.getElementById('room-code-input').value.trim();
  if (!code) { toast('Introduce un código de sala'); return; }
  const name = document.getElementById('player-name').value || 'Comandante';
  GS.playerName = name;
  GS.isHost = false;

  // Try to find peer by partial ID
  initPeer(myId => {
    // Try common peer ID formats
    const tryConnect = (peerId) => {
      const conn = GS.peer.connect(peerId, {reliable:true});
      conn.on('open', () => setupConnection(conn));
      conn.on('error', () => toast('No se pudo conectar con ese código'));
    };
    tryConnect(code.toLowerCase());
  });
}

function attemptReconnect() {
  if (GS.reconnectAttempts >= 3) {
    toast('Reconexión fallida. El juego continúa contra bot.');
    GS.isVsBot = true;
    GS.conn = null;
    return;
  }
  GS.reconnectAttempts++;
  toast(`Reconectando... intento ${GS.reconnectAttempts}/3`);
  setTimeout(() => {
    if (GS.peer) GS.peer.reconnect();
  }, 3000 * GS.reconnectAttempts);
}

// ─── RANKING ─────────────────────────────────────────
const MOCK_RANKING = [
  {name:'GrandMaster_K', elo:2450, w:87, l:12},
  {name:'ChessWarlord', elo:2310, w:64, l:22},
  {name:'FPSKing99', elo:2180, w:55, l:30},
  {name:'PawnSlayer', elo:2050, w:43, l:25},
  {name:'RookLord', elo:1980, w:38, l:28},
  {name:'QueensBishop', elo:1870, w:31, l:24},
  {name:'KnightRider', elo:1750, w:27, l:29},
  {name:'CheckM8', elo:1620, w:22, l:33},
  {name:'Tú', elo:1200 + GS.stats.wins*10, w:GS.stats.wins, l:GS.stats.losses},
];

function renderRanking() {
  MOCK_RANKING[8].elo = 1200 + GS.stats.wins * 10;
  MOCK_RANKING[8].w = GS.stats.wins;
  MOCK_RANKING[8].l = GS.stats.losses;
  const sorted = [...MOCK_RANKING].sort((a,b)=>b.elo-a.elo);
  const container = document.getElementById('ranking-table');
  container.innerHTML = sorted.map((p,i)=>`
    <div class="ranking-row">
      <div class="rank-pos ${i===0?'gold':i===1?'silver':i===2?'bronze':''}">${i+1}</div>
      <div class="rank-name">${p.name==='Tú'?'<b>'+GS.playerName+'</b>':p.name}</div>
      <div class="rank-elo">${p.elo} ELO</div>
      <div class="rank-wl">${p.w}V/${p.l}D</div>
    </div>
  `).join('');
}

// ─── PERSISTENCE ─────────────────────────────────────
function saveStats() {
  try { localStorage.setItem('fpschess_stats', JSON.stringify(GS.stats)); } catch(e){}
}
function loadStats() {
  try {
    const s = localStorage.getItem('fpschess_stats');
    if (s) Object.assign(GS.stats, JSON.parse(s));
  } catch(e){}
}

// ─── INIT ─────────────────────────────────────────────
(function init() {
  loadStats();

  // Default player name
  const savedName = localStorage.getItem('fpschess_name');
  if (savedName) document.getElementById('player-name').value = savedName;
  document.getElementById('player-name').addEventListener('change', e => {
    GS.playerName = e.target.value || 'Comandante';
    localStorage.setItem('fpschess_name', GS.playerName);
  });

  // Keyboard shortcut: Escape from FPS
  document.addEventListener('keydown', e => {
    if (e.code==='Escape' && GS.fpsActive && !FPS.combatOver) {
      // Debug escape (in real game remove this)
      endCombat('attacker', 'Combate interrumpido (debug)');
    }
  });

  showScreen('screen-menu');
  console.log('%cFPS Chess: Conquest loaded!', 'color:#e8c84a;font-size:1.2em;font-weight:bold');
})();
