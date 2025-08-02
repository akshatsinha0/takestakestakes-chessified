import{useState,useEffect}from'react';
import{useParams,useNavigate}from'react-router-dom';
import{useSupabaseAuthContext}from'../context/SupabaseAuthContext';
import{supabase}from'../lib/supabase';
import{Chess}from'chess.js';
import{makeMove}from'../utils/gameApi';
import{toast}from'react-toastify';
import'./Game.css';

const Game:React.FC=()=>{
const{gameId}=useParams<{gameId:string}>();
const{user}=useSupabaseAuthContext();
const navigate=useNavigate();
const[game,setGame]=useState<any>(null);
const[chess]=useState(new Chess());
const[selectedSquare,setSelectedSquare]=useState<string|null>(null);
const[possibleMoves,setPossibleMoves]=useState<string[]>([]);
const[isMyTurn,setIsMyTurn]=useState(false);
const[timeLeft,setTimeLeft]=useState({white:0,black:0});

useEffect(()=>{
if(!gameId||!user)return;
loadGame();
const subscription=supabase
.channel(`game:${gameId}`)
.on('postgres_changes',{event:'UPDATE',schema:'public',table:'games',filter:`id=eq.${gameId}`},(payload)=>{
loadGame();
})
.subscribe();
return()=>{
subscription.unsubscribe();
};
},[gameId,user]);

useEffect(()=>{
if(!game)return;
const interval=setInterval(()=>{
if(game.status==='in_progress'){
const now=Date.now();
const elapsed=Math.floor((now-new Date(game.updated_at).getTime())/1000);
if(game.current_turn==='white'){
setTimeLeft(prev=>({...prev,white:Math.max(0,game.white_time_remaining-elapsed)}));
}else{
setTimeLeft(prev=>({...prev,black:Math.max(0,game.black_time_remaining-elapsed)}));
}
}
},1000);
return()=>clearInterval(interval);
},[game]);

const loadGame=async()=>{
if(!gameId)return;
try{
const{data,error}=await supabase
.from('games')
.select(`
*,
white_player:profiles!games_white_player_id_fkey(username,rating),
black_player:profiles!games_black_player_id_fkey(username,rating),
moves(*)
`)
.eq('id',gameId)
.single();
if(error)throw error;
setGame(data);
chess.load(data.board_state);
const myColor=data.white_player_id===user?.id?'white':'black';
setIsMyTurn(data.current_turn===myColor&&data.status==='in_progress');
setTimeLeft({white:data.white_time_remaining,black:data.black_time_remaining});
}catch(error){
console.error('Failed to load game:',error);
toast.error('Failed to load game');
navigate('/dashboard');
}
};

const handleSquareClick=(square:string)=>{
if(!isMyTurn)return;
if(selectedSquare===square){
setSelectedSquare(null);
setPossibleMoves([]);
return;
}
if(selectedSquare&&possibleMoves.includes(square)){
try{
const move=chess.move({from:selectedSquare,to:square,promotion:'q'});
if(move){
const newFen=chess.fen();
makeMove(gameId!,move.san,newFen,timeLeft[game.current_turn as'white'|'black']);
setSelectedSquare(null);
setPossibleMoves([]);
}
}catch(error){
console.error('Invalid move:',error);
}
return;
}
const piece=chess.get(square as any);
if(piece&&piece.color===(game.white_player_id===user?.id?'w':'b')){
setSelectedSquare(square);
const moves=chess.moves({square:square as any,verbose:true});
setPossibleMoves(moves.map((m:any)=>m.to));
}else{
setSelectedSquare(null);
setPossibleMoves([]);
}
};

const renderBoard=()=>{
const board=chess.board();
const isFlipped=game?.black_player_id===user?.id;
const displayBoard=isFlipped?board.slice().reverse():board;
return(
<div className="game-board">
{displayBoard.map((row,rankIndex)=>{
const actualRank=isFlipped?rankIndex:7-rankIndex;
const displayRow=isFlipped?row.slice().reverse():row;
return displayRow.map((square,fileIndex)=>{
const actualFile=isFlipped?7-fileIndex:fileIndex;
const squareNotation=String.fromCharCode(97+actualFile)+(actualRank+1);
const isLight=(actualRank+actualFile)%2===0;
const isSelected=selectedSquare===squareNotation;
const isPossibleMove=possibleMoves.includes(squareNotation);
const piece=square?`${square.color}${square.type}`:null;
return(
<div key={squareNotation}className={`game-square ${isLight?'light':'dark'} ${isSelected?'selected':''} ${isPossibleMove?'possible-move':''}`}onClick={()=>handleSquareClick(squareNotation)}>
{piece&&<div className={`game-piece ${piece}`}>{getPieceSymbol(piece)}</div>}
{isPossibleMove&&<div className="move-indicator"></div>}
</div>
);
});
})}
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

const formatTime=(seconds:number)=>{
const mins=Math.floor(seconds/60);
const secs=seconds%60;
return`${mins}:${secs.toString().padStart(2,'0')}`;
};

if(!game)return<div className="game-loading">Loading game...</div>;

return(
<div className="game-page">
<div className="game-header">
<button className="back-btn"onClick={()=>navigate('/dashboard')}>← Back to Dashboard</button>
<div className="game-info">
<span className="time-control">{game.time_control}</span>
<span className="game-status">{game.status.replace('_',' ')}</span>
</div>
</div>
<div className="game-content">
<div className="game-sidebar">
<div className="player-info black">
<div className="player-name">{game.black_player?.username}</div>
<div className="player-rating">({game.black_player?.rating||1200})</div>
<div className="player-time">{formatTime(timeLeft.black)}</div>
</div>
<div className="move-history">
<h4>Moves</h4>
<div className="moves-list">
{game.moves?.map((move:any,index:number)=>(
<span key={index}className="move-notation">
{Math.floor(index/2)+1}{index%2===0?'.':''} {move.san}
</span>
))}
</div>
</div>
<div className="player-info white">
<div className="player-name">{game.white_player?.username}</div>
<div className="player-rating">({game.white_player?.rating||1200})</div>
<div className="player-time">{formatTime(timeLeft.white)}</div>
</div>
</div>
<div className="board-container">
{renderBoard()}
{isMyTurn&&<div className="turn-indicator">Your Turn</div>}
</div>
</div>
</div>
);
};

export default Game;