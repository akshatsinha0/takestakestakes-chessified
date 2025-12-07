# Matchmaking Setup Guide

## Database Setup

To enable the matchmaking functionality, you need to run the SQL migrations in your Supabase project.

### Steps:

1. **Go to your Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Find your existing query with the profiles and games tables
   - **OR** click "New Query" if you prefer

3. **Run the Migration**
   - Copy the contents of `supabase_migrations.sql`
   - Paste it **at the end** of your existing SQL (after your current schema)
   - Click "Run" to execute the migration
   - **Note**: The migration is designed to work with your existing `games` table by adding new columns

4. **Verify Tables Updated**
   - Go to "Table Editor" in the left sidebar
   - Click on the `games` table
   - You should see new columns:
     - `white_player_id`, `black_player_id`
     - `time_control`, `board_state`, `current_turn`
     - `white_time_remaining`, `black_time_remaining`, `increment`
     - `winner`, `updated_at`
   - You should also see a new table:
     - `game_history` - Stores historical game data

### Important Notes:

- The migration **modifies your existing `games` table** by adding new columns
- It **does not delete** any existing data
- It updates the RLS policies to work with both old and new column names
- The `status` constraint is updated to include 'waiting', 'in_progress', 'completed', 'abandoned'

## Features Implemented

### 1. Play Online / Find Match
- Users can select a time control (Bullet, Blitz, Rapid)
- Click "Find Match" to join the matchmaking queue
- System automatically matches players with similar preferences
- Real-time updates when a match is found

### 2. All Players List
- Fixed the loading issue in the Users dropdown
- Shows all registered players
- Displays username, rating, and online status
- Challenge button to invite specific players

### 3. Matchmaking System
- **Queue-based matching**: First player creates a waiting game, second player joins
- **Time controls**: Support for various time formats (1+0, 3+0, 5+0, 10+0, etc.)
- **Real-time updates**: Uses Supabase real-time subscriptions
- **Cancel search**: Players can cancel while waiting

## How It Works

### Matchmaking Flow:

1. **Player A clicks "Find Match"**
   - System checks for existing waiting games with same time control
   - If none found, creates a new game with status "waiting"
   - Player A sees "Waiting for opponent..." message

2. **Player B clicks "Find Match"**
   - System finds Player A's waiting game
   - Joins the game as black player
   - Game status changes to "in_progress"
   - Both players are redirected to the game page

3. **Real-time Sync**
   - Game state updates are synced via Supabase real-time
   - Both players see moves instantly
   - Timer updates in real-time

## API Endpoints

The matchmaking service provides these functions:

- `joinMatchmakingQueue(userId, timeControl, rating)` - Join queue or create game
- `leaveMatchmakingQueue(userId)` - Cancel search and remove from queue
- `getGame(gameId)` - Fetch game details
- `updateGameState(gameId, updates)` - Update game state
- `subscribeToGame(gameId, callback)` - Subscribe to real-time updates
- `getOnlinePlayers()` - Get list of all players

## Testing

1. **Test with two accounts:**
   - Open the app in two different browsers (or incognito mode)
   - Log in with different accounts
   - Both click "Play Online" → "Find Match"
   - Select the same time control
   - Verify they get matched

2. **Test All Players list:**
   - Click the "Users" dropdown in the header
   - Verify all registered users appear
   - Check that the loading state works correctly

## Troubleshooting

### "Loading..." stuck on All Players
- Check browser console for errors
- Verify Supabase connection is working
- Check that profiles table has RLS policies enabled

### Match not found
- Ensure both players select the same time control
- Check that games table exists in Supabase
- Verify RLS policies allow game creation and updates

### Real-time not working
- Check that Supabase real-time is enabled for your project
- Verify the subscription channel name matches
- Check browser console for WebSocket errors

## Next Steps

To further enhance the matchmaking system:

1. **Rating-based matching**: Match players with similar ratings
2. **ELO system**: Update ratings after each game
3. **Game history**: Track and display past games
4. **Rematch**: Allow players to request a rematch
5. **Spectator mode**: Let others watch ongoing games
6. **Chat**: Add in-game chat functionality
