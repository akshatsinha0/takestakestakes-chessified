import{useState,useEffect}from'react';
import{useSupabaseAuthContext}from'../../context/SupabaseAuthContext';
import{getActiveGames}from'../../utils/gameApi';
import{useNavigate}from'react-router-dom';
import'./ActiveGames.css';

const ActiveGames:React.FC=()=>{
const{user}=useSupabaseAuthContext();
const[activeGames,setActiveGames]=useState<any[]>([]);
const[loading,setLoading]=useState(true);
const navigate=useNavigate();

useEffect(()=>{
if(user){
loadActiveGames();
const interval=setInterval(loadActiveGames,5000);
return()=>clearInterval(interval);
}
},[user]);

const loadActiveGames=async()=>{
if(!user)return;
try{
const games=await getActiveGames(user.id);
setActiveGames(games);
}catch(error){
console.error('Failed to load active games:',error);
}finally{
setLoading(false);
}
};

const joinGame=(gameId:string)=>{
navigate(`/game/${gameId}`);
};

const getOpponentName=(game:any)=>{
if(!user)return'Unknown';
const isWhite=game.white_player_id===user.id;
return isWhite?game.black_player?.username:game.white_player?.username;
};

const getMyColor=(game:any)=>{
if(!user)return'';
return game.white_player_id===user.id?'White':'Black';
};

if(loading)return<div className="active-games-loading">Loading games...</div>;
if(activeGames.length===0)return null;

return(
<div className="active-games">
<h3>Active Games</h3>
<div className="games-grid">
{activeGames.map(game=>(
<div key={game.id}className="active-game-card"onClick={()=>joinGame(game.id)}>
<div className="game-status">
<span className={`status-indicator ${game.status}`}></span>
{game.status==='waiting'?'Waiting':'In Progress'}
</div>
<div className="game-opponent">
vs {getOpponentName(game)}
</div>
<div className="game-details">
<span className="my-color">Playing as {getMyColor(game)}</span>
<span className="time-control">{game.time_control}</span>
</div>
{game.current_turn===(game.white_player_id===user?.id?'white':'black')&&(
<div className="your-turn">Your Turn</div>
)}
</div>
))}
</div>
</div>
);
};

export default ActiveGames;