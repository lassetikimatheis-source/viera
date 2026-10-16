"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
} from "react";
import {
  dateKey,
  initialState,
  readState,
  State,
  STORAGE_KEY,
  Tab,
} from "@/lib/vyra-data";
type Route = { tab: Tab; detail?: string };
type Context = {
  data: State;
  setData: Dispatch<SetStateAction<State>>;
  day: string;
  setDay: Dispatch<SetStateAction<string>>;
  route: Route;
  go: (tab: Tab, detail?: string) => void;
  back: () => void;
  toast: (text: string) => void;
};
const Store = createContext<Context | null>(null);
export function useVyra() {
  const store = useContext(Store);
  if (!store) throw new Error("Missing VYRA provider");
  return store;
}
const parseRoute = (): Route => {
  const [tab, detail] = location.hash.replace("#", "").split("?")[0].split("/");
  return {
    tab: ["home", "health", "nutrition", "wellbeing", "profile"].includes(tab)
      ? (tab as Tab)
      : "home",
    detail,
  };
};
const subscribeReady = () => () => {};
export function Provider({ children }: { children: ReactNode }) {
  const ready = useSyncExternalStore(
    subscribeReady,
    () => true,
    () => false,
  );
  return ready ? (
    <StateProvider>{children}</StateProvider>
  ) : (
    <div className="app-loading">
      <b>VYRA</b>
    </div>
  );
}
function StateProvider({ children }: { children: ReactNode }) {
  const [loaded] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return { data: raw ? readState(raw) : initialState(), error: "" };
    } catch {
      return {
        data: initialState(false),
        error: "Gespeicherte Daten konnten nicht geladen werden.",
      };
    }
  });
  const [data, updateData] = useState<State>(loaded.data);
  const latest = useRef(data);
  const [day, setDay] = useState(dateKey);
  const [route, setRoute] = useState<Route>(() =>
    loaded.data.training ? { tab: "health", detail: "training" } : parseRoute(),
  );
  const [message, setMessage] = useState(loaded.error);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const sync = () => setRoute(parseRoute());
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  const setData: Dispatch<SetStateAction<State>> = useCallback((action) => {
    const next = typeof action === "function" ? action(latest.current) : action;
    latest.current = next;
    updateData(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      setMessage(
        "Speicher voll. Bitte Daten exportieren, bevor du die App schließt.",
      );
    }
  }, []);
  function go(tab: Tab, detail?: string) {
    history.pushState({}, "", "#" + tab + (detail ? "/" + detail : ""));
    setRoute({ tab, detail });
    if (tab === "home") setDay(dateKey());
  }
  function toast(text: string) {
    setMessage(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(""), 4500);
  }
  return (
    <Store.Provider
      value={{
        data,
        setData,
        day,
        setDay,
        route,
        go,
        back: () => go(route.tab),
        toast,
      }}
    >
      {children}
      {message && (
        <div className="toast" role="status" onClick={() => setMessage("")}>
          {message}
        </div>
      )}
    </Store.Provider>
  );
}
