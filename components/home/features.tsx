export function Features() {
  return (
    <>
      {/* How it Works Section */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">How it Works</h2>
          <div className="w-12 h-1 bg-primary mx-auto rounded-full"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="flex flex-col p-8 rounded-2xl glass border-white/10 group hover:border-primary/50 transition-all">
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-primary text-3xl font-bold">content_paste</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">1. Paste</h3>
            <p className="text-slate-400 leading-relaxed">
              Simply copy the URL from your favorite platform and paste it into our AI processing field above.
            </p>
          </div>
          {/* Step 2 */}
          <div className="flex flex-col p-8 rounded-2xl glass border-white/10 group hover:border-primary/50 transition-all">
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-primary text-3xl font-bold">settings</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">2. Select</h3>
            <p className="text-slate-400 leading-relaxed">
              Choose your desired quality settings, from 720p to 4K, or extract audio in high-bitrate MP3 format.
            </p>
          </div>
          {/* Step 3 */}
          <div className="flex flex-col p-8 rounded-2xl glass border-white/10 group hover:border-primary/50 transition-all">
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-primary text-3xl font-bold">download</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">3. Download</h3>
            <p className="text-slate-400 leading-relaxed">
              Our AI engine optimizes the stream for maximum speed. Get your media in seconds without quality loss.
            </p>
          </div>
        </div>
      </section>
      {/* Featured Media Section (Visual Placeholder) */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="rounded-3xl overflow-hidden relative group aspect-[21/9] flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent z-10"></div>
          <div 
            className="w-full h-full bg-cover bg-center" 
            style={{
              backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCU0Ja6GSAn3dfok7fuyZOBrA0stfQIxDzJ9InUCnqZHMeOiWuRA10hr9z255LyvrEJpeTZ4v-oBjnto0tYmuPyHFgJHl6VaUhnOd5aHqPLdIKjKL-OasV79BeQ2opaQOgkwTmBuFYV6DYT63liLxY6_SS2lKtsREQBzL6o37fleWk7UZqH9NP3tDprAvy0ZvHO60oG0kuFIpZQh7BUXxsFjbKyXSUI8eooVB0qSSZkvjj4fZ0vmBrD6H07o0rA9Pzjqe3il0HFxcM')"
            }}
          ></div>
          <div className="absolute z-20 text-center px-4">
            <h3 className="text-2xl md:text-4xl font-bold text-white mb-4">Trusted by over 10M+ users worldwide</h3>
            <p className="text-slate-300 max-w-xl mx-auto">Joining the fastest growing media processing community. Fast, secure, and always free for basic use.</p>
          </div>
        </div>
      </section>
    </>
  );
}
