import{useState}from'react';
import{useSupabaseAuthContext}from'../../context/SupabaseAuthContext';
import{supabase}from'../../lib/supabase';
import{toast}from'react-toastify';
import{useNavigate}from'react-router-dom';
import'./QuickMatch.css';

const QuickMatch:React.FC=()=>{
const{user}=useSupabaseAuthContext();
const navigate=useNavigate();
const[searching,setSearching]=useState(false);
const[selectedTime,setSelectedTime]=useState('5+0');

const timeControls=[
{id:'1+0',name:'Bullet',time:'1 min'},
{id:'3+0',name:'Blitz',time:'3 min'},
{id:'5+0',name:'Blitz',time:'5 min'},
{id:'10+0',name:'Rapid',time:'10 min'}
];

const findQuickMatch=async()=>{
if(!user)return;
setSearching(true);
try{
const{data:waitingGames,error:searchError}=await supabase
.from('games')
.select('*')
.eq('status','waiting')
.eq('time_control',selectedTime)
.neq('created_by',user.id)
.limit(1);
if(searchError)throw searchError;
if(waitingGames&&waitingGames.length>0){
const game=waitingGames[0];
const{error:joinError}=await supabase
.from('games')
.update({
status:'in_progress',
black_player_id:game.white_player_id===user.id?game.created_by:user.id,
white_player_id:game.white_player_id||user.id
})
.eq('id',game.id);
if(joinError)throw joinError;
toast.success('Match found! Starting game...');
navigate(`/game/${game.id}`);
}else{
const timeInSeconds=parseInt(selectedTime.split('+')[0])*60;
const{data:newGame,error:createError}=await supabase
.from('games')
.insert([{
created_by:user.id,
white_player_id:user.id,
time_control:selectedTime,
status:'waiting',
board_state:'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
current_turn:'white',
white_time_remaining:timeInSeconds,
black_time_remaining:timeInSeconds
}])
.select()
.single();
if(createError)throw createError;
toast.info('Waiting for opponent...');
navigate(`/game/${newGame.id}`);
}
}catch(error){
console.error('Quick match error:',error);
toast.error('Failed to find match');
}finally{
setSearching(false);
}
};

return(
<div className="quick-match">
<h3>Quick Match</h3>
<div className="time-selector">
{timeControls.map(tc=>(
<button key={tc.id}className={`time-btn ${selectedTime===tc.id?'selected':''}`}onClick={()=>setSelectedTime(tc.id)}>
<div className="time-name">{tc.name}</div>
<div className="time-duration">{tc.time}</div>
</button>
))}
</div>
<button className="find-match-btn"onClick={findQuickMatch}disabled={searching}>
{searching?'Searching...':'Find Match'}
</button>
</div>
);
};

export default QuickMatch;