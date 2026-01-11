export function Features() {
  const features = [
    {
      title: "Multi-Platform Support",
      description: "Download videos from YouTube, TikTok, Instagram, Facebook, Twitter, and more.",
      icon: "🌐",
    },
    {
      title: "AI-Powered Summaries",
      description: "Get instant transcriptions and intelligent summaries of any video content.",
      icon: "🤖",
    },
    {
      title: "High Quality Downloads",
      description: "Choose from multiple quality options including 4K, 1080p, 720p, and audio only.",
      icon: "🎬",
    },
    {
      title: "Fast & Reliable",
      description: "Lightning-fast downloads with 99.9% uptime and reliable service.",
      icon: "⚡",
    },
    {
      title: "Secure & Private",
      description: "Your data is encrypted and secure. We never store your personal information.",
      icon: "🔒",
    },
    {
      title: "Easy to Use",
      description: "Simple interface. Just paste a URL and download. No technical knowledge required.",
      icon: "✨",
    },
  ];
  
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Why Choose MediaFlow AI?
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need for video downloads and AI analysis
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
