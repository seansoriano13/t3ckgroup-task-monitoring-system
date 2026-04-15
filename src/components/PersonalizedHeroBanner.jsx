import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { aiService } from "../services/aiService";

const DEFAULT_QUOTE = "Begin each day with a Grateful Heart.";

export default function PersonalizedHeroBanner() {
  const { user } = useAuth();
  const [displayQuote, setDisplayQuote] = useState(DEFAULT_QUOTE);

  useEffect(() => {
    let alive = true;
    const preferredQuote = (user?.dashboardQuote || "").trim();

    if (preferredQuote) {
      setDisplayQuote(preferredQuote.slice(0, 72));
      return undefined;
    }

    aiService
      .getRandomMotivationalQuote(user?.name?.split(" ")?.[0] || "Team")
      .then((quote) => {
        if (alive) setDisplayQuote(quote || DEFAULT_QUOTE);
      })
      .catch(() => {
        if (alive) setDisplayQuote(DEFAULT_QUOTE);
      });

    return () => {
      alive = false;
    };
  }, [user?.dashboardQuote, user?.name]);

  return (
    <div className="relative z-0 bg-black rounded-2xl overflow-hidden shadow-lg min-h-[140px] md:min-h-[180px] flex items-center">
      <img
        className="opacity-60 absolute inset-0 w-full h-full object-cover"
        src={user?.dashboardBannerUrl || "/leaf-background.jpg"}
        alt=""
      />
      <div className="relative z-10 p-6 md:p-10 text-white flex flex-col md:flex-row md:justify-between md:items-center w-full gap-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
            Hi {user?.name?.split(" ")[0] || "Team"},
          </h1>
          <p className="text-gray-6 mt-1 font-medium text-base md:text-xl">
            Good to see you back!
          </p>
        </div>
        <div className="hidden sm:block border-t border-white/10 md:border-none pt-4 md:pt-0">
          <p className="italic text-xs md:text-sm text-left md:text-right text-gray-6 font-medium leading-relaxed">
            {displayQuote}
          </p>
        </div>
      </div>
    </div>
  );
}
