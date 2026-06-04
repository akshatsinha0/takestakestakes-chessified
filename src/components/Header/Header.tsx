import { useState, useEffect, useRef } from 'react'
import {
  DEFAULT_RATING,
  ONLINE_THRESHOLD_MS,
} from '../../../convex/lib/constants'
import './Header.css'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Avatar, Menu, MenuItem, IconButton, Badge, Fade } from '@mui/material'
import {
  AccountCircle,
  Notifications,
  Settings,
  ExitToApp,
  KeyboardArrowDown,
  Person as PersonIcon,
  History as HistoryIcon,
  Close as CloseIcon,
} from '@mui/icons-material'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import ChallengeModal from '../ChallengeModal/ChallengeModal'
import GameHistory from '../GameHistory/GameHistory'
import UserProfile from '../UserProfile/UserProfile'
import {
  useNotifications,
  type AppNotification,
} from '../../hooks/useNotifications'
import { toast } from 'react-toastify'
import notiIcon from '../../assets/images/noti.png'

const NAV_ITEMS = [
  { name: 'Play', path: '/play' },
  { name: 'Puzzles', path: '/puzzles' },
  { name: 'Lessons', path: '/lessons' },
  { name: 'Analysis', path: '/analysis' },
]

const getInitial = (name: string | undefined) =>
  name?.charAt(0).toUpperCase() || 'G'

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

const Header: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('/play')
  const [prevTab, setPrevTab] = useState<string | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [animationDirection, setAnimationDirection] = useState('right')
  const indicatorRef = useRef<HTMLDivElement>(null)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const directory = useQuery(api.profiles.directory, {})
  const allUsers = directory ?? []
  const loadingUsers = directory === undefined
  const acceptChallengeMutation = useMutation(api.challenges.accept)
  const declineChallengeMutation = useMutation(api.challenges.decline)
  const respondFriendMutation = useMutation(api.friends.respond)
  const [challengeTarget, setChallengeTarget] = useState<any>(null)
  const [showGameHistory, setShowGameHistory] = useState(false)
  const [notificationDropdownOpen, setNotificationDropdownOpen] =
    useState(false)
  const [viewProfileUserId, setViewProfileUserId] = useState<string | null>(
    null,
  )

  // Use notifications hook
  const { notifications, unreadCount, removeNotification } = useNotifications()

  const open = Boolean(anchorEl)

  useEffect(() => {
    const path = location.pathname
    if (path !== activeTab) {
      setPrevTab(activeTab)
      const currentIndex = NAV_ITEMS.findIndex((item) => item.path === path)
      const prevIndex = NAV_ITEMS.findIndex((item) => item.path === activeTab)
      setAnimationDirection(currentIndex > prevIndex ? 'right' : 'left')
      setActiveTab(path)
    }
  }, [location, activeTab])

  useEffect(() => {
    if (indicatorRef.current) {
      const activeElement = document.querySelector(
        `.nav-item[data-path="${activeTab}"]`,
      )
      if (activeElement) {
        const { width, left } = activeElement.getBoundingClientRect()
        const parentLeft =
          indicatorRef.current.parentElement?.getBoundingClientRect().left || 0

        indicatorRef.current.style.width = `${width}px`
        indicatorRef.current.style.transform = `translateX(${left - parentLeft}px)`
      }
    }
  }, [activeTab])

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = async () => {
    handleClose()
    await signOut()
    navigate('/')
  }

  const handleUserDropdown = () => {
    setUserDropdownOpen((isOpen) => !isOpen)
  }

  // Handle notification dropdown toggle
  const handleNotificationClick = () => {
    setNotificationDropdownOpen(!notificationDropdownOpen)
  }

  const handleAcceptChallenge = async (notification: AppNotification) => {
    const invitation = notification.data.invitation
    if (!invitation) return
    try {
      await acceptChallengeMutation({
        invitationId: invitation._id,
      })
      removeNotification(notification.id)
      setNotificationDropdownOpen(false)
      toast.success('Game started!')
    } catch {
      toast.error('Failed to accept challenge')
    }
  }

  const handleDeclineChallenge = async (notification: AppNotification) => {
    const invitation = notification.data.invitation
    if (!invitation) return
    try {
      await declineChallengeMutation({ invitationId: invitation._id })
      removeNotification(notification.id)
      toast.info('Challenge declined')
    } catch {
      toast.error('Failed to decline challenge')
    }
  }

  const handleAcceptFriendRequest = async (notification: AppNotification) => {
    const friendRequest = notification.data.friendRequest
    if (!friendRequest) return
    try {
      await respondFriendMutation({
        requestId: friendRequest._id,
        accept: true,
      })
      removeNotification(notification.id)
      toast.success('Friend request accepted!')
    } catch {
      toast.error('Failed to accept friend request')
    }
  }

  const handleDeclineFriendRequest = async (notification: AppNotification) => {
    const friendRequest = notification.data.friendRequest
    if (!friendRequest) return
    try {
      await respondFriendMutation({
        requestId: friendRequest._id,
        accept: false,
      })
      removeNotification(notification.id)
      toast.info('Friend request declined')
    } catch {
      toast.error('Failed to decline friend request')
    }
  }

  return (
    <header className='header'>
      <div className='header-container'>
        <div className='header-left'>
          <div
            className='user-list-trigger'
            onClick={handleUserDropdown}
            tabIndex={0}
            aria-expanded={userDropdownOpen}
            style={{ marginRight: '1.2rem', position: 'relative' }}
          >
            <span className='user-list-icon'>👥</span>
            <span className='user-list-label'>Users</span>
            <span className='dropdown-arrow'>▼</span>
            {userDropdownOpen && (
              <div className='user-list-dropdown'>
                <div className='user-list-title'>All Players</div>
                {loadingUsers ? (
                  <div className='user-list-loading'>Loading...</div>
                ) : (
                  <div className='user-list-scroll'>
                    {allUsers.length === 0 && (
                      <div className='user-list-empty'>No users found.</div>
                    )}
                    {allUsers.map((u) => {
                      const isOnline =
                        Date.now() - u.lastActive < ONLINE_THRESHOLD_MS

                      return (
                        <div className='user-list-item' key={u._id}>
                          <div className='user-list-avatar'>
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt={u.username} />
                            ) : (
                              <span className='avatar-fallback'>
                                {u.username.charAt(0).toUpperCase()}
                              </span>
                            )}
                            <span
                              className={`user-status-dot ${isOnline ? 'online' : 'offline'}`}
                            ></span>
                          </div>
                          <div className='user-list-info'>
                            <span className='user-list-username'>
                              {u.username}
                            </span>
                            <span className='user-list-rating'>{u.rating}</span>
                          </div>
                          {u.userId !== user?.id && (
                            <div className='user-list-actions'>
                              <button
                                className='view-profile-btn'
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setViewProfileUserId(u.userId)
                                  setUserDropdownOpen(false)
                                }}
                              >
                                View Profile
                              </button>
                              <button
                                className='challenge-btn'
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setChallengeTarget(u)
                                  setUserDropdownOpen(false)
                                }}
                              >
                                Challenge
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className='logo'>
            <h1 className='logo-text'>TakesTakesTakes</h1>
          </div>

          <nav className='main-nav'>
            <div className='nav-items-container'>
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${activeTab === item.path ? 'active' : ''}`}
                  data-path={item.path}
                >
                  {item.name}
                  <span className='nav-item-glow'></span>
                </Link>
              ))}
              <div
                ref={indicatorRef}
                className={`active-indicator ${animationDirection}`}
                data-prev={prevTab}
              ></div>
            </div>
          </nav>
        </div>

        <div className='header-right'>
          <div className='user-section'>
            <div className='user-profile' onClick={handleMenu}>
              <div className='avatar-container'>
                {profile?.avatarUrl ? (
                  <Avatar
                    src={profile.avatarUrl}
                    alt={profile.username}
                    className='user-avatar'
                  />
                ) : (
                  <div className='avatar'>
                    {profile ? getInitial(profile.username) : 'G'}
                    <div className='online-status'></div>
                  </div>
                )}
              </div>

              <div className='user-info'>
                <span className='username'>{profile?.username || 'Guest'}</span>
                {profile && <span className='rating'>{profile.rating}</span>}
              </div>

              <KeyboardArrowDown className='dropdown-arrow' />
            </div>

            <Menu
              id='menu-appbar'
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={open}
              onClose={handleClose}
              className='enhanced-dropdown'
              elevation={0}
              TransitionComponent={Fade}
              transitionDuration={200}
              disableScrollLock
            >
              <div className='dropdown-container'>
                {user && (
                  <>
                    <div className='dropdown-header'>
                      <div className='user-avatar-large'>
                        {profile?.avatarUrl ? (
                          <Avatar
                            src={profile.avatarUrl}
                            alt={profile.username || 'User'}
                          />
                        ) : (
                          <div className='avatar-fallback'>
                            {profile?.username?.charAt(0) || 'U'}
                          </div>
                        )}
                      </div>
                      <div className='user-details-expanded'>
                        <span className='user-fullname'>
                          {profile?.username || 'User'}
                        </span>
                        <span className='user-rating-expanded'>
                          <span className='rating-value'>
                            {profile?.rating || DEFAULT_RATING}
                          </span>
                          <span className='rating-label'>ELO</span>
                        </span>
                      </div>
                    </div>

                    <div className='dropdown-divider'></div>
                  </>
                )}

                <MenuItem
                  onClick={() => {
                    handleClose()
                    navigate('/profile')
                  }}
                  className='dropdown-item profile-item'
                >
                  <div className='menu-icon-wrapper'>
                    <AccountCircle className='menu-icon' />
                  </div>
                  <div className='menu-text'>Profile</div>
                  <div className='menu-indicator'>
                    <span className='chess-piece'>♟</span>
                  </div>
                </MenuItem>

                <MenuItem
                  onClick={() => {
                    handleClose()
                    navigate('/account')
                  }}
                  className='dropdown-item account-item'
                >
                  <div className='menu-icon-wrapper'>
                    <PersonIcon className='menu-icon' />
                  </div>
                  <div className='menu-text'>My Account</div>
                  <div className='menu-indicator'>
                    <span className='chess-piece'>♜</span>
                  </div>
                </MenuItem>

                <MenuItem
                  onClick={() => {
                    handleClose()
                    setShowGameHistory(true)
                  }}
                  className='dropdown-item history-item'
                >
                  <div className='menu-icon-wrapper'>
                    <HistoryIcon className='menu-icon' />
                  </div>
                  <div className='menu-text'>Game History</div>
                  <div className='menu-indicator'>
                    <span className='chess-piece'>♞</span>
                  </div>
                </MenuItem>

                <MenuItem
                  onClick={() => {
                    handleClose()
                    navigate('/settings')
                  }}
                  className='dropdown-item settings-item'
                >
                  <div className='menu-icon-wrapper'>
                    <Settings className='menu-icon' />
                  </div>
                  <div className='menu-text'>Settings</div>
                  <div className='menu-indicator'>
                    <span className='chess-piece'>♝</span>
                  </div>
                </MenuItem>

                <div className='dropdown-divider'></div>

                <MenuItem
                  onClick={handleLogout}
                  className='dropdown-item logout-item'
                >
                  <div className='menu-icon-wrapper logout'>
                    <ExitToApp className='menu-icon' />
                  </div>
                  <div className='menu-text'>Logout</div>
                  <div className='menu-indicator'>
                    <span className='chess-piece'>♚</span>
                  </div>
                </MenuItem>

                {user && (
                  <div className='dropdown-footer'>
                    <div className='user-stats'>
                      <div className='stat-item'>
                        <span className='stat-value'>0</span>
                        <span className='stat-label'>Games</span>
                      </div>
                      <div className='stat-item'>
                        <span className='stat-value'>0</span>
                        <span className='stat-label'>Wins</span>
                      </div>
                      <div className='stat-item'>
                        <span className='stat-value'>0%</span>
                        <span className='stat-label'>Win Rate</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Menu>
          </div>

          <div
            className='notification-wrapper'
            style={{ position: 'relative' }}
          >
            <IconButton
              aria-label='notifications'
              className='notification-icon'
              onClick={handleNotificationClick}
            >
              <Badge
                badgeContent={unreadCount}
                color='error'
                sx={{
                  '& .MuiBadge-badge': {
                    animation: unreadCount > 0 ? 'pulse 2s infinite' : 'none',
                    backgroundColor: 'var(--color-danger)',
                    color: 'white',
                    fontWeight: 'bold',
                  },
                }}
              >
                <Notifications />
              </Badge>
            </IconButton>

            {/* Notification Dropdown */}
            {notificationDropdownOpen && (
              <div
                className='notification-dropdown'
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '0.5rem',
                  width: '380px',
                  maxHeight: '500px',
                  background:
                    'linear-gradient(145deg, var(--color-surface) 0%, var(--color-bg-deep) 100%)',
                  borderRadius: '12px',
                  border: '2px solid var(--alpha-accent-30)',
                  boxShadow:
                    '0 15px 40px var(--alpha-black-40), 0 0 60px var(--alpha-accent-10)',
                  zIndex: 10000,
                  overflow: 'hidden',
                }}
              >
                {/* Header */}
                <div
                  style={{
                    padding: '1rem 1.25rem',
                    borderBottom: '1px solid var(--alpha-white-10)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <h3
                    style={{
                      color: 'var(--text-primary)',
                      margin: 0,
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <img
                      src={notiIcon}
                      alt='Notifications'
                      style={{
                        width: '20px',
                        height: '20px',
                        objectFit: 'contain',
                      }}
                    />
                    Notifications
                    {unreadCount > 0 && (
                      <span
                        style={{
                          background: 'var(--color-danger)',
                          color: 'white',
                          fontSize: '0.75rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '10px',
                          fontWeight: '700',
                        }}
                      >
                        {unreadCount}
                      </span>
                    )}
                  </h3>
                  <IconButton
                    size='small'
                    onClick={() => setNotificationDropdownOpen(false)}
                    sx={{ color: 'var(--alpha-white-70)' }}
                  >
                    <CloseIcon fontSize='small' />
                  </IconButton>
                </div>

                {/* Notifications List */}
                <div
                  style={{
                    maxHeight: '400px',
                    overflowY: 'auto',
                    padding: '0.5rem',
                  }}
                >
                  {notifications.length === 0 ? (
                    <div
                      style={{
                        padding: '2rem',
                        textAlign: 'center',
                        color: 'var(--alpha-white-50)',
                      }}
                    >
                      <div style={{ marginBottom: '0.75rem' }}>
                        <img
                          src={notiIcon}
                          alt='No notifications'
                          style={{
                            width: '60px',
                            height: '60px',
                            objectFit: 'contain',
                            opacity: 0.5,
                          }}
                        />
                      </div>
                      <div style={{ fontSize: '0.95rem' }}>
                        No notifications
                      </div>
                      <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                        Challenge someone to play!
                      </div>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        style={{
                          background: 'var(--alpha-surface-40)',
                          borderRadius: '10px',
                          padding: '1rem',
                          marginBottom: '0.5rem',
                          border: '1px solid var(--alpha-accent-20)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {/* Notification Header */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            marginBottom: '0.75rem',
                          }}
                        >
                          {/* Avatar */}
                          <div
                            style={{
                              width: '45px',
                              height: '45px',
                              borderRadius: '50%',
                              background:
                                'linear-gradient(135deg, var(--color-accent-strong), var(--color-accent))',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.2rem',
                              fontWeight: '700',
                              color: 'var(--color-bg-deep)',
                              flexShrink: 0,
                            }}
                          >
                            {notification.data?.sender?.username
                              ?.charAt(0)
                              ?.toUpperCase() || '?'}
                          </div>

                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                color: 'var(--color-accent)',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                marginBottom: '0.2rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                              }}
                            >
                              <img
                                src={notiIcon}
                                alt='Challenge'
                                style={{
                                  width: '14px',
                                  height: '14px',
                                  objectFit: 'contain',
                                }}
                              />
                              {notification.title}
                            </div>
                            <div
                              style={{
                                color: 'var(--text-primary)',
                                fontSize: '0.9rem',
                                lineHeight: '1.4',
                              }}
                            >
                              {notification.message}
                            </div>
                            <div
                              style={{
                                color: 'var(--alpha-white-50)',
                                fontSize: '0.75rem',
                                marginTop: '0.3rem',
                              }}
                            >
                              {formatTimeAgo(notification.created_at)}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        {notification.type === 'challenge' && (
                          <div
                            style={{
                              display: 'flex',
                              gap: '0.5rem',
                              marginTop: '0.5rem',
                            }}
                          >
                            <button
                              onClick={() =>
                                handleAcceptChallenge(notification)
                              }
                              style={{
                                flex: 1,
                                padding: '0.6rem',
                                background:
                                  'linear-gradient(135deg, var(--color-success) 0%, var(--success) 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                              }}
                            >
                              ✓ Accept
                            </button>
                            <button
                              onClick={() =>
                                handleDeclineChallenge(notification)
                              }
                              style={{
                                flex: 1,
                                padding: '0.6rem',
                                background: 'var(--alpha-accent-20)',
                                color: 'var(--brand-red-soft)',
                                border: '1px solid var(--alpha-accent-30)',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                              }}
                            >
                              ✕ Decline
                            </button>
                          </div>
                        )}
                        {notification.type === 'friend_request' && (
                          <div
                            style={{
                              display: 'flex',
                              gap: '0.5rem',
                              marginTop: '0.5rem',
                            }}
                          >
                            <button
                              onClick={() =>
                                handleAcceptFriendRequest(notification)
                              }
                              style={{
                                flex: 1,
                                padding: '0.6rem',
                                background:
                                  'linear-gradient(135deg, var(--color-accent-strong) 0%, var(--color-accent) 100%)',
                                color: 'var(--color-bg-deep)',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                              }}
                            >
                              ✓ Accept
                            </button>
                            <button
                              onClick={() =>
                                handleDeclineFriendRequest(notification)
                              }
                              style={{
                                flex: 1,
                                padding: '0.6rem',
                                background: 'var(--alpha-accent-20)',
                                color: 'var(--brand-red-soft)',
                                border: '1px solid var(--alpha-accent-30)',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                              }}
                            >
                              ✕ Decline
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <IconButton
            aria-label='settings'
            className='settings-icon'
            onClick={() => navigate('/settings')}
          >
            <Settings />
          </IconButton>
        </div>
      </div>
      {challengeTarget && (
        <ChallengeModal
          targetUser={challengeTarget}
          onClose={() => setChallengeTarget(null)}
        />
      )}
      {showGameHistory && (
        <GameHistory onClose={() => setShowGameHistory(false)} />
      )}
      {viewProfileUserId && (
        <UserProfile
          userId={viewProfileUserId}
          onClose={() => setViewProfileUserId(null)}
        />
      )}
    </header>
  )
}

export default Header
