"""
yt-dlp API Service
FastAPI service that wraps yt-dlp for video extraction
Deploy on Railway, Render, or similar platforms that support Python
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, HttpUrl
import subprocess
import json
import os
import sys
from typing import Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="yt-dlp API Service", version="1.0.0")

# CORS configuration
cors_origin = os.getenv("CORS_ORIGIN", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[cors_origin] if cors_origin != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class ExtractRequest(BaseModel):
    url: HttpUrl

class HealthResponse(BaseModel):
    status: str
    ytdlp_available: bool
    python_version: str

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check if yt-dlp is available
        result = subprocess.run(
            [sys.executable, "-m", "yt_dlp", "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        ytdlp_available = result.returncode == 0
        ytdlp_version = result.stdout.strip() if ytdlp_available else "Not available"
    except Exception as e:
        logger.warning(f"yt-dlp check failed: {e}")
        ytdlp_available = False
        ytdlp_version = "Not available"
    
    return {
        "status": "ok",
        "ytdlp_available": ytdlp_available,
        "ytdlp_version": ytdlp_version,
        "python_version": sys.version
    }

@app.post("/extract")
async def extract_video(request: ExtractRequest):
    """
    Extract video information using yt-dlp
    Returns JSON in the same format as yt-dlp --dump-json
    Tries multiple player clients to avoid YouTube bot detection
    """
    video_url = str(request.url)
    logger.info(f"Extracting video: {video_url}")
    
    # Try different YouTube player clients and configurations
    # This helps avoid bot detection by using different client types
    # Each tuple: (client_type, skip_type, additional_args)
    player_configs = [
        ("web", "webpage", []),  # Web client with webpage skip
        ("web", None, []),       # Web client without skip (for Shorts)
        ("ios", None, []),       # iOS client
        ("android", None, []),   # Android client
        ("mweb", None, []),      # Mobile web client
    ]
    
    # Optional: Use cookies if provided via environment variable
    cookies_file = os.getenv("YTDLP_COOKIES_FILE")
    use_cookies = cookies_file and os.path.exists(cookies_file)
    if use_cookies:
        logger.info("Using cookies file for authentication")
    
    last_error = None
    
    for client_type, skip_type, additional_args in player_configs:
        # Build config name for logging
        config_name = f"{client_type}" + (f" (skip: {skip_type})" if skip_type else "")
        
        try:
            # Build base args
            args = [
                sys.executable,
                "-m",
                "yt_dlp",
                "--dump-json",
                "--no-warnings",
                "--no-playlist",
                "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "--extractor-args", f"youtube:player_client={client_type}",
            ]
            
            # Add skip type if specified
            if skip_type:
                args.extend(["--extractor-args", f"youtube:player_skip={skip_type}"])
            
            # Add additional extractor args for better compatibility
            # These help with Shorts and bot detection
            args.extend([
                "--extractor-args", "youtube:player_params=8AEB",
                "--extractor-args", "youtube:include_live_chat=false",
                "--extractor-args", "youtube:skip=dash,translated_subs",
            ])
            
            # Add referer header to mimic browser behavior
            args.extend([
                "--add-header", "Referer:https://www.youtube.com/",
            ])
            
            # Add any additional args for this config
            args.extend(additional_args)
            
            # Add cookies if available
            if use_cookies:
                args.extend(["--cookies", cookies_file])
            
            # Add video URL
            args.append(video_url)
            
            logger.info(f"Trying YouTube client: {config_name}")
            
            # Run yt-dlp with timeout (60 seconds)
            result = subprocess.run(
                args,
                capture_output=True,
                text=True,
                timeout=60,
                check=False  # Don't raise on non-zero exit
            )
            
            if result.returncode == 0:
                # Success! Parse and return
                try:
                    data = json.loads(result.stdout)
                    logger.info(f"Successfully extracted video: {data.get('title', 'Unknown')} (client: {config_name})")
                    return JSONResponse(content=data)
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse yt-dlp JSON: {e}")
                    logger.error(f"Output: {result.stdout[:500]}")
                    last_error = f"Failed to parse yt-dlp output: {str(e)}"
                    continue  # Try next client
            
            # If we get here, this client failed
            error_msg = result.stderr or result.stdout or "Unknown error"
            logger.warning(f"Client {config_name} failed: {error_msg[:200]}")
            
            # Check if it's a bot detection error
            if "Sign in to confirm" in error_msg or "not a bot" in error_msg:
                last_error = f"YouTube bot detection (tried {config_name})"
                continue  # Try next client
            elif "not available on this app" in error_msg or "Watch on the latest version" in error_msg:
                # This client doesn't support this content type (e.g., Shorts on android)
                last_error = f"Content not available for {config_name}: {error_msg[:200]}"
                continue  # Try next client
            else:
                # Other error, might work with different client
                last_error = error_msg[:500]
                continue
            
        except subprocess.TimeoutExpired:
            logger.warning(f"Client {config_name} timed out")
            last_error = "Video extraction timed out"
            continue
        except Exception as e:
            logger.warning(f"Client {config_name} error: {e}")
            last_error = str(e)
            continue
    
    # All clients failed
    error_detail = last_error or "All YouTube client types failed"
    logger.error(f"All extraction attempts failed: {error_detail}")
    
    # Provide helpful error message
    if "bot" in error_detail.lower() or "Sign in" in error_detail:
        error_detail = (
            "YouTube bot detection: All client types were blocked.\n\n"
            "⚠️ COOKIES ARE REQUIRED: YouTube now requires browser cookies for most video extractions.\n\n"
            "To fix this:\n"
            "1. Install 'Get cookies.txt LOCALLY' extension in Chrome/Edge\n"
            "2. Visit youtube.com and sign in\n"
            "3. Click the extension → Export → Save as cookies.txt\n"
            "4. Upload cookies.txt to your deployment platform\n"
            "5. Set YTDLP_COOKIES_FILE environment variable to the file path\n\n"
            "See ytdlp-service/COOKIES_SETUP.md for detailed instructions."
        )
    
    raise HTTPException(
        status_code=500,
        detail=f"yt-dlp extraction failed: {error_detail}"
    )

@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "yt-dlp API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "extract": "/extract (POST)"
        }
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
