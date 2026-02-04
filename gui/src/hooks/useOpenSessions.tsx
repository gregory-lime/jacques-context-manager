import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';

export interface OpenSession {
  id: string;
  type: 'active' | 'archived';
  title: string;
  project?: string;
  openedAt: number;
}

interface OpenSessionsState {
  sessions: OpenSession[];
  activeViewId: string | null;
}

type Action =
  | { type: 'OPEN_SESSION'; payload: OpenSession }
  | { type: 'CLOSE_SESSION'; payload: string }
  | { type: 'VIEW_SESSION'; payload: string }
  | { type: 'VIEW_DASHBOARD' }
  | { type: 'UPDATE_TITLE'; payload: { id: string; title: string } };

const STORAGE_KEY = 'jacques-open-sessions';

function loadPersistedSessions(): OpenSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function persistSessions(sessions: OpenSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // ignore
  }
}

function reducer(state: OpenSessionsState, action: Action): OpenSessionsState {
  switch (action.type) {
    case 'OPEN_SESSION': {
      const exists = state.sessions.find(s => s.id === action.payload.id);
      if (exists) {
        return { ...state, activeViewId: action.payload.id };
      }
      return {
        sessions: [...state.sessions, action.payload],
        activeViewId: action.payload.id,
      };
    }
    case 'CLOSE_SESSION': {
      const next = state.sessions.filter(s => s.id !== action.payload);
      return {
        sessions: next,
        activeViewId: state.activeViewId === action.payload ? null : state.activeViewId,
      };
    }
    case 'VIEW_SESSION': {
      const found = state.sessions.find(s => s.id === action.payload);
      if (!found) return state;
      return { ...state, activeViewId: action.payload };
    }
    case 'VIEW_DASHBOARD':
      return { ...state, activeViewId: null };
    case 'UPDATE_TITLE': {
      return {
        ...state,
        sessions: state.sessions.map(s =>
          s.id === action.payload.id ? { ...s, title: action.payload.title } : s
        ),
      };
    }
    default:
      return state;
  }
}

interface OpenSessionsContextValue {
  state: OpenSessionsState;
  openSession: (session: Omit<OpenSession, 'openedAt'>) => void;
  closeSession: (id: string) => void;
  viewSession: (id: string) => void;
  viewDashboard: () => void;
  updateTitle: (id: string, title: string) => void;
}

const OpenSessionsContext = createContext<OpenSessionsContextValue | null>(null);

export function OpenSessionsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    sessions: loadPersistedSessions(),
    activeViewId: null,
  });

  // Persist sessions to localStorage on change
  useEffect(() => {
    persistSessions(state.sessions);
  }, [state.sessions]);

  const openSession = useCallback((session: Omit<OpenSession, 'openedAt'>) => {
    dispatch({ type: 'OPEN_SESSION', payload: { ...session, openedAt: Date.now() } });
  }, []);

  const closeSession = useCallback((id: string) => {
    dispatch({ type: 'CLOSE_SESSION', payload: id });
  }, []);

  const viewSession = useCallback((id: string) => {
    dispatch({ type: 'VIEW_SESSION', payload: id });
  }, []);

  const viewDashboard = useCallback(() => {
    dispatch({ type: 'VIEW_DASHBOARD' });
  }, []);

  const updateTitle = useCallback((id: string, title: string) => {
    dispatch({ type: 'UPDATE_TITLE', payload: { id, title } });
  }, []);

  return (
    <OpenSessionsContext.Provider value={{ state, openSession, closeSession, viewSession, viewDashboard, updateTitle }}>
      {children}
    </OpenSessionsContext.Provider>
  );
}

export function useOpenSessions(): OpenSessionsContextValue {
  const ctx = useContext(OpenSessionsContext);
  if (!ctx) {
    throw new Error('useOpenSessions must be used within OpenSessionsProvider');
  }
  return ctx;
}
