import sys
import uvicorn
from tailwatch.core.config import settings

def main():
    if len(sys.argv) < 2:
        print("Usage: tailwatch [api|writer|alerter|notifier|maintenance|migrate]")
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "api":
        uvicorn.run("tailwatch.api.main:app", host="0.0.0.0", port=8000, reload=False)
    elif cmd == "writer":
        from tailwatch.writer.consumer import start
        start()
    elif cmd == "alerter":
        print("Starting Tailwatch Alerter Worker...")
    elif cmd == "notifier":
        print("Starting Tailwatch Notifier Worker...")
    elif cmd == "maintenance":
        print("Starting Tailwatch Maintenance Worker...")
    elif cmd == "migrate":
        print("Running Database Migrations...")
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)

if __name__ == "__main__":
    main()
