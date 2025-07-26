import{useState,useEffect}from'react';
import{Chess}from'chess.js';
import'./GameViewer.css';

interface GameViewerProps{
game:any;
onClose:()=>void;
}

const GameViewer:React.FC<GameViewerProps>=({game,onClose})=>{
const[chess]=useState(new Chess());
const[currentMoveIndex,setCurrentMoveIndex]=useState(-1);
const[position,setPosition]=useState(chess.fen());

useEffect(()=>{
chess.reset();
setCurrentMoveIndex(-1);
setPosition(chess.fen());
},[game]);

const goToMove=(moveIndex:number)=>{
chess.reset();
if(moveIndex>=0){
const movesToPlay=game.moves.slice(0,moveIndex+1);
movesToPlay.forEach((move:any)=>{
chess.move(move.san);
});
}
setCurrentMoveIndex(moveIndex);
setPosition(chess.fen());
};

const nextMove=()=>{
if(currentMoveIndex<game.moves.length-1){
goToMove(currentMoveIndex+1);
}
};

const prevMove=()=>{
if(currentMoveIndex>=-1){
goToMove(currentMoveIndex-1);
}
};

const goToStart=()=>goToMove(-1);
const goToEnd=()=>goToMove(game.moves.length-1);

const renderBoard=()=>{
const board=chess.board();
return(
<div className="chess-board">
{board.map((row,rankIndex)=>(
row.map((square,fileIndex)=>{
const isLight=(rankIndex+fileIndex)%2===0;
const piece=square?`${square.color}${square.type}`:null;
return(
<div key={`${rankIndex}-${fileIndex}`}className={`square ${isLight?'light':'dark'}`}>
{piece&&<div className={`piece ${piece}`}>{getPieceSymbol(piece)}</div>}
</div>
);
})
))}
</div>
);
};

const getPieceSymbol=(piece:string)=>{
const symbols:Record<string,string>={
'wp':'♙','wr':'♖','wn':'♘','wb':'♗','wq':'♕','wk':'♔',
'bp':'♟','br':'♜','bn':'♞','bb':'♝','bq':'♛','bk':'♚'
};
return symbols[piece]||'';
};

return(
<div className="game-viewer-overlay"onClick={onClose}>
<div className="game-viewer-modal"onClick={e=>e.stopPropagation()}>
<div className="game-viewer-header">
<h3>Game Review</h3>
<button className="close-btn"onClick={onClose}>×</button>
</div>
<div className="game-viewer-content">
<div className="board-section">
{renderBoard()}
<div className="game-controls">
<button onClick={goToStart}disabled={currentMoveIndex===-1}>⏮</button>
<button onClick={prevMove}disabled={currentMoveIndex===-1}>◀</button>
<button onClick={nextMove}disabled={currentMoveIndex>=game.moves.length-1}>▶</button>
<button onClick={goToEnd}disabled={currentMoveIndex>=game.moves.length-1}>⏭</button>
</div>
</div>
<div className="moves-section">
<h4>Moves</h4>
<div className="moves-list">
{game.moves.map((move:any,index:number)=>(
<div key={index}className={`move-item ${index===currentMoveIndex?'active':''}`}onClick={()=>goToMove(index)}>
<span className="move-number">{Math.floor(index/2)+1}{index%2===0?'.':''}</span>
<span className="move-san">{move.san}</span>
</div>
))}
</div>
</div>
</div>
</div>
</div>
);
};

export default GameViewer;