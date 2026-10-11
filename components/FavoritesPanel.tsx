"use client";
import { useEffect, useState } from "react";
import { jsonFetch } from "@/lib/client";
import { copy } from "@/lib/i18n";
import type { Favorite, Locale } from "@/lib/types";

export function FavoritesPanel({ locale, version, onChanged }: { locale: Locale; version: number; onChanged: () => void }) {
  const [favorites, setFavorites] = useState<Favorite[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const t=copy[locale];
  useEffect(() => { setLoading(true); jsonFetch<{favorites:Favorite[]}>(`/api/favorites?lang=${locale}`).then((data)=>setFavorites(data.favorites)).catch((e)=>setError(e.message)).finally(()=>setLoading(false)); },[locale,version]);
  async function remove(id:string){ await jsonFetch(`/api/favorites/${id}`,{method:"DELETE"}); onChanged(); }
  return <section className="content-card"><div className="section-heading"><div><span className="status-pill">SAVED</span><h2>{t.favorites}</h2></div><p>{favorites.length}</p></div>
    {loading ? <div className="empty-state">{t.loading}</div> : error ? <p className="form-error">{error}</p> : favorites.length ? <div className="favorite-grid">{favorites.map((favorite)=><article className="favorite-card" key={favorite.id}><span className="favorite-symbol" style={{background:favorite.color ?? "#e8f1f3"}}>{favorite.type==="line"?"🚌":"🚏"}</span><div><strong>{favorite.title}</strong><span>{favorite.subtitle}</span></div><button className="text-button" onClick={()=>remove(favorite.id)}>{t.remove}</button></article>)}</div> : <div className="empty-state">☆<strong>{t.noFavorites}</strong><span>{t.searchPlaceholder}</span></div>}
  </section>;
}
