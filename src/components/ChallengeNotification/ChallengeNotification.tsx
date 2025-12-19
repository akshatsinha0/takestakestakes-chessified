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
const{data:invitations,error}=await supabase
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
// Fetch user profiles for each invitation
if(invitations && invitations.length > 0){
const userIds = invitations.map(inv => inv.from_user_id);
const{data:profiles}=await supabase
.from('profiles')
.select('id,username,rating')
.in('id',userIds);
// Merge profiles with invitations
const challengesWithProfiles = invitations.map(inv => ({
...inv,
from_user: profiles?.find(p => p.id === inv.from_user_id)
}));
setChallenges(challengesWithProfiles);
} else {
setChallenges([]);
}
}catch(error){
console.error('Failed to load challenges:',error);
setChallenges([]);
}
};

const acceptChallenge=async(challengeId:string)=>{
try{
const challenge=challenges.find(c=>c.id===challengeId);
if(!challenge||!user){
throw new Error('Challenge or user not found');
}
// Randomly assign colors
const isWhite=Math.random()>0.5;
const whitePlayerId=isWhite?user.id:challenge.from_user_id;
const blackPlayerId=isWhite?challenge.from_user_id:user.id;
// Parse time control (e.g., "10+0" -> 10 minutes)
const timeMinutes=parseInt(challenge.time_control.split('+')[0]);
const incrementSeconds=parseInt(challenge.time_control.split('+')[1]||'0');
// Create the game
const{data:gameData,error:gameError}=await supabase.from('games').insert([{
created_by:challenge.from_user_id,
opponent_id:user.id,
white_player_id:whitePlayerId,
black_player_id:blackPlayerId,
time_control:challenge.time_control,
status:'in_progress',
board_state:'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
current_turn:'white',
white_time_remaining:timeMinutes*60,
black_time_remaining:timeMinutes*60,
increment:incrementSeconds
}]).select();
if(gameError){
console.error('Game creation error:',gameError);
throw gameError;
}
// Update invitation status
const{error:updateError}=await supabase
.from('game_invitations')
.update({status:'accepted'})
.eq('id',challengeId);
if(updateError){
console.error('Invitation update error:',updateError);
throw updateError;
}
toast.success('Challenge accepted! Game starting...');
loadPendingChallenges();
// TODO: Navigate to game board
// window.location.href = `/game/${gameData[0].id}`;
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