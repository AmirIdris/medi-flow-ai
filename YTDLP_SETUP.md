# yt-dlp Setup Guide

## Overview

yt-dlp is a free, open-source command-line program to download videos from YouTube and many other sites. It's the recommended primary provider for video extraction as it:
- **Free**: No API costs or rate limits
- **Reliable**: Actively maintained with regular updates
- **Comprehensive**: Supports 1000+ sites (YouTube, TikTok, Instagram, Facebook, Twitter, etc.)
- **Fast**: Direct extraction, no API round-trips

## Installation

### Step 1: Install Python

yt-dlp requires Python 3.7 or higher.

#### Windows

1. Download Python from [python.org](https://www.python.org/downloads/)
2. Run the installer
3. **Important**: Check "Add Python to PATH" during installation
4. Verify installation:
   ```bash
   python --version
   ```
   Should show Python 3.7 or higher

#### macOS

Python 3 is usually pre-installed. Verify:
```bash
python3 --version
```

If not installed, use Homebrew:
```bash
brew install python3
```

#### Linux

Most distributions include Python 3. Verify:
```bash
python3 --version
```

If not installed:
- **Ubuntu/Debian**: `sudo apt-get install python3 python3-pip`
- **Fedora**: `sudo dnf install python3 python3-pip`
- **Arch**: `sudo pacman -S python python-pip`

### Step 2: Install yt-dlp

Once Python is installed, install yt-dlp:

```bash
pip install yt-dlp
```

Or if you need to use `pip3`:
```bash
pip3 install yt-dlp
```

### Step 3: Verify Installation

Test that yt-dlp is installed correctly:

```bash
python -m yt_dlp --version
```

Or:
```bash
python3 -m yt_dlp --version
```

You should see the version number (e.g., `2024.1.1`).

## Configuration

**No configuration needed!** yt-dlp works automatically once installed. The application will:
1. Automatically detect if yt-dlp is available
2. Use it as the primary provider (before RapidAPI)
3. Fall back to RapidAPI if yt-dlp fails

## Testing

Test yt-dlp manually:

```bash
python -m yt_dlp --dump-json "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

This should output JSON with video information.

## Troubleshooting

### Error: "python: command not found"

**Solution**: Python is not in your PATH or not installed.

- **Windows**: Reinstall Python and check "Add Python to PATH"
- **macOS/Linux**: Use `python3` instead of `python`

### Error: "pip: command not found"

**Solution**: pip is not installed.

- **Windows**: pip comes with Python installer
- **macOS/Linux**: Install pip: `python3 -m ensurepip --upgrade`

### Error: "yt-dlp is not available"

**Solution**: yt-dlp is not installed or not in PATH.

1. Verify Python: `python --version` or `python3 --version`
2. Install yt-dlp: `pip install yt-dlp` or `pip3 install yt-dlp`
3. Verify: `python -m yt_dlp --version`
4. Restart your Next.js server

### Error: "Permission denied" (Linux/macOS)

**Solution**: Use `sudo` or install for your user only:

```bash
# User installation (recommended)
pip install --user yt-dlp

# Or system-wide (requires sudo)
sudo pip install yt-dlp
```

### Error: "ModuleNotFoundError: No module named 'yt_dlp'"

**Solution**: yt-dlp is installed for a different Python version.

1. Check which Python you're using: `which python` or `which python3`
2. Install yt-dlp for that Python: `python3 -m pip install yt-dlp`
3. Verify: `python3 -m yt_dlp --version`

### yt-dlp works manually but not in the app

**Possible causes:**
1. **Server restart needed**: Restart your Next.js dev server after installing yt-dlp
2. **Different Python**: The app might be using a different Python than your terminal
3. **PATH issues**: Python might not be in the server's PATH

**Solution:**
1. Restart the Next.js server
2. Check server logs for Python detection
3. Ensure Python is in system PATH (not just user PATH)

## Platform-Specific Notes

### Windows

- Use `python` command (not `python3`)
- If Python is not found, add it to PATH manually:
  1. Find Python installation (usually `C:\Python3x\`)
  2. Add to System Environment Variables → Path

### macOS

- Use `python3` command
- If using Homebrew Python, it should be in PATH automatically

### Linux

- Use `python3` command
- Ensure `python3` and `pip3` are installed
- Some systems require `python3-pip` package

## Updating yt-dlp

Keep yt-dlp updated for best compatibility:

```bash
pip install --upgrade yt-dlp
```

Or:
```bash
pip3 install --upgrade yt-dlp
```

## Benefits Over RapidAPI

- ✅ **Free**: No API costs or subscriptions
- ✅ **No Rate Limits**: Use as much as you want
- ✅ **More Platforms**: Supports 1000+ sites vs. limited API support
- ✅ **Faster**: Direct extraction, no API round-trips
- ✅ **Privacy**: No data sent to third-party APIs
- ✅ **Reliable**: Actively maintained, regular updates

## Hybrid Approach

The application uses a hybrid approach:
1. **Primary**: yt-dlp (free, no limits)
2. **Fallback**: RapidAPI (if yt-dlp fails or not installed)

This gives you:
- Best of both worlds
- Reliability (automatic failover)
- No breaking changes (RapidAPI still works)

## Next Steps

Once yt-dlp is installed:
1. Restart your Next.js development server
2. Try downloading a video
3. Check server logs to see which provider was used
4. yt-dlp will be used automatically if available

## Additional Resources

- **yt-dlp GitHub**: https://github.com/yt-dlp/yt-dlp
- **yt-dlp Documentation**: https://github.com/yt-dlp/yt-dlp#readme
- **Supported Sites**: https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md
