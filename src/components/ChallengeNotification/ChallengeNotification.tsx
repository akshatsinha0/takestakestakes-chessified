import{useState,useEffect}from'react';
import{useSupabaseAuthContext}from'../../context/SupabaseAuthContext';
import{supabase}from'../../lib/supabase';
import{toast}from'react-toastify';
import'./ChallengeNotification.css';

const ChallengeNotification:React.FC=()=>{
const{user}=useSupabaseAuthContext();
const[challenges,setChallenges]=useState<any[]>([]);

useEffect(()=>{
if(!user)return;
loadPendingChallenges();
const subscription=supabase
.channel('challenges')
.on('postgres_changes',{event:'INSERT',schema:'public',table:'game_invitations',filter:`to_user_id=eq.${user.id}`},(payload)=>{
loadPendingChallenges();
})
.subscribe();
return()=>{
subscription.unsubscribe();
};
},[user]);

const loadPendingChallenges=async()=>{
if(!user)return;
try{
const{data,error}=await supabase
.from('game_invitations')
.select('*')
.eq('to_user_id',user.id)
.eq('status','pending')
.gt('expires_at',new Date().toISOString());
if(error) {
console.error('Error loading challenges:', error);
setChallenges([]);
return;
}
setChallenges(data||[]);
}catch(error){
console.error('Failed to load challenges:',error);
setChallenges([]);
}
};

const acceptChallenge=async(challengeId:string)=>{
try{
const{error:updateError}=await supabase
.from('game_invitations')
.update({status:'accepted'})
.eq('id',challengeId);
if(updateError)throw updateError;
const challenge=challenges.find(c=>c.id===challengeId);
if(challenge){
const{error:gameError}=await supabase.from('games').insert([{
created_by:challenge.from_user_id,
white_player_id:Math.random()>0.5?challenge.from_user_id:user?.id,
black_player_id:Math.random()>0.5?challenge.from_user_id:user?.id,
time_control:challenge.time_control,
status:'waiting',
board_state:'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
current_turn:'white',
white_time_remaining:parseInt(challenge.time_control.split('+')[0])*60,
black_time_remaining:parseInt(challenge.time_control.split('+')[0])*60
}]);
if(gameError)throw gameError;
}
toast.success('Challenge accepted! Game starting...');
loadPendingChallenges();
}catch(error){
console.error('Failed to accept challenge:',error);
toast.error('Failed to accept challenge');
}
};

const declineChallenge=async(challengeId:string)=>{
try{
const{error}=await supabase
.from('game_invitations')
.update({status:'declined'})
.eq('id',challengeId);
if(error)throw error;
toast.info('Challenge declined');
loadPendingChallenges();
}catch(error){
console.error('Failed to decline challenge:',error);
toast.error('Failed to decline challenge');
}
};

if(challenges.length===0)return null;

return(
<div className="challenge-notifications">
{challenges.map(challenge=>(
<div key={challenge.id}className="challenge-notification">
<div className="challenge-info">
<div className="challenger-name">{challenge.from_user?.username}</div>
<div className="challenge-details">
<span className="time-control">{challenge.time_control}</span>
<span className="rating">({challenge.from_user?.rating||1200})</span>
</div>
{challenge.message&&<div className="challenge-message">"{challenge.message}"</div>}
</div>
<div className="challenge-actions">
<button className="accept-btn"onClick={()=>acceptChallenge(challenge.id)}>Accept</button>
<button className="decline-btn"onClick={()=>declineChallenge(challenge.id)}>Decline</button>
</div>
</div>
))}
</div>
);
};

export default ChallengeNotification;