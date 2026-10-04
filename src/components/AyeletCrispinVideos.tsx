const VIDEOS = [
  {
    id: 'XbwGamf-tsg',
    label: 'סרטון 1',
    title: 'זוויות בין ישרים מקבילים — הבנת המיקום של זוויות מתאימות ומתחלפות',
    url: 'https://youtu.be/XbwGamf-tsg',
  },
  {
    id: 'y9Uu3NGoU-I',
    label: 'סרטון 2',
    title: 'זוויות בין ישרים מקבילים — למה הזוויות המתאימות והמתחלפות שוות בין ישרים מקבילים',
    url: 'https://www.youtube.com/watch?v=y9Uu3NGoU-I',
  },
] as const;

export function AyeletCrispinVideos() {
  return (
    <section className="crispin-videos" aria-labelledby="crispin-videos-title">
      <div className="crispin-videos__geometry" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <header className="crispin-videos__header">
        <div className="crispin-videos__eyebrow">סרטוני המחשה • דפי עבודה • כיתה ח׳</div>
        <h2 id="crispin-videos-title">זוויות בין ישרים מקבילים</h2>
        <p className="crispin-videos__subject">סרטוני המחשה ודפי עבודה</p>
        <p className="crispin-videos__credit">
          הסרטונים צולמו על ידי איילת קריספין — מדריכה מחוזית למתמטיקה חט״ב, מחוז ירושלים
        </p>
      </header>

      <div className="crispin-videos__grid">
        {VIDEOS.map((video, index) => (
          <article className="crispin-video-card" key={video.id}>
            <div className="crispin-video-card__topline">
              <span className="crispin-video-card__label">{video.label}</span>
              <span className="crispin-video-card__number" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
            </div>

            <div className="crispin-video-card__frame">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0`}
                title={video.title}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>

            <div className="crispin-video-card__body">
              <span className="crispin-video-card__topic-label">נושא הסרטון</span>
              <h3>{video.title}</h3>
              <a className="crispin-video-card__link" href={video.url} target="_blank" rel="noreferrer">
                <span>צפייה בסרטון ביוטיוב</span>
                <span className="crispin-video-card__arrow" aria-hidden="true">←</span>
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
