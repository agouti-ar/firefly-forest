"""Local preview server; run in the Codex action terminal or a normal terminal."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys
import webbrowser


class PreviewHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, format, *args):
        # The local auto-reload watcher polls every two seconds; keep logs useful.
        if len(args) > 1 and str(args[1]) == "200":
            return
        super().log_message(format, *args)


if __name__ == "__main__":
    root = Path(__file__).resolve().parent
    handler = partial(PreviewHandler, directory=str(root))
    try:
        with ThreadingHTTPServer(("127.0.0.1", 8080), handler) as server:
            print("Firefly Forest preview: http://127.0.0.1:8080/", flush=True)
            print("Auto-reload is enabled. Keep this terminal running; Ctrl+C stops it.", flush=True)
            if '--open' in sys.argv:
                webbrowser.open('http://127.0.0.1:8080/')
            try:
                server.serve_forever()
            except KeyboardInterrupt:
                print("\nPreview stopped.", flush=True)
    except OSError as error:
        raise SystemExit(f"Could not start preview on port 8080: {error}")
