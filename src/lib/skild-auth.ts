// Browser auth for the Skild /admin portal. Uses the publishable Supabase
// client. Role check goes through the `has_role` SECURITY DEFINER RPC so the
// browser never has to query `user_roles` directly.

import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { skildSupabase } from "./skild-supabase";

export type SkildSession = {
  loading: boolean;
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
};

export function useSkildSession(): SkildSession {
  const [state, setState] = useState<SkildSession>({
    loading: true,
    user: null,
    session: null,
    isAdmin: false,
  });

  useEffect(() => {
    let alive = true;

    async function hydrate(session: Session | null) {
      if (!alive) return;
      if (!session?.user) {
        setState({ loading: false, user: null, session: null, isAdmin: false });
        return;
      }
      const { data, error } = await skildSupabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });
      if (!alive) return;
      setState({
        loading: false,
        user: session.user,
        session,
        isAdmin: !error && data === true,
      });
    }

    skildSupabase.auth.getSession().then(({ data }) => hydrate(data.session));
    const { data: sub } = skildSupabase.auth.onAuthStateChange((_e, session) => {
      hydrate(session);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export async function signInWithPassword(email: string, password: string) {
  return skildSupabase.auth.signInWithPassword({ email, password });
}
export async function signOut() {
  return skildSupabase.auth.signOut();
}
