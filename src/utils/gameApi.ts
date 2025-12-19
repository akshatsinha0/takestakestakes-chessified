import{supabase}from'../lib/supabase';

export const createGame=async(challengeId:string,fromUserId:string,toUserId:string,timeControl:string)=>{
const whitePlayerId=Math.random()>0.5?fromUserId:toUserId;
const blackPlayerId=whitePlayerId===fromUserId?toUserId:fromUserId;
const timeInSeconds=parseInt(timeControl.split('+')[0])*60;
const{data,error}=await supabase.from('games').insert([{
created_by:fromUserId,
white_player_id:whitePlayerId,
black_player_id:blackPlayerId,
time_control:timeControl,
status:'in_progress',
board_state:'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
current_turn:'white',
white_time_remaining:timeInSeconds,
black_time_remaining:timeInSeconds
}]).select().single();
if(error)throw error;
await supabase.from('game_invitations').update({status:'accepted'}).eq('id',challengeId);
return data;
};

export const makeMove=async(gameId:string,move:string,newFen:string,timeRemaining:number)=>{
const{data:game,error:gameError}=await supabase.from('games').select('*').eq('id',gameId).single();
if(gameError)throw gameError;
const moveNumber=Math.floor((await supabase.from('moves').select('*').eq('game_id',gameId)).data?.length||0)+1;
const playerColor=game.current_turn;
const{error:moveError}=await supabase.from('moves').insert([{
game_id:gameId,
move_number:moveNumber,
player_color:playerColor,
san:move,
fen:newFen,
time_taken:0
}]);
if(moveError)throw moveError;
const nextTurn=playerColor==='white'?'black':'white';
const updateData:any={
board_state:newFen,
current_turn:nextTurn
};
if(playerColor==='white'){
updateData.white_time_remaining=timeRemaining;
}else{
updateData.black_time_remaining=timeRemaining;
}
const{error:updateError}=await supabase.from('games').update(updateData).eq('id',gameId);
if(updateError)throw updateError;
};

export const getGameHistory=async(userId:string)=>{
try {
const{data,error}=await supabase
.from('games')
.select('*')
.or(`white_player_id.eq.${userId},black_player_id.eq.${userId}`)
.eq('status','completed')
.order('finished_at',{ascending:false});
if(error) {
console.error('Error fetching game history:', error);
return [];
}
return data || [];
} catch (error) {
console.error('Exception in getGameHistory:', error);
return [];
}
};

export const getActiveGames=async(userId:string)=>{
try {
const{data,error}=await supabase
.from('games')
.select('*')
.or(`white_player_id.eq.${userId},black_player_id.eq.${userId}`)
.in('status',['waiting','in_progress'])
.order('created_at',{ascending:false});
if(error) {
console.error('Error fetching active games:', error);
return [];
}
return data || [];
} catch (error) {
console.error('Exception in getActiveGames:', error);
return [];
}
};