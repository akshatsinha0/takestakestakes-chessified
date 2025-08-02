import{useState}from'react';
import{useSupabaseAuthContext}from'../../context/SupabaseAuthContext';
import{supabase}from'../../lib/supabase';
import{toast}from'react-toastify';
import'./ChallengeModal.css';

interface ChallengeModalProps{
targetUser:{id:string;username:string;rating:number};
onClose:()=>void;
}

const timeControls=[
{id:'1+0',name:'Bullet',time:'1 min',increment:'0 sec'},
{id:'3+0',name:'Blitz',time:'3 min',increment:'0 sec'},
{id:'5+0',name:'Blitz',time:'5 min',increment:'0 sec'},
{id:'10+0',name:'Rapid',time:'10 min',increment:'0 sec'},
{id:'15+10',name:'Rapid',time:'15 min',increment:'10 sec'},
{id:'30+0',name:'Classical',time:'30 min',increment:'0 sec'}
];

const ChallengeModal:React.FC<ChallengeModalProps>=({targetUser,onClose})=>{
const{user}=useSupabaseAuthContext();
const[selectedTimeControl,setSelectedTimeControl]=useState('5+0');
const[message,setMessage]=useState('');
const[sending,setSending]=useState(false);

const sendChallenge=async()=>{
if(!user)return;
setSending(true);
try{
const expiresAt=new Date();
expiresAt.setMinutes(expiresAt.getMinutes()+5);
const{error}=await supabase.from('game_invitations').insert([{
from_user_id:user.id,
to_user_id:targetUser.id,
time_control:selectedTimeControl,
message:message||`Challenge from ${user.email?.split('@')[0]}`,
status:'pending',
expires_at:expiresAt.toISOString()
}]);
if(error)throw error;
toast.success(`Challenge sent to ${targetUser.username}!`);
onClose();
}catch(error){
console.error('Challenge error:',error);
toast.error('Failed to send challenge');
}finally{
setSending(false);
}
};

return(
<div className="challenge-overlay"onClick={onClose}>
<div className="challenge-modal"onClick={e=>e.stopPropagation()}>
<div className="challenge-header">
<h3>Challenge {targetUser.username}</h3>
<button className="close-btn"onClick={onClose}>×</button>
</div>
<div className="challenge-content">
<div className="time-controls">
<h4>Select Time Control</h4>
<div className="time-grid">
{timeControls.map(tc=>(
<div key={tc.id}className={`time-control-card ${selectedTimeControl===tc.id?'selected':''}`}onClick={()=>setSelectedTimeControl(tc.id)}>
<div className="time-control-name">{tc.name}</div>
<div className="time-control-time">{tc.time}</div>
<div className="time-control-increment">+{tc.increment}</div>
</div>
))}
</div>
</div>
<div className="challenge-message">
<h4>Message (Optional)</h4>
<textarea value={message}onChange={e=>setMessage(e.target.value)}placeholder="Good luck!"maxLength={100}/>
</div>
<div className="challenge-actions">
<button className="cancel-btn"onClick={onClose}>Cancel</button>
<button className="send-btn"onClick={sendChallenge}disabled={sending}>
{sending?'Sending...':'Send Challenge'}
</button>
</div>
</div>
</div>
</div>
);
};

export default ChallengeModal;