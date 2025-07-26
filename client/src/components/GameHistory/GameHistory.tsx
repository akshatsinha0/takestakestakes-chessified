import{useState,useEffect}from'react';
import{useSupabaseAuthContext}from'../../context/SupabaseAuthContext';
import{supabase}from'../../lib/supabase';
import{toast}from'react-toastify';
import GameViewer from'../GameViewer/GameViewer';
import'./GameHistory.css';

interface GameHistoryProps{
onClose:()=>void;
}

const GameHistory:React.FC<GameHistoryProps>=({onClose})=>{
const{user}=useSupabaseAuthContext();
const[games,setGames]=useState<any[]>([]);
const[loading,setLoading]=useState(true);
const[selectedGame,setSelectedGame]=useState<any>(null);

useEffect(()=>{
if(user){
loadGameHistory();
}
},[user]);

const loadGameHistory=async()=>{
try{
const{data,error}=await supabase
.from('games')
.select(`
*,
white_player:profiles!games_white_player_id_fkey(username),
black_player:profiles!games_black_player_id_fkey(username),
moves(*)
`)
.or(`white_player_id.eq.${user?.id},black_player_id.eq.${user?.id}`)
.eq('status','completed')
.order('finished_at',{ascending:false})
.limit(50);
if(error)throw error;
setGames(data||[]);
}catch(error){
console.error('Failed to load game history:',error);
toast.error('Failed to load game history');
}finally{
setLoading(false);
}
};

const getGameResult=(game:any)=>{
if(!user)return'';
const isWhite=game.white_player_id===user.id;
if(game.result==='draw')return'Draw';
if(game.result==='white_wins')return isWhite?'Win':'Loss';
if(game.result==='black_wins')return isWhite?'Loss':'Win';
return'Abandoned';
};

const getResultClass=(game:any)=>{
const result=getGameResult(game);
if(result==='Win')return'win';
if(result==='Loss')return'loss';
if(result==='Draw')return'draw';
return'abandoned';
};

if(selectedGame){
return<GameViewer game={selectedGame}onClose={()=>setSelectedGame(null)}/>;
}

return(
<div className="game-history-overlay"onClick={onClose}>
<div className="game-history-modal"onClick={e=>e.stopPropagation()}>
<div className="game-history-header">
<h3>Game History</h3>
<button className="close-btn"onClick={onClose}>×</button>
</div>
<div className="game-history-content">
{loading?(
<div className="loading">Loading games...</div>
):(
<div className="games-list">
{games.length===0?(
<div className="no-games">No games played yet</div>
):(
games.map(game=>(
<div key={game.id}className="game-item"onClick={()=>setSelectedGame(game)}>
<div className="game-players">
<div className="player white">
<span className="piece">♔</span>
{game.white_player?.username||'Unknown'}
</div>
<div className="vs">vs</div>
<div className="player black">
<span className="piece">♚</span>
{game.black_player?.username||'Unknown'}
</div>
</div>
<div className="game-info">
<div className={`result ${getResultClass(game)}`}>
{getGameResult(game)}
</div>
<div className="time-control">{game.time_control}</div>
<div className="date">
{new Date(game.finished_at).toLocaleDateString()}
</div>
</div>
</div>
))
)}
</div>
)}
</div>
</div>
</div>
);
};

export default GameHistory;