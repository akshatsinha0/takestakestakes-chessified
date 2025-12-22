import { useSupabaseAuthContext } from '../../context/SupabaseAuthContext';
import React, { useState, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import './ChessboardSection.css';
import ChessboardControls from './ChessboardControls';
import useChessSounds from '../../hooks/useChessSounds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faRocket, faTimes, faPlus, faChessBoard, 
  faUsers, faCog, faChevronLeft, faChevronRight, 
  faStepBackward, faStepForward, faUndo, faRedo,
  faThumbsUp, faThumbsDown, faTrophy, faInfoCircle,
  faPlus as faAdd, faHistory
} from '@fortawesome/free-solid-svg-icons';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';

interface ChessMove {
  san: string;
  time: number;
  piece: string;
  from: string;
  to: string;
  captured?: string;
  color: 'w' | 'b';
}

interface ChessboardSectionProps {
  playYourselfMode?: boolean;
  onExitPlayYourself?: () => void;
  gameId?: string;
  playBotMode?: boolean;
  selectedBot?: any;
  botTimeControl?: any;
  onExitBotMode?: () => void;
}

const ChessboardSection: React.FC<ChessboardSectionProps> = ({ 
  playYourselfMode = false, 
  onExitPlayYourself, 
  gameId,
  playBotMode = false,
  selectedBot,
  botTimeControl,
  onExitBotMode
}) => {
  const { user, profile } = useSupabaseAuthContext();
  const [game, setGame] = useState(new Chess());
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isBoardFlipped, setIsBoardFlipped] = useState(false);
  const { playMove, playCapture, playCastle, playCheck } = useChessSounds();
  
  // Multiplayer game state
  const [activeGame, setActiveGame] = useState<any>(null);
  const [opponentProfile, setOpponentProfile] = useState<any>(null);
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const activeGameIdRef = useRef<string | null>(null); // Track active game ID for subscriptions
  
  // Timer state
  const [whiteTime, setWhiteTime] = useState<number>(600); // 10 minutes in seconds
  const [blackTime, setBlackTime] = useState<number>(600);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTimerUpdateRef = useRef<number>(Date.now()); // Track last DB update
  
  // Draw offer state
  const [drawOffered, setDrawOffered] = useState(false);
  const [drawOfferFrom, setDrawOfferFrom] = useState<string | null>(null);
  
  // Timeout modal state
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [timeoutWinner, setTimeoutWinner] = useState<'white' | 'black' | null>(null);
  
  // Resignation modal state
  const [showResignModal, setShowResignModal] = useState(false);
  const [showResignResultModal, setShowResignResultModal] = useState(false);
  const [resignWinner, setResignWinner] = useState<'white' | 'black' | null>(null);

  const [moves, setMoves] = useState<ChessMove[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [gameStatus, setGameStatus] = useState<string>('');
  const [opening, setOpening] = useState<string>("Opening");
  const [gameResult, setGameResult] = useState<{
    winner: string | null;
    method: string;
    time: string;
  }>({
    winner: null,
    method: '',
    time: ''
  });

  const moveStartTime = useRef(performance.now());
  const movesContainerRef = useRef<HTMLDivElement>(null);

  const [showEvaluation, setShowEvaluation] = useState(true);
  const [showLines, setShowLines] = useState(true);
  const [showExplorer, setShowExplorer] = useState(false);
  const makeAMove = (move: any) => {
    const gameCopy = new Chess(game.fen());
    
    try {
      const currentTime = performance.now();
      const timeTaken = (currentTime - moveStartTime.current) / 1000;
      moveStartTime.current = currentTime;
      
      const result = gameCopy.move(move);
      
      if (result.captured) {
        playCapture();
      } else if (result.san.includes('O-O')) {
        playCastle();
      } else {
        playMove();
      }

      if (gameCopy.isCheck()) {
        playCheck();
      }

      const newMove: ChessMove = {
        san: result.san,
        time: Math.round(timeTaken * 10) / 10,
        piece: result.piece,
        from: result.from,
        to: result.to,
        captured: result.captured,
        color: result.color
      };
      
      setMoves(prevMoves => [...prevMoves, newMove]);
      setCurrentMoveIndex(prevMoves => prevMoves + 1);

      if (gameCopy.isGameOver()) {
        let winner = null;
        let method = '';
        
        if (gameCopy.isCheckmate()) {
          winner = result.color === 'w' ? 'white' : 'black';
          method = 'checkmate';
        } else if (gameCopy.isDraw()) {
          method = 'draw';
        } else if (gameCopy.isStalemate()) {
          method = 'stalemate';
        } else if (gameCopy.isThreefoldRepetition()) {
          method = 'repetition';
        } else if (gameCopy.isInsufficientMaterial()) {
          method = 'insufficient material';
        }
        
        setGameResult({
          winner: winner,
          method: method,
          time: '1 min Rated'
        });
        
        setGameStatus('GAME OVER');
      }

      setGame(gameCopy);
      return result;
    } catch (error) {
      return null;
    }
  };

  const onDrop = (sourceSquare: string, targetSquare: string) => {
    console.log('=== onDrop CALLED ===', { 
      sourceSquare, 
      targetSquare, 
      activeGame: !!activeGame, 
      playYourselfMode,
      playerColor,
      currentTurn: game.turn()
    });

    try {
      // Check if it's multiplayer mode and if it's player's turn
      if (activeGame && !playYourselfMode) {
        const currentTurn = game.turn(); // 'w' or 'b'
        const isPlayerTurn = (currentTurn === 'w' && playerColor === 'white') || 
                             (currentTurn === 'b' && playerColor === 'black');
        
        console.log('Turn check:', { currentTurn, playerColor, isPlayerTurn, activeGame: activeGame.id });
        
        if (!isPlayerTurn) {
          console.log('Not your turn!');
          return false; // Not player's turn
        }
      }

      // Create a temporary game copy to get the new FEN immediately
      const tempGame = new Chess(game.fen());
      const move = tempGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      });

      if (move === null) {
        console.log('Invalid move!');
        return false;
      }

      // Get the new FEN and turn BEFORE state updates
      const newFen = tempGame.fen();
      const newTurn = tempGame.turn();

      console.log('Move result:', move, 'New FEN:', newFen);

      // Now apply the move to the actual game state
      makeAMove({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      });

      // Save move to database for multiplayer games (async, don't wait)
      if (activeGame && !playYourselfMode) {
        (async () => {
          try {
            console.log('Saving move to database...', { gameId: activeGame.id, newFen });
            
            // Update game board state and times
            const { error: updateError } = await supabase
              .from('games')
              .update({
                board_state: newFen,
                current_turn: newTurn === 'w' ? 'white' : 'black',
                white_time_remaining: whiteTime,
                black_time_remaining: blackTime,
                updated_at: new Date().toISOString()
              })
              .eq('id', activeGame.id);

            if (updateError) {
              console.error('Game update error:', updateError);
              return;
            }

            // Save move - using minimal fields to avoid schema issues
            const { error: moveInsertError } = await supabase
              .from('moves')
              .insert({
                game_id: activeGame.id,
                move_number: moves.length + 1,
                san: move.san
              });
            
            if (moveInsertError) {
              console.error('Move insert error:', moveInsertError);
            } else {
              console.log('Move saved successfully! FEN:', newFen);
            }
          } catch (error) {
            console.error('Failed to save move:', error);
          }
        })();
      }

      console.log('onDrop returning true');
      
      // Trigger bot move after player move in bot mode
      if (playBotMode && !playYourselfMode && !activeGame) {
        setTimeout(() => makeBotMove(), 500);
      }
      
      return true;
    } catch (error) {
      console.error('Error in onDrop:', error);
      return false;
    }
  };
  
  // Bot move logic
  const makeBotMove = () => {
    if (!playBotMode || game.isGameOver()) return;
    
    const moves = game.moves({ verbose: true });
    if (moves.length === 0) return;
    
    // Bot difficulty based on rating
    const botRating = selectedBot?.rating || 1200;
    let selectedMove;
    
    if (botRating < 1000) {
      // Beginner: Random moves
      selectedMove = moves[Math.floor(Math.random() * moves.length)];
    } else if (botRating < 1300) {
      // Easy: Prefer captures
      const captures = moves.filter(m => m.captured);
      selectedMove = captures.length > 0 && Math.random() > 0.3
        ? captures[Math.floor(Math.random() * captures.length)]
        : moves[Math.floor(Math.random() * moves.length)];
    } else if (botRating < 1600) {
      // Intermediate: Prefer captures and checks
      const goodMoves = moves.filter(m => m.captured || m.san.includes('+'));
      selectedMove = goodMoves.length > 0 && Math.random() > 0.2
        ? goodMoves[Math.floor(Math.random() * goodMoves.length)]
        : moves[Math.floor(Math.random() * moves.length)];
    } else {
      // Advanced/Master: Best moves (simplified - prefer center control, captures, checks)
      const centerSquares = ['e4', 'e5', 'd4', 'd5', 'c4', 'c5', 'f4', 'f5'];
      const excellentMoves = moves.filter(m => 
        m.captured || 
        m.san.includes('+') || 
        centerSquares.includes(m.to)
      );
      selectedMove = excellentMoves.length > 0 && Math.random() > 0.1
        ? excellentMoves[Math.floor(Math.random() * excellentMoves.length)]
        : moves[Math.floor(Math.random() * moves.length)];
    }
    
    if (selectedMove) {
      makeAMove({
        from: selectedMove.from,
        to: selectedMove.to,
        promotion: 'q'
      });
    }
  };

  // Handle resign - show confirmation modal
  const handleResign = () => {
    if (!activeGame || !user) return;
    setShowResignModal(true);
  };
  
  // Confirm resignation
  const confirmResign = async () => {
    if (!activeGame || !user) return;
    
    setShowResignModal(false);
    
    try {
      const winner = playerColor === 'white' ? activeGame.black_player_id : activeGame.white_player_id;
      const winnerColor = playerColor === 'white' ? 'black' : 'white';
      
      const { error } = await supabase
        .from('games')
        .update({
          status: 'completed',
          result: 'resignation',
          winner: winner,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeGame.id);
      
      if (error) {
        console.error('Resign error:', error);
        toast.error('Failed to resign');
        return;
      }
      
      // Show result modal
      setResignWinner(winnerColor as 'white' | 'black');
      setShowResignResultModal(true);
      
      setGameStatus('GAME OVER');
      setGameResult({
        winner: winnerColor,
        method: 'resignation',
        time: activeGame.time_control
      });
      
      toast.info('You resigned. Game over.');
    } catch (error) {
      console.error('Failed to resign:', error);
      toast.error('Failed to resign');
    }
  };

  // Handle draw offer
  const handleOfferDraw = async () => {
    if (!activeGame || !user) return;
    
    try {
      // Send draw offer by updating game metadata
      const { error } = await supabase
        .from('games')
        .update({
          draw_offered_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeGame.id);
      
      if (error) {
        console.error('Draw offer error:', error);
        toast.error('Failed to offer draw');
        return;
      }
      
      setDrawOffered(true);
      setDrawOfferFrom(user.id);
      toast.info('Draw offer sent to opponent');
    } catch (error) {
      console.error('Failed to offer draw:', error);
      toast.error('Failed to offer draw');
    }
  };
  
  // Handle draw response
  const handleDrawResponse = async (accept: boolean) => {
    if (!activeGame || !user) return;
    
    try {
      if (accept) {
        // Accept draw - end game
        const { error } = await supabase
          .from('games')
          .update({
            status: 'completed',
            result: 'draw',
            draw_offered_by: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', activeGame.id);
        
        if (error) {
          console.error('Accept draw error:', error);
          toast.error('Failed to accept draw');
          return;
        }
        
        toast.success('Draw accepted. Game over.');
        
        setGameStatus('GAME OVER');
        setGameResult({
          winner: null,
          method: 'draw by agreement',
          time: activeGame.time_control
        });
      } else {
        // Decline draw
        const { error } = await supabase
          .from('games')
          .update({
            draw_offered_by: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', activeGame.id);
        
        if (error) {
          console.error('Decline draw error:', error);
          return;
        }
        
        toast.info('Draw offer declined');
      }
      
      setDrawOffered(false);
      setDrawOfferFrom(null);
    } catch (error) {
      console.error('Failed to respond to draw:', error);
    }
  };

  // Handle abort game
  const handleAbortGame = async () => {
    if (!activeGame || !user) return;
    
    if (!confirm('Are you sure you want to abort this game?')) return;
    
    try {
      await supabase
        .from('games')
        .update({
          status: 'abandoned',
          result: 'abandoned',
          updated_at: new Date().toISOString()
        })
        .eq('id', activeGame.id);
      
      // Reset board state
      setActiveGame(null);
      activeGameIdRef.current = null;
      setOpponentProfile(null);
      setGame(new Chess());
      setMoves([]);
      setGameStatus('');
      setWhiteTime(600);
      setBlackTime(600);
      setIsTheaterMode(false);
      
      toast.info('Game aborted');
    } catch (error) {
      console.error('Failed to abort game:', error);
      toast.error('Failed to abort game');
    }
  };
  
  useEffect(() => {
    if (movesContainerRef.current && moves.length > 0) {
      movesContainerRef.current.scrollTop = movesContainerRef.current.scrollHeight;
    }
  }, [moves.length]);

  // Force theater mode if playYourselfMode or playBotMode is true
  useEffect(() => {
    if (playYourselfMode || playBotMode) setIsTheaterMode(true);
  }, [playYourselfMode, playBotMode]);
  
  // Initialize bot game timer
  useEffect(() => {
    if (playBotMode && botTimeControl) {
      const minutes = botTimeControl.minutes || 10;
      if (minutes > 0) {
        const timeInSeconds = minutes * 60;
        setWhiteTime(timeInSeconds);
        setBlackTime(timeInSeconds);
      } else {
        // Unlimited time
        setWhiteTime(9999);
        setBlackTime(9999);
      }
      // Reset game
      setGame(new Chess());
      setMoves([]);
      setGameStatus('');
    }
  }, [playBotMode, botTimeControl]);

  // Timer logic for multiplayer games
  useEffect(() => {
    if (!activeGame || playYourselfMode || gameStatus) {
      // Clear timer if no active game
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    // Start timer
    timerIntervalRef.current = setInterval(async () => {
      const currentTurn = game.turn();
      const now = Date.now();
      
      if (currentTurn === 'w') {
        setWhiteTime(prev => {
          const newTime = prev <= 0 ? 0 : prev - 1;
          
          if (newTime <= 0) {
            handleTimeOut('white');
          }
          
          // Persist to database every 5 seconds
          if (now - lastTimerUpdateRef.current >= 5000) {
            lastTimerUpdateRef.current = now;
            supabase
              .from('games')
              .update({
                white_time_remaining: newTime,
                black_time_remaining: blackTime,
                updated_at: new Date().toISOString()
              })
              .eq('id', activeGame.id)
              .then(({ error }) => {
                if (error) console.error('Timer update error:', error);
              });
          }
          
          return newTime;
        });
      } else {
        setBlackTime(prev => {
          const newTime = prev <= 0 ? 0 : prev - 1;
          
          if (newTime <= 0) {
            handleTimeOut('black');
          }
          
          // Persist to database every 5 seconds
          if (now - lastTimerUpdateRef.current >= 5000) {
            lastTimerUpdateRef.current = now;
            supabase
              .from('games')
              .update({
                white_time_remaining: whiteTime,
                black_time_remaining: newTime,
                updated_at: new Date().toISOString()
              })
              .eq('id', activeGame.id)
              .then(({ error }) => {
                if (error) console.error('Timer update error:', error);
              });
          }
          
          return newTime;
        });
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [activeGame, playYourselfMode, gameStatus, game, whiteTime, blackTime]);

  const handleTimeOut = async (color: 'white' | 'black') => {
    if (!activeGame) return;
    
    const winner = color === 'white' ? activeGame.black_player_id : activeGame.white_player_id;
    const winnerColor = color === 'white' ? 'black' : 'white';
    
    try {
      await supabase
        .from('games')
        .update({
          status: 'completed',
          result: 'timeout',
          winner: winner,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeGame.id);
      
      // Show timeout modal
      setTimeoutWinner(winnerColor as 'white' | 'black');
      setShowTimeoutModal(true);
      
      setGameStatus('GAME OVER');
      setGameResult({
        winner: winnerColor,
        method: 'timeout',
        time: activeGame.time_control
      });
      
      toast.error(`${color === 'white' ? 'White' : 'Black'} ran out of time!`);
    } catch (error) {
      console.error('Failed to handle timeout:', error);
    }
  };

  // Load active game and set up real-time sync
  useEffect(() => {
    if (!user || playYourselfMode) return;

    const loadActiveGame = async () => {
      try {
        // Find active game for this user
        const { data: games, error } = await supabase
          .from('games')
          .select('*')
          .eq('status', 'in_progress')
          .or(`white_player_id.eq.${user.id},black_player_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error loading game:', error);
          return;
        }

        if (games && games.length > 0) {
          const gameData = games[0];
          setActiveGame(gameData);
          activeGameIdRef.current = gameData.id; // Update ref
          
          // Set player color
          const color = gameData.white_player_id === user.id ? 'white' : 'black';
          setPlayerColor(color);
          // White should see board from white's perspective (not flipped)
          // Black should see board from black's perspective (flipped)
          setIsBoardFlipped(color === 'black');
          
          console.log('Game loaded:', { 
            gameId: gameData.id, 
            playerColor: color, 
            whitePlayer: gameData.white_player_id,
            blackPlayer: gameData.black_player_id,
            currentUser: user.id,
            boardFlipped: color === 'black',
            boardState: gameData.board_state
          });
          
          // Load opponent profile
          const opponentId = color === 'white' ? gameData.black_player_id : gameData.white_player_id;
          const { data: opponentData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', opponentId)
            .single();
          
          if (opponentData) {
            setOpponentProfile(opponentData);
          }
          
          // Load board state
          if (gameData.board_state) {
            const newGame = new Chess(gameData.board_state);
            setGame(newGame);
          }
          
          // Set timer values from database or parse from time_control
          let initialTime = 600; // default 10 minutes
          if (gameData.time_control) {
            // Parse time control like "10+0", "5+3", etc.
            const timeMinutes = parseInt(gameData.time_control.split('+')[0]);
            initialTime = timeMinutes * 60;
          }
          
          setWhiteTime(gameData.white_time_remaining || initialTime);
          setBlackTime(gameData.black_time_remaining || initialTime);
          
          console.log('Timer initialized:', {
            timeControl: gameData.time_control,
            whiteTime: gameData.white_time_remaining || initialTime,
            blackTime: gameData.black_time_remaining || initialTime
          });
          
          setIsTheaterMode(true);
        }
      } catch (error) {
        console.error('Failed to load game:', error);
      }
    };

    loadActiveGame();

    // Subscribe to game updates and new games
    const channel = supabase
      .channel('game-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'games'
      }, (payload) => {
        const newGame = payload.new as any;
        // Check if this game involves the current user
        if (newGame.white_player_id === user.id || newGame.black_player_id === user.id) {
          loadActiveGame(); // Reload to get the new game
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'games'
      }, (payload) => {
        const updatedGame = payload.new as any;
        console.log('=== GAME UPDATE RECEIVED ===', { 
          updatedGameId: updatedGame.id, 
          activeGameId: activeGameIdRef.current,
          boardState: updatedGame.board_state,
          currentTurn: updatedGame.current_turn
        });
        
        // Only update if it's the active game (use ref for current value)
        if (activeGameIdRef.current && updatedGame.id === activeGameIdRef.current) {
          console.log('Updating active game with new board state');
          setActiveGame(updatedGame);
          
          // Check if game was abandoned/aborted by opponent
          if (updatedGame.status === 'abandoned' || updatedGame.status === 'completed') {
            if (updatedGame.status === 'abandoned') {
              toast.info('Your opponent has aborted the game');
            } else if (updatedGame.result === 'resignation') {
              // Show resignation result modal
              const didIWin = updatedGame.winner === user.id;
              const winnerColor = didIWin ? playerColor : (playerColor === 'white' ? 'black' : 'white');
              
              setResignWinner(winnerColor as 'white' | 'black');
              setShowResignResultModal(true);
              
              setGameStatus('GAME OVER');
              setGameResult({
                winner: winnerColor,
                method: 'resignation',
                time: updatedGame.time_control
              });
              
              if (didIWin) {
                toast.success('Your opponent resigned. You win!');
              }
            } else if (updatedGame.result === 'timeout') {
              // Show timeout modal for opponent
              const loserColor = updatedGame.winner === user.id ? 
                (playerColor === 'white' ? 'black' : 'white') : 
                playerColor;
              const winnerColor = loserColor === 'white' ? 'black' : 'white';
              
              setTimeoutWinner(winnerColor as 'white' | 'black');
              setShowTimeoutModal(true);
              
              toast.info('Game ended by timeout');
            }
            
            // Reset board after a short delay
            setTimeout(() => {
              setActiveGame(null);
              activeGameIdRef.current = null;
              setOpponentProfile(null);
              setGame(new Chess());
              setMoves([]);
              setGameStatus('');
              setWhiteTime(600);
              setBlackTime(600);
              setIsTheaterMode(false);
            }, 3000);
            
            return;
          }
          
          // Update board state - THIS IS CRITICAL FOR REAL-TIME SYNC
          if (updatedGame.board_state) {
            console.log('Setting new board state:', updatedGame.board_state);
            const newGame = new Chess(updatedGame.board_state);
            setGame(newGame);
          }
          
          // Check for draw offer
          if (updatedGame.draw_offered_by && updatedGame.draw_offered_by !== user.id) {
            setDrawOffered(true);
            setDrawOfferFrom(updatedGame.draw_offered_by);
            toast.info('Your opponent offered a draw', { autoClose: false });
          } else if (!updatedGame.draw_offered_by) {
            setDrawOffered(false);
            setDrawOfferFrom(null);
          }
          
          // Update timer values from opponent's move
          if (updatedGame.white_time_remaining !== undefined) {
            setWhiteTime(updatedGame.white_time_remaining);
          }
          if (updatedGame.black_time_remaining !== undefined) {
            setBlackTime(updatedGame.black_time_remaining);
          }
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, playYourselfMode, gameId]); // Removed activeGame from dependencies to prevent infinite loop

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Handler for submitting the game in Play Yourself mode
  const handleSubmitPlayYourselfGame = async () => {
    if (!user) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      let result = 'draw';
      if (game.isCheckmate()) {
        result = game.turn() === 'w' ? 'black_wins' : 'white_wins';
      } else if (game.isDraw() || game.isStalemate() || game.isThreefoldRepetition() || game.isInsufficientMaterial()) {
        result = 'draw';
      }
      
      // Create game with proper fields
      const gameToInsert: any = {
        created_by: user.id,
        white_player_id: user.id,
        opponent_id: user.id, // For play yourself mode, opponent is same user
        status: 'completed',
        result,
        time_control: 'Unlimited',
        board_state: game.fen(),
        current_turn: game.turn() === 'w' ? 'white' : 'black',
        white_time_remaining: 0,
        black_time_remaining: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        finished_at: new Date().toISOString()
      };
      
      // Only add black_player_id if it exists in schema
      // For play yourself mode, we can use the same user id or leave it null
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .insert([gameToInsert])
        .select()
        .single();
      
      if (gameError) {
        console.error('Game insert error:', gameError);
        setSubmitError(gameError.message || 'Failed to save game');
        setIsSubmitting(false);
        return;
      }
      
      // Save all moves
      if (moves.length > 0) {
        const movesToInsert = moves.map((move, i) => ({
          game_id: gameData.id,
          move_number: i + 1,
          player_color: move.color === 'w' ? 'white' : 'black',
          san: move.san,
          time_taken: move.time,
          created_at: new Date().toISOString()
        }));
        
        const { error: moveError } = await supabase.from('moves').insert(movesToInsert);
        if (moveError) {
          console.error('Move insert error:', moveError);
          setSubmitError(moveError.message || 'Failed to save moves');
          setIsSubmitting(false);
          return;
        }
      }
      
      // Success - reset board and exit
      setGame(new Chess());
      setMoves([]);
      setCurrentMoveIndex(-1);
      setGameStatus('');
      if (onExitPlayYourself) onExitPlayYourself();
      
    } catch (err: any) {
      console.error('Submit error:', err);
      setSubmitError(err?.message || 'Failed to save game. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleTheaterMode = () => setIsTheaterMode(!isTheaterMode);
  const handleToggleFocusMode = () => setIsFocusMode(!isFocusMode);
  const handleFlipBoard = () => setIsBoardFlipped(!isBoardFlipped);
  const handleOpenSettings = () => {
    console.log('Settings opened');
  };
  
  const renderMoveHistory = () => {
    const moveRows = [];
    for (let i = 0; i < moves.length; i += 2) {
      const whiteMove = moves[i];
      const blackMove = i + 1 < moves.length ? moves[i + 1] : null;
      const moveNumber = Math.floor(i / 2) + 1;
      
      moveRows.push(
        <div key={moveNumber} className="move-row">
          <div className="move-number">{moveNumber}.</div>
          <div className="move white">
            <div className="piece-symbol">{getPieceSymbol(whiteMove.piece, 'w')}</div>
            <div className="move-san">{whiteMove.san}</div>
            <div className="move-time">{whiteMove.time.toFixed(1)}s</div>
          </div>
          {blackMove && (
            <div className="move black">
              <div className="piece-symbol">{getPieceSymbol(blackMove.piece, 'b')}</div>
              <div className="move-san">{blackMove.san}</div>
              <div className="move-time">{blackMove.time.toFixed(1)}s</div>
            </div>
          )}
        </div>
      );
    }
    
    return moveRows;
  };
  
  const getPieceSymbol = (piece: string, color: 'w' | 'b') => {
    const pieceMap: Record<string, string> = {
      'p': color === 'w' ? '♙' : '♟',
      'n': color === 'w' ? '♘' : '♞',
      'b': color === 'w' ? '♗' : '♝',
      'r': color === 'w' ? '♖' : '♜',
      'q': color === 'w' ? '♕' : '♛',
      'k': color === 'w' ? '♔' : '♚'
    };
    
    return pieceMap[piece] || '';
  };
  
  return (
    <div className={`chessboard-section ${isTheaterMode ? 'theater-mode-active' : ''} ${isFocusMode ? 'focus-mode-active' : ''}`}>
      <div className="theater-mode">
        <div className="board-and-players-container">
          <div className="board-sidebar-wrapper">
            <div className="chessboard-container">
              <ChessboardControls 
                isTheaterMode={isTheaterMode}
                isFocusMode={isFocusMode}
                isBoardFlipped={isBoardFlipped}
                onToggleTheaterMode={handleToggleTheaterMode}
                onToggleFocusMode={handleToggleFocusMode}
                onFlipBoard={handleFlipBoard}
                onOpenSettings={handleOpenSettings}
              />
              <Chessboard 
                id="PlayChess"
                position={game.fen()}
                onPieceDrop={onDrop}
                onPieceDragBegin={(piece, sourceSquare) => {
                  console.log('=== DRAG BEGIN ===', { piece, sourceSquare });
                }}
                onPieceDragEnd={(piece, sourceSquare) => {
                  console.log('=== DRAG END ===', { piece, sourceSquare });
                }}
                boardOrientation={isBoardFlipped ? 'black' : 'white'}
                isDraggablePiece={({ piece }) => {
                  // In play yourself mode, allow all pieces
                  if (playYourselfMode) return true;
                  
                  // In multiplayer, only allow dragging your own pieces on your turn
                  if (!activeGame) return true; // Allow moves if no active game yet
                  
                  const currentTurn = game.turn();
                  const isMyTurn = (currentTurn === 'w' && playerColor === 'white') || 
                                   (currentTurn === 'b' && playerColor === 'black');
                  
                  console.log('isDraggablePiece check:', { 
                    piece, 
                    currentTurn, 
                    playerColor, 
                    isMyTurn,
                    pieceColor: piece[0]
                  });
                  
                  if (!isMyTurn) {
                    console.log('Not your turn, piece not draggable');
                    return false;
                  }
                  
                  // Check if piece belongs to current player
                  const pieceColor = piece[0]; // 'w' or 'b'
                  const isDraggable = pieceColor === currentTurn;
                  
                  console.log('Piece draggable?', isDraggable, { pieceColor, currentTurn });
                  
                  return isDraggable;
                }}
                customBoardStyle={{
                  borderRadius: '8px',
                  boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)'
                }}
                customDarkSquareStyle={{ backgroundColor: '#7b8a9b' }}
                customLightSquareStyle={{ backgroundColor: '#e2e8f0' }}
              />
            </div>
            
            <div className="players-sidebar">
              <div className="player-info opponent">
                <div className="player-avatar">
                  <img src="/path/to/default-avatar.png" alt="Opponent" />
                </div>
                <div className="player-details">
                  <div className="player-name">
                    {playYourselfMode 
                      ? profile?.username || 'You' 
                      : playBotMode
                      ? selectedBot?.name || 'Bot'
                      : opponentProfile?.username || 'Opponent'}
                  </div>
                  <div className="player-rating">
                    {playYourselfMode 
                      ? profile?.rating || 1200 
                      : playBotMode
                      ? selectedBot?.rating || 1200
                      : opponentProfile?.rating || 1200}
                  </div>
                </div>
              </div>
              
              <div className="timer-container">
                <div className="opponent-timer">
                  {playerColor === 'white' 
                    ? `${Math.floor(blackTime / 60)}:${(blackTime % 60).toString().padStart(2, '0')}`
                    : `${Math.floor(whiteTime / 60)}:${(whiteTime % 60).toString().padStart(2, '0')}`}
                </div>
                <div className="vs-indicator">vs</div>
                <div className="player-timer">
                  {playerColor === 'white' 
                    ? `${Math.floor(whiteTime / 60)}:${(whiteTime % 60).toString().padStart(2, '0')}`
                    : `${Math.floor(blackTime / 60)}:${(blackTime % 60).toString().padStart(2, '0')}`}
                </div>
              </div>
              
              <div className="player-info user">
                <div className="player-avatar">
                  <img src="/path/to/user-avatar.png" alt="You" />
                </div>
                <div className="player-details">
                  <div className="player-name">{profile?.username || 'Guest'}</div>
                  <div className="player-rating">{profile?.rating || 1200}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="game-analysis-container">
            <div className="analysis-panel">
              <div className="analysis-header">
                <div className="analysis-tabs">
                  <div className="tab active">
                    <FontAwesomeIcon icon={faRocket} />
                    <span>Analysis</span>
                  </div>
                  <div className="tab">
                    <FontAwesomeIcon icon={faPlus} />
                    <span>New Game</span>
                  </div>
                  <div className="tab">
                    <FontAwesomeIcon icon={faChessBoard} />
                    <span>Games</span>
                  </div>
                  <div className="tab">
                    <FontAwesomeIcon icon={faUsers} />
                    <span>Players</span>
                  </div>
                </div>
                
                <div className="analysis-options">
                  <div className="option">
                    <span>Evaluation</span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={showEvaluation}
                        onChange={() => setShowEvaluation(!showEvaluation)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  
                  <div className="option">
                    <span>Lines</span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={showLines}
                        onChange={() => setShowLines(!showLines)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  
                  <div className="option">
                    <span>Explorer</span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={showExplorer}
                        onChange={() => setShowExplorer(!showExplorer)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  
                  <div className="settings-icon">
                    <FontAwesomeIcon icon={faCog} />
                  </div>
                </div>
              </div>
              
              <div className="upgrade-banner">
                <span className="diamond-icon">♦</span>
                <span className="upgrade-text">Upgrade to get computer engine moves</span>
              </div>
              
              <div className="opening-info">
                <span className="opening-name">{opening}</span>
                <span className="info-icon"><FontAwesomeIcon icon={faInfoCircle} /></span>
              </div>
              
              <div className="moves-container" ref={movesContainerRef}>
                {renderMoveHistory()}
              </div>
              
              <div className="game-review-button">
                <button className="review-btn">
                  <FontAwesomeIcon icon={faTrophy} />
                  <span>Game Review</span>
                </button>
              </div>
              
              {/* Draw and Resign buttons for multiplayer games */}
              {activeGame && !playYourselfMode && !gameStatus && (
                <>
                  {/* Draw offer notification */}
                  {drawOffered && drawOfferFrom && drawOfferFrom !== user?.id && (
                    <div style={{
                      background: 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)',
                      border: '2px solid #e5a356',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginTop: '1rem',
                      textAlign: 'center',
                      boxShadow: '0 4px 20px rgba(229, 163, 86, 0.3)'
                    }}>
                      <div style={{ color: '#f5f5f5', marginBottom: '0.75rem', fontSize: '1rem', fontWeight: '600' }}>
                        Your opponent offered a draw
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button 
                          className="review-btn" 
                          onClick={() => handleDrawResponse(true)}
                          style={{ background: '#48bb78', flex: '1' }}
                        >
                          Accept
                        </button>
                        <button 
                          className="review-btn" 
                          onClick={() => handleDrawResponse(false)}
                          style={{ background: '#e53e3e', flex: '1' }}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="game-actions" style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button 
                      className="review-btn" 
                      onClick={handleOfferDraw}
                      disabled={drawOffered && drawOfferFrom === user?.id}
                      style={{ 
                        background: drawOffered && drawOfferFrom === user?.id ? '#2d3748' : '#4a5568', 
                        flex: '1 1 45%',
                        opacity: drawOffered && drawOfferFrom === user?.id ? 0.6 : 1,
                        cursor: drawOffered && drawOfferFrom === user?.id ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {drawOffered && drawOfferFrom === user?.id ? 'Draw Offered' : 'Offer Draw'}
                    </button>
                    <button 
                      className="review-btn" 
                      onClick={handleResign}
                      style={{ background: '#e53e3e', flex: '1 1 45%' }}
                    >
                      Resign
                    </button>
                    <button 
                      className="review-btn" 
                      onClick={handleAbortGame}
                      style={{ background: '#f59e0b', flex: '1 1 100%' }}
                    >
                      Abort Game
                    </button>
                  </div>
                </>
              )}
              
              <div className="move-controls">
                <div className="move-buttons">
                  <button className="move-btn"><FontAwesomeIcon icon={faAdd} /></button>
                  <button className="move-btn"><FontAwesomeIcon icon={faHistory} /></button>
                </div>
                
                <div className="navigation-controls">
                  <button className="nav-btn"><FontAwesomeIcon icon={faStepBackward} /></button>
                  <button className="nav-btn"><FontAwesomeIcon icon={faChevronLeft} /></button>
                  <button className="nav-btn"><FontAwesomeIcon icon={faChevronRight} /></button>
                  <button className="nav-btn"><FontAwesomeIcon icon={faStepForward} /></button>
                  <button className="nav-btn"><FontAwesomeIcon icon={faRedo} /></button>
                  <button className="nav-btn"><FontAwesomeIcon icon={faUndo} /></button>
                </div>
              </div>
              
              {gameStatus && (
                <div className="game-status">
                  <div className="game-result">
                    <div className="status-header">{gameStatus}</div>
                    <div className="result-details">
                      {profile?.username || 'Guest'} ({profile?.rating || 1200}) won by resignation ({gameResult.time})
                    </div>
                    <div className="rating-change">
                    {gameResult.winner === 'user' && `New rating: ${profile?.rating || 1200}`}
                    </div>
                  </div>
                  
                  <div className="opponent-feedback">
                    <div className="feedback-question">
                      Was your opponent a good sport?
                    </div>
                    <div className="feedback-buttons">
                      <button className="feedback-btn like"><FontAwesomeIcon icon={faThumbsUp} /></button>
                      <button className="feedback-btn dislike"><FontAwesomeIcon icon={faThumbsDown} /></button>
                    </div>
                  </div>
                  
                  <div className="message-input">
                    <input type="text" placeholder="Send a message..." />
                    <button className="emoji-btn">😊</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Show Submit Game button only in Play Yourself mode */}
        {playYourselfMode && (
          <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
            <button className="review-btn" onClick={handleSubmitPlayYourselfGame} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Game'}
            </button>
            <button className="review-btn" style={{ marginLeft: 12, background: '#444' }} onClick={onExitPlayYourself} disabled={isSubmitting}>
              Cancel
            </button>
            {submitError && <div style={{ color: 'red', marginTop: 8 }}>{submitError}</div>}
          </div>
        )}
        
        {/* Show Exit button in Bot mode */}
        {playBotMode && (
          <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
            <button className="review-btn" style={{ background: '#d48d3b' }} onClick={onExitBotMode}>
              Exit Bot Game
            </button>
          </div>
        )}
      </div>
      
      {/* Timeout Modal */}
      {showTimeoutModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #1a2332 0%, #0f1419 100%)',
            borderRadius: '20px',
            padding: '2.5rem',
            maxWidth: '500px',
            width: 'calc(100vw - 40px)',
            border: '3px solid rgba(244, 67, 54, 0.5)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.7), 0 0 100px rgba(244, 67, 54, 0.3)',
            textAlign: 'center',
            animation: 'modalSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            position: 'relative'
          }}>
            {/* Icon */}
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 1.5rem',
              background: 'linear-gradient(135deg, rgba(244, 67, 54, 0.2), rgba(229, 57, 53, 0.1))',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '3rem',
              border: '3px solid rgba(244, 67, 54, 0.5)',
              boxShadow: '0 0 30px rgba(244, 67, 54, 0.3)'
            }}>
              ⏱️
            </div>
            
            {/* Title */}
            <h2 style={{
              color: '#f44336',
              fontSize: '2rem',
              fontWeight: '700',
              marginBottom: '1rem',
              textShadow: '0 2px 20px rgba(244, 67, 54, 0.5)',
              letterSpacing: '1px'
            }}>
              TIME OUT!
            </h2>
            
            {/* Message */}
            <p style={{
              color: '#f5f5f5',
              fontSize: '1.2rem',
              marginBottom: '0.5rem',
              fontWeight: '600'
            }}>
              {timeoutWinner === playerColor ? 'You won!' : 'You lost!'}
            </p>
            
            <p style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '1rem',
              marginBottom: '2rem'
            }}>
              {timeoutWinner === playerColor 
                ? 'Your opponent ran out of time' 
                : 'You ran out of time'}
            </p>
            
            {/* Winner Display */}
            <div style={{
              background: 'rgba(42, 67, 97, 0.4)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '2rem',
              border: '2px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ color: '#e5a356', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '600' }}>
                Winner
              </div>
              <div style={{ color: '#f5f5f5', fontSize: '1.3rem', fontWeight: '700' }}>
                {timeoutWinner === 'white' ? '♔ White' : '♚ Black'}
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                Victory by timeout
              </div>
            </div>
            
            {/* Close Button */}
            <button 
              onClick={() => {
                setShowTimeoutModal(false);
                // Reset game after closing modal
                setTimeout(() => {
                  setActiveGame(null);
                  activeGameIdRef.current = null;
                  setOpponentProfile(null);
                  setGame(new Chess());
                  setMoves([]);
                  setGameStatus('');
                  setWhiteTime(600);
                  setBlackTime(600);
                  setIsTheaterMode(false);
                }, 500);
              }}
              style={{
                background: 'linear-gradient(135deg, #d48d3b 0%, #e5a356 100%)',
                color: '#0f1419',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 2.5rem',
                fontSize: '1rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 4px 15px rgba(212, 141, 59, 0.4)',
                letterSpacing: '0.5px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(212, 141, 59, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(212, 141, 59, 0.4)';
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {/* Resign Confirmation Modal */}
      {showResignModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #1a2332 0%, #0f1419 100%)',
            borderRadius: '20px',
            padding: '2.5rem',
            maxWidth: '450px',
            width: 'calc(100vw - 40px)',
            border: '3px solid rgba(229, 163, 86, 0.5)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.7), 0 0 100px rgba(229, 163, 86, 0.3)',
            textAlign: 'center',
            animation: 'modalSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            position: 'relative'
          }}>
            {/* Icon */}
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 1.5rem',
              background: 'linear-gradient(135deg, rgba(229, 163, 86, 0.2), rgba(212, 141, 59, 0.1))',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '3rem',
              border: '3px solid rgba(229, 163, 86, 0.5)',
              boxShadow: '0 0 30px rgba(229, 163, 86, 0.3)'
            }}>
              🏳️
            </div>
            
            {/* Title */}
            <h2 style={{
              color: '#e5a356',
              fontSize: '1.8rem',
              fontWeight: '700',
              marginBottom: '1rem',
              textShadow: '0 2px 20px rgba(229, 163, 86, 0.5)',
              letterSpacing: '0.5px'
            }}>
              Resign Game?
            </h2>
            
            {/* Message */}
            <p style={{
              color: '#f5f5f5',
              fontSize: '1.1rem',
              marginBottom: '0.5rem',
              fontWeight: '500',
              lineHeight: '1.6'
            }}>
              Are you sure you want to resign?
            </p>
            
            <p style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.95rem',
              marginBottom: '2rem',
              lineHeight: '1.5'
            }}>
              This will end the game and you will lose. This action cannot be undone.
            </p>
            
            {/* Buttons */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                onClick={() => setShowResignModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#f5f5f5',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  padding: '0.75rem 2rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  flex: '1'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmResign}
                style={{
                  background: 'linear-gradient(135deg, #e53e3e 0%, #c53030 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 2rem',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: '0 4px 15px rgba(229, 62, 62, 0.4)',
                  flex: '1'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(229, 62, 62, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(229, 62, 62, 0.4)';
                }}
              >
                Resign
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Resign Result Modal */}
      {showResignResultModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #1a2332 0%, #0f1419 100%)',
            borderRadius: '20px',
            padding: '2.5rem',
            maxWidth: '500px',
            width: 'calc(100vw - 40px)',
            border: resignWinner === playerColor 
              ? '3px solid rgba(72, 187, 120, 0.5)' 
              : '3px solid rgba(244, 67, 54, 0.5)',
            boxShadow: resignWinner === playerColor
              ? '0 25px 50px rgba(0, 0, 0, 0.7), 0 0 100px rgba(72, 187, 120, 0.3)'
              : '0 25px 50px rgba(0, 0, 0, 0.7), 0 0 100px rgba(244, 67, 54, 0.3)',
            textAlign: 'center',
            animation: 'modalSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            position: 'relative'
          }}>
            {/* Icon */}
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 1.5rem',
              background: resignWinner === playerColor
                ? 'linear-gradient(135deg, rgba(72, 187, 120, 0.2), rgba(56, 161, 105, 0.1))'
                : 'linear-gradient(135deg, rgba(244, 67, 54, 0.2), rgba(229, 57, 53, 0.1))',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '3rem',
              border: resignWinner === playerColor
                ? '3px solid rgba(72, 187, 120, 0.5)'
                : '3px solid rgba(244, 67, 54, 0.5)',
              boxShadow: resignWinner === playerColor
                ? '0 0 30px rgba(72, 187, 120, 0.3)'
                : '0 0 30px rgba(244, 67, 54, 0.3)'
            }}>
              {resignWinner === playerColor ? '🏆' : '🏳️'}
            </div>
            
            {/* Title */}
            <h2 style={{
              color: resignWinner === playerColor ? '#48bb78' : '#f44336',
              fontSize: '2rem',
              fontWeight: '700',
              marginBottom: '1rem',
              textShadow: resignWinner === playerColor
                ? '0 2px 20px rgba(72, 187, 120, 0.5)'
                : '0 2px 20px rgba(244, 67, 54, 0.5)',
              letterSpacing: '1px'
            }}>
              {resignWinner === playerColor ? 'VICTORY!' : 'DEFEAT'}
            </h2>
            
            {/* Message */}
            <p style={{
              color: '#f5f5f5',
              fontSize: '1.2rem',
              marginBottom: '0.5rem',
              fontWeight: '600'
            }}>
              {resignWinner === playerColor ? 'You won!' : 'You lost!'}
            </p>
            
            <p style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '1rem',
              marginBottom: '2rem'
            }}>
              {resignWinner === playerColor 
                ? 'Your opponent resigned' 
                : 'You resigned'}
            </p>
            
            {/* Winner Display */}
            <div style={{
              background: 'rgba(42, 67, 97, 0.4)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '2rem',
              border: '2px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ color: '#e5a356', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '600' }}>
                Winner
              </div>
              <div style={{ color: '#f5f5f5', fontSize: '1.3rem', fontWeight: '700' }}>
                {resignWinner === 'white' ? '♔ White' : '♚ Black'}
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                Victory by resignation
              </div>
            </div>
            
            {/* Close Button */}
            <button 
              onClick={() => {
                setShowResignResultModal(false);
                // Reset game after closing modal
                setTimeout(() => {
                  setActiveGame(null);
                  activeGameIdRef.current = null;
                  setOpponentProfile(null);
                  setGame(new Chess());
                  setMoves([]);
                  setGameStatus('');
                  setWhiteTime(600);
                  setBlackTime(600);
                  setIsTheaterMode(false);
                }, 500);
              }}
              style={{
                background: 'linear-gradient(135deg, #d48d3b 0%, #e5a356 100%)',
                color: '#0f1419',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 2.5rem',
                fontSize: '1rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 4px 15px rgba(212, 141, 59, 0.4)',
                letterSpacing: '0.5px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(212, 141, 59, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(212, 141, 59, 0.4)';
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChessboardSection;
