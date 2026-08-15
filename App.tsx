import React, { useState, useEffect, useCallback } from 'react';
import { Role, Screen, Profile, Session, Message } from './types';
import WelcomeScreen from './components/WelcomeScreen';
import OnboardingForm from './components/OnboardingForm';
import StudentDashboard from './components/StudentDashboard';
import MentorDashboard from './components/MentorDashboard';
import AdminDashboard from './components/AdminDashboard';
import SignIn from './components/SignIn';
import ResourceHub from './components/ResourceHub';
import ResetPassword from './components/ResetPassword';
import {
  fetchMe,
  fetchSessions,
  logout,
  setAuthToken,
  getAuthToken,
} from './api/client';
import { connectSocket, disconnectSocket } from './api/socket';

const getScreenFromPath = (): Screen => {
  switch (window.location.pathname) {
    case '/onboarding':
      return 'onboarding';
    case '/signin':
      return 'signin';
    case '/dashboard':
      return 'dashboard';
    case '/admin':
      return 'admin';
    case '/resources':
      return 'resources';
    default:
      return 'welcome';
  }
};

const screenToPath = (screen: Screen): string => {
  switch (screen) {
    case 'onboarding':
      return '/onboarding';
    case 'signin':
      return '/signin';
    case 'dashboard':
      return '/dashboard';
    case 'admin':
      return '/admin';
    case 'resources':
      return '/resources';
    default:
      return '/';
  }
};

export default function App() {
  const [screen, setScreen] = useState<Screen>(getScreenFromPath());
  const [role, setRole] = useState<Role>(null);
  const [theme] = useState<'light'>('light');
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [booting, setBooting] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    if (!getAuthToken()) return;
    const data = await fetchSessions();
    setSessions(data);
  }, []);

  useEffect(() => {
    const restore = async () => {
      const token = getAuthToken();
      if (!token) {
        setBooting(false);
        return;
      }
      try {
        const profile = await fetchMe();
        setCurrentUser(profile);
        setRole(profile.role);
        setScreen((prevScreen) => (prevScreen === 'resources' ? 'resources' : 'dashboard'));
        connectSocket();
        await loadSessions();
      } catch {
        setAuthToken(null);
      } finally {
        setBooting(false);
      }
    };
    restore();
  }, [loadSessions]);

  const handleSelectRole = (selectedRole: Role) => {
    setRole(selectedRole);
    setScreen('onboarding');
  };

  const handleCompleteOnboarding = (profile: Profile) => {
    setCurrentUser(profile);
    setRole(profile.role);
    connectSocket();
    setScreen(profile.role === 'admin' ? 'admin' : 'dashboard');
    loadSessions().catch(console.error);
  };

  const handleSignIn = (profile: Profile) => {
    setCurrentUser(profile);
    setRole(profile.role);
    connectSocket();
    setScreen(profile.role === 'admin' ? 'admin' : 'dashboard');
    loadSessions().catch(console.error);
  };

  const navigateTo = (target: Screen) => {
    const nextPath = screenToPath(target);
    window.history.pushState({}, '', nextPath);
    setScreen(target);
  };

  const handleSignOut = async () => {
    try {
      await logout();
    } catch {
      setAuthToken(null);
    }
    disconnectSocket();
    setCurrentUser(null);
    setRole(null);
    setSessions([]);
    setMessages([]);
    navigateTo('welcome');
  };

  const handleBackToWelcome = () => {
    setRole(null);
    setScreen('welcome');
  };

  useEffect(() => {
    const handlePopState = () => setScreen(getScreenFromPath());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-400">
        Loading PathPilot…
      </div>
    );
  }

  // Route: /reset-password (standalone page that reads token from URL)
  if (typeof window !== 'undefined' && window.location.pathname === '/reset-password') {
    return <ResetPassword />;
  }

  return (
    <div className="App min-h-screen bg-slate-900 text-slate-100 selection:bg-sky-500/30">
      {authError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-red-500/20 border border-red-400/30 text-red-200 rounded-xl text-sm">
          {authError}
        </div>
      )}

      {screen === 'welcome' && (
        <WelcomeScreen
          onSelectRole={handleSelectRole}
          onNavigateToSignIn={() => setScreen('signin')}
        />
      )}

      {screen === 'onboarding' && (
        <OnboardingForm
          role={role}
          onBack={handleBackToWelcome}
          onComplete={handleCompleteOnboarding}
          onError={setAuthError}
        />
      )}

      {screen === 'signin' && (
        <SignIn
          onSignIn={handleSignIn}
          onBack={() => setScreen('welcome')}
          onError={setAuthError}
        />
      )}

      {screen === 'dashboard' && currentUser && (
        currentUser.role === 'student' ? (
          <StudentDashboard
            student={currentUser}
            sessions={sessions}
            setSessions={setSessions}
            messages={messages}
            setMessages={setMessages}
            onSignOut={handleSignOut}
            refreshSessions={loadSessions}
            onOpenResources={() => navigateTo('resources')}
          />
        ) : (
          <MentorDashboard
            mentor={currentUser}
            sessions={sessions}
            setSessions={setSessions}
            messages={messages}
            setMessages={setMessages}
            onSignOut={handleSignOut}
            refreshSessions={loadSessions}
          />
        )
      )}

      {screen === 'admin' && currentUser && (
        <AdminDashboard adminName={currentUser.name} onSignOut={handleSignOut} />
      )}

      {screen === 'resources' && (
        <ResourceHub
          onBack={() => navigateTo(currentUser ? 'dashboard' : 'welcome')}
        />
      )}
    </div>
  );
}
