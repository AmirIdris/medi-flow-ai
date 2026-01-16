# yt-dlp API Service

FastAPI microservice that wraps yt-dlp for video extraction. This service runs separately from the main Next.js application and can be deployed on platforms that support Python (Railway, Render, Fly.io, etc.).

## Quick Start

### Local Development

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the service:
```bash
python main.py
```

The service will start on `http://localhost:8000`

### Test the Service

```bash
# Health check
curl http://localhost:8000/health

# Extract video
curl -X POST http://localhost:8000/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

## Deployment

### Railway (Recommended)

1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repository
3. Select the `ytdlp-service` directory as the root
4. Railway will automatically detect Python and install dependencies
5. Set environment variable `CORS_ORIGIN` to your Vercel app URL
6. Deploy!

### Render

1. Create a new Web Service on [Render](https://render.com)
2. Connect your repository
3. Set:
   - **Root Directory**: `ytdlp-service`
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python main.py`
4. Add environment variable `CORS_ORIGIN`
5. Deploy!

### Fly.io

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. Initialize: `fly launch` (in ytdlp-service directory)
4. Deploy: `fly deploy`

## Environment Variables

- `PORT` - Server port (default: 8000, auto-set by most platforms)
- `CORS_ORIGIN` - Allowed origin for CORS (set to your Vercel app URL)
- `YTDLP_COOKIES_FILE` - (Optional) Path to cookies file for better YouTube access. Export cookies from browser using an extension like "Get cookies.txt LOCALLY" or "cookies.txt"

## API Endpoints

### `GET /health`
Health check endpoint. Returns service status and yt-dlp availability.

### `POST /extract`
Extract video information.

**Request:**
```json
{
  "url": "https://www.youtube.com/watch?v=..."
}
```

**Response:**
Returns the same JSON format as `yt-dlp --dump-json`, including:
- Video metadata (title, thumbnail, duration, etc.)
- Available formats with URLs
- All other yt-dlp output fields

## Notes

- The service uses yt-dlp's `--dump-json` format for consistency
- Timeout is set to 60 seconds per request
- CORS is configured to allow requests from your Vercel app
- The service automatically handles yt-dlp errors and returns appropriate HTTP status codes
- **YouTube requires cookies**: For reliable YouTube extraction, you must set up cookies (see COOKIES_SETUP.md)
- The service tries multiple client types automatically, but cookies are often required