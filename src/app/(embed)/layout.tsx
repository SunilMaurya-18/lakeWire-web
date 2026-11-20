const paint = `(function(){try{var bg="#080808";document.documentElement.style.background=bg;document.body.style.background=bg;}catch(e){}})();`;

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: paint }} />
      {children}
    </>
  );
}
