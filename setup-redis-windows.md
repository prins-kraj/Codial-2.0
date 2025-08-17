# Redis Setup for Windows

## Method 1: Download Pre-built Redis for Windows

1. **Download Redis:**
   - Go to: https://github.com/tporadowski/redis/releases
   - Download the latest `.msi` file (e.g., `Redis-x64-5.0.14.1.msi`)
   - Install it with default settings

2. **Start Redis Service:**
   ```cmd
   # Option A: Start as Windows Service (automatic)
   net start redis
   
   # Option B: Start manually
   redis-server
   ```

3. **Test Redis:**
   ```cmd
   redis-cli ping
   # Should return: PONG
   ```

## Method 2: Using Chocolatey Package Manager

1. **Install Chocolatey** (if not installed):
   - Open PowerShell as Administrator
   - Run: `Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))`

2. **Install Redis:**
   ```powershell
   choco install redis-64
   ```

3. **Start Redis:**
   ```cmd
   redis-server
   ```

## Method 3: Using Scoop Package Manager

1. **Install Scoop** (if not installed):
   ```powershell
   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
   irm get.scoop.sh | iex
   ```

2. **Install Redis:**
   ```powershell
   scoop install redis
   ```

3. **Start Redis:**
   ```cmd
   redis-server
   ```

## Troubleshooting

### If Redis won't start:
- Check if port 6379 is already in use: `netstat -an | findstr 6379`
- Kill any process using the port: `taskkill /F /PID <PID>`

### If you get permission errors:
- Run Command Prompt or PowerShell as Administrator
- Make sure Windows Defender isn't blocking Redis

### Test Redis is working:
```cmd
# Connect to Redis CLI
redis-cli

# Inside Redis CLI, test commands:
127.0.0.1:6379> ping
PONG
127.0.0.1:6379> set test "hello"
OK
127.0.0.1:6379> get test
"hello"
127.0.0.1:6379> exit
```